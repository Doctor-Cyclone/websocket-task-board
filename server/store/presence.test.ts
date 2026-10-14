import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createParticipantStore } from './participantStore.js';
import { createEditingStore } from './editingStore.js';

describe('room presence', () => {
  it('deduplicates reconnect identities without removing a surviving connection', () => {
    const store = createParticipantStore();
    const first = {} as WebSocket;
    const second = {} as WebSocket;
    const participant = { clientId: 'same-tab', name: 'Alice' };
    store.join(first, 'alpha', participant);
    store.join(second, 'alpha', participant);
    expect(store.list('alpha')).toHaveLength(1);
    store.leave(first);
    expect(store.list('alpha')).toEqual([participant]);
    expect(store.list('beta')).toEqual([]);
    store.leave(second);
    expect(store.list('alpha')).toEqual([]);
  });

  it('expires an editing indicator and reports only the affected room', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const store = createEditingStore();
    const socket = {} as WebSocket;
    store.set(socket, 'alpha', { clientId: 'tab', name: 'Alice', jobId: 'job' }, true);
    expect(store.list('beta')).toEqual([]);
    vi.spyOn(Date, 'now').mockReturnValue(5999);
    expect(store.expire().size).toBe(0);
    vi.spyOn(Date, 'now').mockReturnValue(6000);
    expect([...store.expire()]).toEqual(['alpha']);
    expect(store.list('alpha')).toEqual([]);
  });
});
