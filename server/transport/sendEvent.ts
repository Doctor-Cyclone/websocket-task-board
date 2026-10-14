import { WebSocket } from 'ws';
import type { ServerEvent } from '@/shared/protocol/index.js';

export function sendEvent(socket: WebSocket, event: ServerEvent): boolean {
  if (socket.readyState !== WebSocket.OPEN) return false;

  try {
    socket.send(JSON.stringify(event));

    return true;
  } catch (error) {
    console.error('Failed to send server event:', error);

    return false;
  }
}
