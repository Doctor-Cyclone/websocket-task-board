import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, type WebSocketServer } from 'ws';
import type { ServerEvent } from '@/shared/protocol/index.js';
import { createServer } from './createServer.js';

type Client = { socket: WebSocket; events: ServerEvent[] };
let server: WebSocketServer;
let directory: string;
let storagePath: string;
let clients: Client[];

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  directory = mkdtempSync(join(tmpdir(), 'job-board-integration-'));
  storagePath = join(directory, 'boards.json');
  clients = [];
  server = createServer({ port: 0, storagePath });
  await once(server, 'listening');
});

async function stopServer() {
  clients.forEach((client) => client.socket.terminate());
  server.clients.forEach((socket) => socket.terminate());
  await new Promise<void>((resolve) => server.close(() => resolve()));
  clients = [];
}

afterEach(async () => {
  await stopServer();
  const target = resolve(directory);

  if (dirname(target) !== resolve(tmpdir()) || !target.includes('job-board-integration-'))
    throw new Error('Unsafe cleanup path');

  rmSync(target, { recursive: true, force: true });
});

async function connect(room: string, name: string): Promise<Client> {
  const address = server.address();

  if (!address || typeof address === 'string') throw new Error('Expected a listening TCP server');

  const url = new URL(`ws://127.0.0.1:${address.port}`);
  url.searchParams.set('room', room);
  url.searchParams.set('name', name);
  url.searchParams.set('clientId', name);
  const socket = new WebSocket(url);
  const events: ServerEvent[] = [];
  socket.on('message', (data) => events.push(JSON.parse(data.toString())));
  const client = { socket, events };
  clients.push(client);
  await once(socket, 'open');
  await waitFor(client, 'jobs:sync');

  return client;
}

async function waitFor<T extends ServerEvent['type']>(client: Client, type: T, count = 1) {
  await expect
    .poll(() => client.events.filter((event) => event.type === type).length, { timeout: 1500 })
    .toBeGreaterThanOrEqual(count);
  const matches = client.events.filter((event) => event.type === type);

  return matches[count - 1] as Extract<ServerEvent, { type: T }>;
}

const send = (client: Client, event: unknown) => client.socket.send(JSON.stringify(event));

async function create(client: Client, requestId = 'create-1') {
  send(client, { type: 'job:create', requestId, payload: { title: 'Shared job' } });

  return (await waitFor(client, 'job:created')).payload;
}

describe('multiple clients over real WebSocket connections', () => {
  it('isolates rooms, broadcasts to both Alpha clients and ACKs only the sender', async () => {
    const a = await connect('alpha', 'Alice');
    const b = await connect('alpha', 'Bob');
    const beta = await connect('beta', 'Carol');
    const job = await create(a);
    expect((await waitFor(b, 'job:created')).payload).toEqual(job);
    expect((await waitFor(a, 'request:ack')).payload.requestId).toBe('create-1');
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(b.events.some((event) => event.type === 'request:ack')).toBe(false);
    expect(beta.events.some((event) => event.type === 'job:created')).toBe(false);
    const presence = a.events.filter((event) => event.type === 'room:participants').at(-1);
    expect(presence?.payload.map((person) => person.name).sort()).toEqual(['Alice', 'Bob']);
  });

  it('reports version conflicts and broadcasts accepted title changes', async () => {
    const a = await connect('alpha', 'Alice');
    const b = await connect('alpha', 'Bob');
    const job = await create(a);
    send(a, {
      type: 'job:update',
      requestId: 'update-1',
      payload: { id: job.id, completed: true, expectedVersion: 1 },
    });
    await waitFor(b, 'job:updated');
    send(b, {
      type: 'job:update',
      requestId: 'stale',
      payload: { id: job.id, completed: false, expectedVersion: 1 },
    });
    expect((await waitFor(b, 'request:error')).payload.currentJob?.version).toBe(2);
    send(b, {
      type: 'job:update',
      requestId: 'rename',
      payload: { id: job.id, title: 'Renamed', expectedVersion: 2 },
    });
    expect((await waitFor(a, 'job:updated', 2)).payload).toMatchObject({
      title: 'Renamed',
      completed: true,
      version: 3,
    });
  });

  it('retries deletion without a second broadcast and retains deduplication after restart', async () => {
    const a = await connect('alpha', 'Alice');
    const job = await create(a);
    const deletion = { type: 'job:delete', requestId: 'delete-1', payload: { id: job.id } };
    send(a, deletion);
    await waitFor(a, 'job:deleted');
    await waitFor(a, 'request:ack', 2);
    await stopServer();
    server = createServer({ port: 0, storagePath });
    await once(server, 'listening');
    const restored = await connect('alpha', 'Alice');
    expect((await waitFor(restored, 'jobs:sync')).payload).toEqual([]);
    send(restored, deletion);
    await waitFor(restored, 'request:ack');
    expect(restored.events.some((event) => event.type === 'job:deleted')).toBe(false);
  });

  it('shows editing only in the same room and removes participants on disconnect', async () => {
    const a = await connect('alpha', 'Alice');
    const b = await connect('alpha', 'Bob');
    const beta = await connect('beta', 'Carol');
    const job = await create(a);
    send(a, { type: 'job:editing', payload: { id: job.id, active: true } });
    await expect
      .poll(() => b.events.filter((event) => event.type === 'room:editing').at(-1)?.payload.length)
      .toBe(1);
    expect(beta.events.filter((event) => event.type === 'room:editing').at(-1)?.payload).toEqual(
      [],
    );
    a.socket.close();
    await expect
      .poll(
        () => b.events.filter((event) => event.type === 'room:participants').at(-1)?.payload.length,
      )
      .toBe(1);
    await expect
      .poll(() => b.events.filter((event) => event.type === 'room:editing').at(-1)?.payload.length)
      .toBe(0);
  });

  it('rejects invalid titles only to the requester', async () => {
    const a = await connect('alpha', 'Alice');
    const b = await connect('alpha', 'Bob');
    send(a, { type: 'job:create', requestId: 'invalid', payload: { title: '   ' } });
    expect((await waitFor(a, 'request:error')).payload.message).toBe('Title must not be empty');
    expect(
      b.events.some((event) => event.type === 'request:error' || event.type === 'job:created'),
    ).toBe(false);
  });

  it('closes oversized messages with code 1009', async () => {
    const client = await connect('alpha', 'Alice');
    const closed = once(client.socket, 'close');
    client.socket.send('a'.repeat(8193));
    expect((await closed)[0]).toBe(1009);
  });

  it('closes connections that exceed the message quota with code 1008', async () => {
    const client = await connect('alpha', 'Alice');
    const closed = once(client.socket, 'close');
    for (let i = 0; i < 31; i += 1) send(client, { type: 'room:sync' });
    expect((await closed)[0]).toBe(1008);
  });
});
