import { WebSocketServer, WebSocket } from 'ws';
import { type Job, jobCreateEventSchema, type JobsSyncEvent } from '@/shared/protocol/index.js';
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

    const result = jobCreateEventSchema.safeParse(parsedMessage);

    if (!result.success) {
      console.error('Неверное событие:', result.error.issues);
      return;
    }

    const createdJob = {
      id: randomUUID(),
      title: result.data.payload.title,
      completed: false,
    };

    jobs.push(createdJob);

    const jobCreatedEvent: JobCreatedEvent = {
      type: 'job:created',
      payload: createdJob,
    };

    const eventJson = JSON.stringify(jobCreatedEvent);

    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(eventJson);
      }
    });
  });
});

server.on('error', (error) => {
  console.error('Ошибка сервера:', error.message);
});
