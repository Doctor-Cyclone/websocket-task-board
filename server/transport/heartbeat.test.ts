import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket, WebSocketServer } from 'ws';
import { startHeartbeat } from './heartbeat.js';

afterEach(() => {
  vi.useRealTimers();
});

function makeSocket() {
  return Object.assign(new EventEmitter(), { readyState: 1, ping: vi.fn(), terminate: vi.fn() });
}

describe('heartbeat cleanup', () => {
  it('keeps pong responders and terminates silent clients', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const healthy = makeSocket();
    const silent = makeSocket();
    healthy.ping.mockImplementation(() => healthy.emit('pong'));
    const server = Object.assign(new EventEmitter(), { clients: new Set([healthy, silent]) });
    const stop = startHeartbeat(server as unknown as WebSocketServer, 1000);
    vi.advanceTimersByTime(2000);
    expect(healthy.terminate).not.toHaveBeenCalled();
    expect(silent.terminate).toHaveBeenCalledOnce();
    silent.emit('close');
    stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(healthy.listenerCount('pong')).toBe(0);
  });

  it('tracks new connections and cancels the interval on server close', () => {
    vi.useFakeTimers();
    const server = Object.assign(new EventEmitter(), { clients: new Set<WebSocket>() });
    startHeartbeat(server as unknown as WebSocketServer, 1000);
    const socket = makeSocket();
    server.emit('connection', socket);
    vi.advanceTimersByTime(1000);
    expect(socket.ping).toHaveBeenCalledOnce();
    server.emit('close');
    expect(vi.getTimerCount()).toBe(0);
    expect(socket.listenerCount('pong')).toBe(0);
  });
});
