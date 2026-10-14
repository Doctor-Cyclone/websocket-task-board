import type { ServerEvent } from '@/shared/protocol/index.js';
import { WebSocket, type WebSocketServer } from 'ws';

export const broadcast = (
  server: WebSocketServer,
  event: ServerEvent,
  room: string,
  roomBySocket: ReadonlyMap<WebSocket, string>,
): void => {
  const eventJson = JSON.stringify(event);

  server.clients.forEach((socket) => {
    const socketRoom = roomBySocket.get(socket);

    if (socket.readyState === WebSocket.OPEN && socketRoom === room) {
      socket.send(eventJson);
    }
  });
};
