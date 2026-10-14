// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOM, type Room } from '@/shared/rooms';
import { useJobs } from './useJobs';

const fake = vi.hoisted(() => ({
  onMessage: (data: string) => {
    void data;
  },
  urls: [] as string[],
  connection: {
    connectionStatus: 'Disconnected',
    connect: vi.fn(() => true),
    disconnect: vi.fn(),
    send: vi.fn(() => true),
    canSend: vi.fn(() => true),
    canChangeConnection: vi.fn(() => true),
  },
}));
vi.mock('@/src/shared/connection/useWebSocket', () => ({
  useWebSocket: (url: string, onMessage: (data: string) => void) => {
    fake.onMessage = onMessage;
    fake.urls.push(url);

    return fake.connection;
  },
}));

const job = (id: string) => ({ id, title: id, completed: false, version: 1 });
const deliver = (event: unknown) => act(() => fake.onMessage(JSON.stringify(event)));

beforeEach(() => {
  fake.urls = [];
  fake.connection.send.mockClear();
  fake.connection.canChangeConnection.mockReturnValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('useJobs room cache', () => {
  it('restores each disconnected board from its cache and replaces it on sync', () => {
    const { result, rerender } = renderHook(({ room }: { room: Room }) => useJobs(room, 'Alice'), {
      initialProps: { room: ROOM.ALPHA as Room },
    });
    deliver({ type: 'jobs:sync', payload: [job('alpha-job')] });
    act(() => result.current.disconnect());
    expect(result.current.jobs[0].id).toBe('alpha-job');
    act(() => result.current.changeRoom(ROOM.BETA));
    rerender({ room: ROOM.BETA });
    expect(result.current.jobs).toEqual([]);
    deliver({ type: 'jobs:sync', payload: [job('beta-job')] });
    act(() => result.current.changeRoom(ROOM.ALPHA));
    rerender({ room: ROOM.ALPHA });
    expect(result.current.jobs[0].id).toBe('alpha-job');
    deliver({ type: 'jobs:sync', payload: [] });
    expect(result.current.jobs).toEqual([]);
  });

  it('blocks room changes during an active connection', () => {
    const { result } = renderHook(() => useJobs(ROOM.ALPHA));
    deliver({ type: 'jobs:sync', payload: [job('alpha-job')] });
    fake.connection.canChangeConnection.mockReturnValue(false);
    act(() => expect(result.current.changeRoom(ROOM.BETA)).toBe(false));
    expect(result.current.jobs[0].id).toBe('alpha-job');
  });

  it('keeps client identity across rerenders and reconnects', () => {
    const { result, rerender } = renderHook(({ room }: { room: Room }) => useJobs(room, 'Alice'), {
      initialProps: { room: ROOM.ALPHA as Room },
    });
    const id = result.current.clientId;
    act(() => result.current.disconnect());
    rerender({ room: ROOM.BETA });
    expect(result.current.clientId).toBe(id);
    expect(new URL(fake.urls.at(-1) ?? '').searchParams.get('clientId')).toBe(id);
  });

  it('clears request history before entering another room', () => {
    const { result } = renderHook(() => useJobs(ROOM.ALPHA));
    act(() =>
      result.current.send({
        type: 'job:create',
        requestId: 'request-1',
        payload: { title: 'Example' },
      }),
    );
    expect(result.current.requests).toHaveLength(1);
    act(() => {
      result.current.disconnect();
      result.current.changeRoom(ROOM.BETA);
    });
    expect(result.current.requests).toEqual([]);
  });
});
