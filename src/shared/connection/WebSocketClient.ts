import { CONNECTION_STATUS, type ConnectionStatus } from './index';
import { getReconnectDelay } from './reconnectPolicy';
const CONNECTION_TIMEOUT_MS = 10000;

type ClientOptions = {
  onStatus: (status: ConnectionStatus) => void;
  onMessage: (data: string) => void;
};

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private shouldReconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private connectionUrl = '';
  private online = true;
  private onMessage: ClientOptions['onMessage'];
  private readonly onStatus: ClientOptions['onStatus'];

  constructor({ onStatus, onMessage }: ClientOptions) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
  }

  setMessageHandler(onMessage: ClientOptions['onMessage']): void {
    this.onMessage = onMessage;
  }

  canChangeConnection(): boolean {
    return this.socket === null && !this.shouldReconnect;
  }

  canSend(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  setOnline(online: boolean): void {
    this.online = online;

    if (!online) {
      this.clearConnectionTimer();

      if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
      const socket = this.socket;
      this.socket = null;

      if (socket) {
        socket.onopen = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.close();
      }

      if (this.shouldReconnect) this.onStatus(CONNECTION_STATUS.OFFLINE);
    } else {
      this.resume();
    }
  }

  resume(): void {
    if (!this.shouldReconnect || !this.online || this.socket !== null) return;

    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = null;
    this.openSocket();
  }

  connect(url: string): boolean {
    if (!this.canChangeConnection()) return false;

    this.connectionUrl = url;
    this.shouldReconnect = true;
    this.openSocket();

    return true;
  }

  disconnect(): void {
    this.cancelReconnect();

    if (this.socket === null) {
      this.onStatus(CONNECTION_STATUS.DISCONNECTED);

      return;
    }

    this.onStatus(CONNECTION_STATUS.DISCONNECTING);
    this.socket.close(1000, 'Disconnected by user');
  }

  send(data: string): boolean {
    if (this.socket === null || !this.canSend()) return false;

    try {
      this.socket.send(data);

      return true;
    } catch (error) {
      console.error('Failed to send request:', error);

      return false;
    }
  }

  // Release resources without notifying a component that is being removed.
  dispose(): void {
    this.cancelReconnect();
    const socket = this.socket;
    this.socket = null;

    if (socket === null) return;

    socket.onopen = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.onmessage = null;
    socket.close();
  }

  private cancelReconnect(): void {
    this.clearConnectionTimer();
    this.shouldReconnect = false;
    this.reconnectAttempt = 0;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer !== null) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      this.onStatus(CONNECTION_STATUS.DISCONNECTED);

      return;
    }

    if (!this.online) {
      this.onStatus(CONNECTION_STATUS.OFFLINE);

      return;
    }

    const delay = getReconnectDelay(this.reconnectAttempt);

    this.reconnectAttempt += 1;
    this.onStatus(CONNECTION_STATUS.RECONNECTING);

    console.log(`[reconnect] Attempt ${this.reconnectAttempt} scheduled in ${delay / 1000}s`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private openSocket(): void {
    if (!this.shouldReconnect || this.socket !== null) return;

    if (!this.online) {
      this.onStatus(CONNECTION_STATUS.OFFLINE);

      return;
    }

    this.onStatus(CONNECTION_STATUS.CONNECTING);

    let socket: WebSocket;

    try {
      socket = new WebSocket(this.connectionUrl);
    } catch (error) {
      console.error('Failed to create connection:', error);
      this.scheduleReconnect();

      return;
    }

    this.socket = socket;
    this.connectionTimer = setTimeout(() => {
      this.connectionTimer = null;

      if (this.socket !== socket || socket.readyState === WebSocket.OPEN) return;

      console.warn('[connect] Connection timed out');
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.onmessage = null;
      this.socket = null;
      socket.close();
      this.scheduleReconnect();
    }, CONNECTION_TIMEOUT_MS);

    socket.onopen = () => {
      if (!this.shouldReconnect || this.socket !== socket) return;

      this.clearConnectionTimer();

      this.reconnectAttempt = 0;
      this.onStatus(CONNECTION_STATUS.CONNECTED);
      console.log('[open] Connection established');
    };

    socket.onerror = (event) => {
      console.error('[error] Connection error', event);

      if (this.shouldReconnect && this.socket === socket) {
        this.onStatus(CONNECTION_STATUS.ERROR);
      }
    };

    socket.onclose = (event) => {
      if (this.socket !== socket) return;

      this.clearConnectionTimer();

      console.log('[close] Connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      this.socket = null;
      this.scheduleReconnect();
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;

      if (typeof event.data !== 'string') {
        console.error('Expected a text WebSocket message');

        return;
      }

      this.onMessage(event.data);
    };
  }
}
