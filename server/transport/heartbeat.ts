import { WebSocket, type WebSocketServer } from 'ws';

const HEARTBEAT_INTERVAL_MS = 15000;

export function startHeartbeat(
  server: WebSocketServer,
  intervalMs = HEARTBEAT_INTERVAL_MS,
): () => void {
  const aliveBySocket = new Map<WebSocket, boolean>();

  function handlePong(this: WebSocket) {
    aliveBySocket.set(this, true);
  }

  function handleSocketClose(this: WebSocket) {
    aliveBySocket.delete(this);

    this.off('pong', handlePong);
  }

  const trackSocket = (socket: WebSocket) => {
    aliveBySocket.set(socket, true);

    socket.on('pong', handlePong);
    socket.once('close', handleSocketClose);
  };

  server.clients.forEach(trackSocket);
  server.on('connection', trackSocket);

  const heartbeatTimer = setInterval(() => {
    aliveBySocket.forEach((alive, socket) => {
      if (socket.readyState !== WebSocket.OPEN) return;

      if (!alive) {
        console.warn('[heartbeat] Closing an unresponsive connection');
        aliveBySocket.delete(socket);
        socket.terminate();

        return;
      }

      aliveBySocket.set(socket, false);
      socket.ping();
    });
  }, intervalMs);

  const stopHeartbeat = () => {
    clearInterval(heartbeatTimer);

    server.off('connection', trackSocket);
    server.off('close', stopHeartbeat);

    aliveBySocket.forEach((_alive, socket) => {
      socket.off('pong', handlePong);
      socket.off('close', handleSocketClose);
    });

    aliveBySocket.clear();
  };

  server.once('close', stopHeartbeat);

  return stopHeartbeat;
}
