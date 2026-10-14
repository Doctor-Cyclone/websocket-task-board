import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import type { JobCreateEvent, JobUpdateEvent } from '@/shared/protocol/index.js';
import { createRoomStore } from '../store/roomStore.js';
import { createJob } from './createJob.js';
import { updateJob } from './updateJob.js';
import { deleteJob } from './deleteJob.js';

let temporaryDirectory: string;
let storagePath: string;
let store: ReturnType<typeof createRoomStore>;
let transmit: ReturnType<typeof vi.fn>;
let socket: WebSocket;

const createEvent: JobCreateEvent = {
  type: 'job:create',
  requestId: 'create-1',
  payload: { title: 'Write server tests' },
};

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'job-board-tests-'));
  storagePath = join(temporaryDirectory, 'boards.json');
  store = createRoomStore(storagePath);
  transmit = vi.fn();
  socket = { readyState: WebSocket.OPEN, send: transmit } as unknown as WebSocket;
});

afterEach(() => {
  const target = resolve(temporaryDirectory);

  if (dirname(target) !== resolve(tmpdir()) || !target.includes('job-board-tests-')) {
    throw new Error('Unexpected test cleanup path');
  }

  rmSync(target, { recursive: true, force: true });
});

function createExample() {
  const event = createJob(socket, store.getRoom('alpha'), createEvent);

  if (!event) throw new Error('Expected a newly created job');

  return event.payload;
}

function makeUpdate(id: string): JobUpdateEvent {
  return {
    type: 'job:update',
    requestId: 'update-1',
    payload: { id, completed: true, expectedVersion: 1 },
  };
}

function lastResponse() {
  const calls = transmit.mock.calls;

  return JSON.parse(calls[calls.length - 1][0] as string);
}

describe('room job handlers', () => {
  it('creates a versioned job, persists it and acknowledges the request', () => {
    transmit.mockImplementation(() => {
      expect(createRoomStore(storagePath).getRoom('alpha').jobs).toHaveLength(1);
    });
    const job = createExample();
    expect(job).toMatchObject({ title: createEvent.payload.title, completed: false, version: 1 });
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lastResponse()).toEqual({ type: 'request:ack', payload: { requestId: 'create-1' } });
  });

  it('acknowledges a repeated create without creating or broadcasting another job', () => {
    createExample();
    expect(createJob(socket, store.getRoom('alpha'), createEvent)).toBeUndefined();
    expect(store.getRoom('alpha').jobs).toHaveLength(1);
    expect(transmit).toHaveBeenCalledTimes(2);
  });

  it('isolates rooms and allows the same request ID in different rooms', () => {
    const alpha = createExample();
    const beta = createJob(socket, store.getRoom('beta'), createEvent)?.payload;
    expect(beta?.id).not.toBe(alpha.id);
    updateJob(socket, store.getRoom('alpha'), makeUpdate(alpha.id));
    expect(store.getRoom('beta').jobs[0].completed).toBe(false);
    expect(store.getRoom('beta').jobs[0].version).toBe(1);
  });

  it('updates the job and increments its version before acknowledging', () => {
    const job = createExample();
    transmit.mockImplementation(() => {
      expect(createRoomStore(storagePath).getRoom('alpha').jobs[0].version).toBe(2);
    });
    const updated = updateJob(socket, store.getRoom('alpha'), makeUpdate(job.id));
    expect(updated?.payload).toMatchObject({ id: job.id, completed: true, version: 2 });
    expect(lastResponse().payload.requestId).toBe('update-1');
  });

  it('acknowledges a repeated update without incrementing the version again', () => {
    const job = createExample();
    const update = makeUpdate(job.id);
    updateJob(socket, store.getRoom('alpha'), update);
    expect(updateJob(socket, store.getRoom('alpha'), update)).toBeUndefined();
    expect(store.getRoom('alpha').jobs[0].version).toBe(2);
    expect(lastResponse().type).toBe('request:ack');
  });

  it('rejects a stale update and returns the current job', () => {
    const job = createExample();
    updateJob(socket, store.getRoom('alpha'), makeUpdate(job.id));
    const stale: JobUpdateEvent = {
      ...makeUpdate(job.id),
      requestId: 'stale-1',
      payload: { id: job.id, completed: false, expectedVersion: 1 },
    };
    expect(updateJob(socket, store.getRoom('alpha'), stale)).toBeUndefined();
    expect(lastResponse()).toMatchObject({
      type: 'request:error',
      payload: {
        requestId: 'stale-1',
        currentJob: { id: job.id, completed: true, version: 2 },
      },
    });
    expect(store.getRoom('alpha').processedUpdateRequests.has('stale-1')).toBe(false);
  });

  it('does not update a job from another room', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const job = createExample();
    expect(updateJob(socket, store.getRoom('beta'), makeUpdate(job.id))).toBeUndefined();
    expect(lastResponse()).toMatchObject({
      type: 'request:error',
      payload: { message: 'Job not found' },
    });
    expect(store.getRoom('alpha').jobs[0].version).toBe(1);
  });

  it('deletes a job and persists the deletion', () => {
    const job = createExample();
    expect(
      deleteJob(store.getRoom('alpha'), { type: 'job:delete', payload: { id: job.id } }),
    ).toEqual({ type: 'job:deleted', payload: { id: job.id } });
    expect(createRoomStore(storagePath).getRoom('alpha').jobs).toEqual([]);
  });

  it('does not delete a job from another room', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const job = createExample();
    expect(
      deleteJob(store.getRoom('beta'), { type: 'job:delete', payload: { id: job.id } }),
    ).toBeUndefined();
    expect(store.getRoom('alpha').jobs).toHaveLength(1);
  });
});

