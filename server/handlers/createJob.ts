import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { Job, JobCreateEvent, JobCreatedEvent } from '@/shared/protocol/index.js';
import type { RoomState } from '../store/roomStore.js';
import { sendEvent } from '../transport/sendEvent.js';

export function createJob(
  socket: WebSocket,
  roomState: RoomState,
  event: JobCreateEvent,
): JobCreatedEvent | undefined {
  if (roomState.processedCreateRequests.has(event.requestId)) {
    sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

    return;
  }

  const job: Job = { id: randomUUID(), title: event.payload.title, completed: false, version: 1 };
  roomState.jobs.push(job);
  roomState.processedCreateRequests.set(event.requestId, job);
  sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

  return { type: 'job:created', payload: job };
}
