import { WebSocketServer, WebSocket } from 'ws';
import {
  type Job,
  jobEventSchema,
  type JobsSyncEvent,
  type JobUpdatedEvent,
  type JobDeletedEvent,
  type ServerEvent,
} from '@/shared/protocol/index.js';
import { randomUUID } from 'node:crypto';
import type { JobCreatedEvent } from '@/shared/protocol/index.js';
import { broadcast } from './transport/broadcast.js';
import type { JobAckEvent } from '@/shared/protocol/events.js';

const server = new WebSocketServer({ port: 3001 });
const jobs: Job[] = [];

server.on('listening', () => {
  console.log('WebSocket server listening at ws://localhost:3001');
});

server.on('connection', (socket) => {
  console.log('Client connected');

  if (socket.readyState === WebSocket.OPEN) {
    const jobSyncEvent: JobsSyncEvent = {
      type: 'jobs:sync',
      payload: jobs,
    };

    socket.send(JSON.stringify(jobSyncEvent));
  }

  socket.on('close', () => {
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
      return;
    }

    const event = result.data;
    let serverEvent: ServerEvent;

    switch (event.type) {
      case 'job:create':
        const createdJob = {
          id: randomUUID(),
          title: event.payload.title,
          completed: false,
        };

        jobs.push(createdJob);

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
        const updatedJob = jobs.find((job) => job.id === event.payload.id);

        if (!updatedJob) {
          console.error('Job not found');
          return;
        }

        updatedJob.completed = event.payload.completed;

        const jobUpdatedEvent: JobUpdatedEvent = {
          type: 'job:updated',
          payload: updatedJob,
        };

        serverEvent = jobUpdatedEvent;
        break;
      case 'job:delete':
        const jobIndex = jobs.findIndex((job) => job.id === event.payload.id);

        if (jobIndex === -1) {
          console.error('Job not found');
          return;
        }

        jobs.splice(jobIndex, 1);

        const jobDeletedEvent: JobDeletedEvent = {
          type: 'job:deleted',
          payload: { id: event.payload.id },
        };

        serverEvent = jobDeletedEvent;
        break;
    }

    broadcast(server, serverEvent);
  });
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
});
