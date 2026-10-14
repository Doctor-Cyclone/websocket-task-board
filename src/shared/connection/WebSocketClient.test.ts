import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketClient } from './WebSocketClient';
import { CONNECTION_STATUS } from './index';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 2;
  });

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  finishClose() {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: '', wasClean: false } as CloseEvent);
  }
  receive(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

let client: WebSocketClient;
let onStatus: ReturnType<typeof vi.fn>;
let onMessage: ReturnType<typeof vi.fn>;
const url = 'ws://localhost:3001?room=alpha';
const latestSocket = () => FakeSocket.instances[FakeSocket.instances.length - 1];

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(1);
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  FakeSocket.instances = [];
  onStatus = vi.fn();
  onMessage = vi.fn();
  client = new WebSocketClient({ onStatus, onMessage });
});

afterEach(() => {
  client.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('WebSocketClient', () => {
  it('does not connect during construction and prevents duplicate connections', () => {
    expect(FakeSocket.instances).toHaveLength(0);
    expect(client.connect(url)).toBe(true);
    expect(client.connect('ws://localhost:3001?room=beta')).toBe(false);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(latestSocket().url).toBe(url);
  });

  it('sends only while open and reports transport failures', () => {
    expect(client.send('before')).toBe(false);
    client.connect(url);
    expect(client.send('connecting')).toBe(false);
    latestSocket().open();
    expect(client.send('hello')).toBe(true);
    expect(latestSocket().send).toHaveBeenCalledWith('hello');
    latestSocket().send.mockImplementation(() => {
      throw new Error('send failed');
    });
    expect(client.send('failed')).toBe(false);
  });

  it('uses the current message handler without recreating the socket', () => {
    client.connect(url);
    latestSocket().open();
    const nextHandler = vi.fn();
    client.setMessageHandler(nextHandler);
    latestSocket().receive('latest');
    latestSocket().receive(new ArrayBuffer(4));
    expect(onMessage).not.toHaveBeenCalled();
    expect(nextHandler).toHaveBeenCalledExactlyOnceWith('latest');
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('retries at 2, 4, 8, 16, 30, 30 seconds while preserving the room URL', () => {
    client.connect(url);
    for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
      latestSocket().finishClose();
      const count = FakeSocket.instances.length;
      expect(onStatus).toHaveBeenLastCalledWith(CONNECTION_STATUS.RECONNECTING);
      vi.advanceTimersByTime(delay - 1);
      expect(FakeSocket.instances).toHaveLength(count);
      vi.advanceTimersByTime(1);
      expect(FakeSocket.instances).toHaveLength(count + 1);
      expect(latestSocket().url).toBe(url);
    }
  });

  it('resets retry delay after a successful connection', () => {
    client.connect(url);
    latestSocket().finishClose();
    vi.advanceTimersByTime(2000);
    latestSocket().finishClose();
    vi.advanceTimersByTime(4000);
    latestSocket().open();
    latestSocket().finishClose();
    const count = FakeSocket.instances.length;
    vi.advanceTimersByTime(2000);
    expect(FakeSocket.instances).toHaveLength(count + 1);
  });

  it('does not schedule two retries when error is followed by close', () => {
    client.connect(url);
    latestSocket().onerror?.(new Event('error'));
    expect(vi.getTimerCount()).toBe(1); // Only the connection watchdog.
    latestSocket().finishClose();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('cancels retry on disconnect and permits a fresh room connection', () => {
    client.connect(url);
    latestSocket().finishClose();
    client.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(client.connect('ws://localhost:3001?room=beta')).toBe(true);
  });

  it('closes manually without reconnecting', () => {
    client.connect(url);
    latestSocket().open();
    client.disconnect();
    expect(latestSocket().close).toHaveBeenCalledWith(1000, 'Disconnected by user');
    latestSocket().finishClose();
    expect(onStatus).toHaveBeenLastCalledWith(CONNECTION_STATUS.DISCONNECTED);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores callbacks from an old connection', () => {
    client.connect(url);
    const old = latestSocket();
    old.finishClose();
    vi.advanceTimersByTime(2000);
    latestSocket().open();
    onStatus.mockClear();
    old.receive('stale');
    old.finishClose();
    old.onopen?.(new Event('open'));
    expect(onMessage).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('disposes an open connection and removes every handler', () => {
    client.connect(url);
    latestSocket().open();
    const socket = latestSocket();
    client.dispose();
    expect(socket.close).toHaveBeenCalled();
    expect([socket.onopen, socket.onerror, socket.onclose, socket.onmessage]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(vi.getTimerCount()).toBe(0);
    // React StrictMode may reuse the instance after effect cleanup.
    expect(client.connect(url)).toBe(true);
  });

  it('disposes a pending reconnect timer', () => {
    client.connect(url);
    latestSocket().finishClose();
    client.dispose();
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('times out a stalled connection and retries without leaving stale handlers', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    client.connect(url);
    const stalled = latestSocket();
    vi.advanceTimersByTime(10000);
    expect(stalled.close).toHaveBeenCalled();
    expect(stalled.onmessage).toBeNull();
    expect(onStatus).toHaveBeenLastCalledWith(CONNECTION_STATUS.RECONNECTING);
    vi.advanceTimersByTime(2000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
  it('pauses offline and resumes the same room when connectivity returns', () => {
    client.connect(url);
    latestSocket().open();
    client.setOnline(false);
    expect(onStatus).toHaveBeenLastCalledWith(CONNECTION_STATUS.OFFLINE);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(1);
    client.setOnline(true);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(latestSocket().url).toBe(url);
  });

  it('does not reconnect after the user disconnects while offline', () => {
    client.connect(url);
    client.setOnline(false);
    client.disconnect();
    client.setOnline(true);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(client.canChangeConnection()).toBe(true);
  });
});
