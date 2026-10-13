import type { ServerEvent } from '@/shared/protocol/index.js';
import { WebSocket, type WebSocketServer } from 'ws';

export const broadcast = (server: WebSocketServer, event: ServerEvent): void => {
  const eventJson = JSON.stringify(event);

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(eventJson);
    }
  });
};
