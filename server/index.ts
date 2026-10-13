import { WebSocketServer, WebSocket } from 'ws';
import {
  type Job,
  jobEventSchema,
  type JobsSyncEvent,
  type JobUpdatedEvent,
  type JobDeletedEvent,
} from '@/shared/protocol/index.js';
import { randomUUID } from 'node:crypto';
import type { JobCreatedEvent } from '@/shared/protocol/index.js';

const server = new WebSocketServer({ port: 3001 });
const jobs: Job[] = [];

server.on('listening', () => {
  console.log('WebSocket-сервер запущен: ws://localhost:3001');
});

server.on('connection', (socket) => {
  console.log('Клиент подключился');

  if (socket.readyState === WebSocket.OPEN) {
    const jobSyncEvent: JobsSyncEvent = {
      type: 'jobs:sync',
      payload: jobs,
    };

    socket.send(JSON.stringify(jobSyncEvent));
  }

  socket.on('close', () => {
    console.log('Клиент отключился');
  });

  socket.on('error', (error) => {
    console.error('Ошибка соединения:', error.message);
  });

  socket.on('message', (message) => {
    let parsedMessage: unknown;

    try {
      parsedMessage = JSON.parse(message.toString());
    } catch {
      console.error('Ошибка парсинга: сообщение должно быть корректным JSON');
      return;
    }

    const result = jobEventSchema.safeParse(parsedMessage);

    if (!result.success) {
      console.error('Неверное событие:', result.error.issues);
      return;
    }

    const event = result.data;
    let jobEventJson: string;

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

        jobEventJson = JSON.stringify(jobCreatedEvent);
        break;
      case 'job:update':
        const updatedJob = jobs.find((job) => job.id === event.payload.id);

        if (!updatedJob) {
          console.error('Не найдено такой задачи');
          return;
        }

        updatedJob.completed = event.payload.completed;

        const jobUpdatedEvent: JobUpdatedEvent = {
          type: 'job:updated',
          payload: updatedJob,
        };

        jobEventJson = JSON.stringify(jobUpdatedEvent);
        break;
      case 'job:delete':
        const jobIndex = jobs.findIndex((job) => job.id === event.payload.id);

        if (jobIndex === -1) {
          console.error('Не найдено такой задачи');
          return;
        }

        jobs.splice(jobIndex, 1);

        const jobDeletedEvent: JobDeletedEvent = {
          type: 'job:deleted',
          payload: { id: event.payload.id },
        };

        jobEventJson = JSON.stringify(jobDeletedEvent);
        break;
    }

    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(jobEventJson);
      }
    });
  });
});

server.on('error', (error) => {
  console.error('Ошибка сервера:', error.message);
});
