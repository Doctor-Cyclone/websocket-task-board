import { WebSocketServer, type WebSocket } from 'ws';
import {
  jobEventSchema,
  jobCreateEventSchema,
  jobUpdateEventSchema,
  type ServerEvent,
} from '@/shared/protocol/index.js';
import { DEFAULT_ROOM } from '@/shared/rooms/index.js';
import { createRoomStore } from './store/roomStore.js';
import { createJob } from './handlers/createJob.js';
import { updateJob } from './handlers/updateJob.js';
import { deleteJob } from './handlers/deleteJob.js';
import { broadcast } from './transport/broadcast.js';
import { sendEvent } from './transport/sendEvent.js';
import { startHeartbeat } from './transport/heartbeat.js';
import { createParticipantStore } from './store/participantStore.js';
import { randomUUID } from 'node:crypto';

const server = new WebSocketServer({ port: 3001 });
const roomStore = createRoomStore();
const participantStore = createParticipantStore();
const roomBySocket = new Map<WebSocket, string>();
const requestIdentitySchema = jobCreateEventSchema
  .pick({ type: true, requestId: true })
  .or(jobUpdateEventSchema.pick({ type: true, requestId: true }));

startHeartbeat(server);

server.on('listening', () => {
  console.log('WebSocket server listening at ws://localhost:3001');
});

server.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost:3001');
  const room = url.searchParams.get('room')?.trim() || DEFAULT_ROOM;
  const roomState = roomStore.getRoom(room);

  roomBySocket.set(socket, room);
  participantStore.join(socket, room, {
    clientId: url.searchParams.get('clientId')?.slice(0, 100) || randomUUID(),
    name: url.searchParams.get('name')?.trim().slice(0, 40) || 'Guest',
  });
  broadcast(
    server,
    { type: 'room:participants', payload: participantStore.list(room) },
    room,
    roomBySocket,
  );

  console.log('Client connected to room:', room);
  sendEvent(socket, { type: 'jobs:sync', payload: roomState.jobs });

  socket.on('close', () => {
    roomBySocket.delete(socket);
    participantStore.leave(socket);
    broadcast(
      server,
      { type: 'room:participants', payload: participantStore.list(room) },
      room,
      roomBySocket,
    );
    console.log('Client disconnected');
  });
  socket.on('error', (error) => {
    console.error('Connection error:', error.message);
  });
  socket.on('message', (message) => {
    let parsedMessage: unknown;

    try {
      parsedMessage = JSON.parse(message.toString());
    } catch {
      console.error('Invalid JSON: message must contain valid JSON');

      return;
    }

    const result = jobEventSchema.safeParse(parsedMessage);

    if (!result.success) {
      console.error('Invalid event:', result.error.issues);
      const identity = requestIdentitySchema.safeParse(parsedMessage);

      if (identity.success) {
        sendEvent(socket, {
          type: 'request:error',
          payload: {
            requestId: identity.data.requestId,
            message: result.error.issues[0]?.message ?? 'Invalid request',
          },
        });
      }

      return;
    }

    const event = result.data;
    let serverEvent: ServerEvent | undefined;

    try {
      switch (event.type) {
        case 'job:create':
          serverEvent = createJob(socket, roomState, event);
          break;
        case 'job:update':
          serverEvent = updateJob(socket, roomState, event);
          break;
        case 'job:delete':
          serverEvent = deleteJob(roomState, event);
          break;
      }
    } catch (error) {
      console.error('Failed to save boards:', error);

      if ('requestId' in event) {
        sendEvent(socket, {
          type: 'request:error',
          payload: {
            requestId: event.requestId,
            message: 'The change could not be saved. Please try again.',
          },
        });
      }

      return;
    }

    if (serverEvent) broadcast(server, serverEvent, room, roomBySocket);
  });
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
});