describe('persistent room store', () => {
  it('restores jobs, versions and deduplication records after a restart', () => {
    const job = createExample();
    const update = makeUpdate(job.id);
    updateJob(socket, store.getRoom('alpha'), update);
    store = createRoomStore(storagePath);
    expect(store.getRoom('alpha').jobs[0]).toMatchObject({
      id: job.id,
      completed: true,
      version: 2,
    });
    expect(createJob(socket, store.getRoom('alpha'), createEvent)).toBeUndefined();
    expect(updateJob(socket, store.getRoom('alpha'), update)).toBeUndefined();
    expect(store.getRoom('alpha').jobs).toHaveLength(1);
    expect(store.getRoom('alpha').jobs[0].version).toBe(2);
  });

  it('does not recreate a deleted job when its create request is retried after restart', () => {
    const job = createExample();
    deleteJob(store.getRoom('alpha'), { type: 'job:delete', payload: { id: job.id } });
    store = createRoomStore(storagePath);
    expect(createJob(socket, store.getRoom('alpha'), createEvent)).toBeUndefined();
    expect(store.getRoom('alpha').jobs).toEqual([]);
  });

  it.each([
    '{broken',
    JSON.stringify({ formatVersion: 1, rooms: [{ name: 'alpha', jobs: [{}] }] }),
  ])('rejects damaged data without overwriting it: %s', (content) => {
    writeFileSync(storagePath, content);
    expect(() => createRoomStore(storagePath)).toThrow();
    expect(readFileSync(storagePath, 'utf8')).toBe(content);
  });

  it('rolls back a failed create without acknowledging or marking it processed', () => {
    const blocker = join(temporaryDirectory, 'blocker');
    store = createRoomStore(join(blocker, 'boards.json'));
    writeFileSync(blocker, 'not a directory');
    expect(() => createJob(socket, store.getRoom('alpha'), createEvent)).toThrow();
    expect(store.getRoom('alpha').jobs).toEqual([]);
    expect(store.getRoom('alpha').processedCreateRequests.size).toBe(0);
    expect(transmit).not.toHaveBeenCalled();
  });

  it('rolls back a failed update and preserves the last saved board', () => {
    const job = createExample();
    rmSync(storagePath);
    // A directory at the target path makes replacement fail on every platform.
    mkdirSync(storagePath);
    transmit.mockClear();
    expect(() => updateJob(socket, store.getRoom('alpha'), makeUpdate(job.id))).toThrow();
    expect(store.getRoom('alpha').jobs[0]).toMatchObject({ completed: false, version: 1 });
    expect(store.getRoom('alpha').processedUpdateRequests.size).toBe(0);
    expect(transmit).not.toHaveBeenCalled();
  });
});
