import { WebSocketServer, WebSocket } from 'ws';
import {
  type Job,
  jobEventSchema,
  jobCreateEventSchema,
  jobUpdateEventSchema,
  type RequestErrorEvent,
  type JobsSyncEvent,
  type JobUpdatedEvent,
  type JobDeletedEvent,
  type ServerEvent,
} from '@/shared/protocol/index.js';
import { randomUUID } from 'node:crypto';
import type { JobCreatedEvent } from '@/shared/protocol/index.js';
import { broadcast } from './transport/broadcast.js';
import type { JobAckEvent } from '@/shared/protocol/events.js';
import { DEFAULT_ROOM } from '@/shared/rooms/index.js';
import { startHeartbeat } from './transport/heartbeat.js';

const server = new WebSocketServer({ port: 3001 });
startHeartbeat(server);
const jobsByRoom: Map<string, Job[]> = new Map();
const roomBySocket: Map<WebSocket, string> = new Map();
const processedCreateRequestsByRoom = new Map<string, Map<string, Job>>();
const processedUpdateRequestsByRoom = new Map<string, Set<string>>();
const createRequestIdentitySchema = jobCreateEventSchema.pick({ type: true, requestId: true });
const updateRequestIdentitySchema = jobUpdateEventSchema.pick({ type: true, requestId: true });

server.on('listening', () => {
  console.log('WebSocket server listening at ws://localhost:3001');
});

server.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost:3001');
  const room = url.searchParams.get('room')?.trim() || DEFAULT_ROOM;
  let roomJobs = jobsByRoom.get(room);

  if (roomJobs === undefined) {
    roomJobs = [];
    jobsByRoom.set(room, roomJobs);
  }

  let roomProcessedRequests = processedCreateRequestsByRoom.get(room);

  if (roomProcessedRequests === undefined) {
    roomProcessedRequests = new Map<string, Job>();
    processedCreateRequestsByRoom.set(room, roomProcessedRequests);
  }

  console.log('Client connected to room:', room);
  let roomProcessedUpdates = processedUpdateRequestsByRoom.get(room);

  if (roomProcessedUpdates === undefined) {
    roomProcessedUpdates = new Set<string>();
    processedUpdateRequestsByRoom.set(room, roomProcessedUpdates);
  }

  if (socket.readyState === WebSocket.OPEN) {
    const jobSyncEvent: JobsSyncEvent = {
      type: 'jobs:sync',
      payload: roomJobs,
    };

    socket.send(JSON.stringify(jobSyncEvent));
  }

  roomBySocket.set(socket, room);

  socket.on('close', () => {
    roomBySocket.delete(socket);
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

      const identity = createRequestIdentitySchema
        .or(updateRequestIdentitySchema)
        .safeParse(parsedMessage);

      if (identity.success && socket.readyState === WebSocket.OPEN) {
        const errorEvent: RequestErrorEvent = {
          type: 'request:error',
          payload: {
            requestId: identity.data.requestId,
            message: result.error.issues[0]?.message ?? 'Invalid create request',
          },
        };
        socket.send(JSON.stringify(errorEvent));
      }

      return;
    }

    const event = result.data;
    let serverEvent: ServerEvent;

    switch (event.type) {
      case 'job:create':
        if (roomProcessedRequests.has(event.requestId)) {
          const jobAckEvent: JobAckEvent = {
            type: 'request:ack',
            payload: { requestId: event.requestId },
          };

          socket.send(JSON.stringify(jobAckEvent));

          return;
        }

        const createdJob = {
          id: randomUUID(),
          title: event.payload.title,
          completed: false,
          version: 1,
        };

        roomJobs.push(createdJob);
        roomProcessedRequests.set(event.requestId, createdJob);

        const jobCreatedEvent: JobCreatedEvent = {
          type: 'job:created',
          payload: createdJob,
        };

        const jobAckEvent: JobAckEvent = {
          type: 'request:ack',
          payload: { requestId: event.requestId },
        };

        socket.send(JSON.stringify(jobAckEvent));
        serverEvent = jobCreatedEvent;
        break;
      case 'job:update':
        if (roomProcessedUpdates.has(event.requestId)) {
          const ack: JobAckEvent = {
            type: 'request:ack',
            payload: { requestId: event.requestId },
          };
          socket.send(JSON.stringify(ack));

          return;
        }

        const updatedJob = roomJobs.find((job) => job.id === event.payload.id);

        if (!updatedJob) {
          console.error('Job not found');
          const errorEvent: RequestErrorEvent = {
            type: 'request:error',
            payload: { requestId: event.requestId, message: 'Job not found' },
          };
          socket.send(JSON.stringify(errorEvent));

          return;
        }

        if (updatedJob.version !== event.payload.expectedVersion) {
          const conflictEvent: RequestErrorEvent = {
            type: 'request:error',
            payload: {
              requestId: event.requestId,
              message:
                'This job changed in another tab. The latest version has been loaded. Please try again.',
              currentJob: updatedJob,
            },
          };
          socket.send(JSON.stringify(conflictEvent));

          return;
        }

        updatedJob.completed = event.payload.completed;
        updatedJob.version += 1;
        roomProcessedUpdates.add(event.requestId);
        const updateAck: JobAckEvent = {
          type: 'request:ack',
          payload: { requestId: event.requestId },
        };
        socket.send(JSON.stringify(updateAck));

        const jobUpdatedEvent: JobUpdatedEvent = {
          type: 'job:updated',
          payload: updatedJob,
        };

        serverEvent = jobUpdatedEvent;
        break;
      case 'job:delete':
        const jobIndex = roomJobs.findIndex((job) => job.id === event.payload.id);

        if (jobIndex === -1) {
          console.error('Job not found');

          return;
        }

        roomJobs.splice(jobIndex, 1);

        const jobDeletedEvent: JobDeletedEvent = {
          type: 'job:deleted',
          payload: { id: event.payload.id },
        };

        serverEvent = jobDeletedEvent;
        break;
    }

    broadcast(server, serverEvent, room, roomBySocket);
  });
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
});
