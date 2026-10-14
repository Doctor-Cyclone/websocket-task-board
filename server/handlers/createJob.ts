import { MAX_JOBS_PER_ROOM } from '@/shared/limits/index.js';
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

  if (roomState.jobs.length >= MAX_JOBS_PER_ROOM) {
    sendEvent(socket, {
      type: 'request:error',
      payload: { requestId: event.requestId, message: 'This room has reached its job limit.' },
    });

    return;
  }

  const number = Math.max(0, ...roomState.jobs.map((job, index) => job.number ?? index + 1)) + 1;
  const status = event.payload.status ?? 'backlog';
  const job: Job = {
    id: randomUUID(),
    title: event.payload.title,
    description: event.payload.description ?? '',
    completed: status === 'done',
    status,
    number,
    version: 1,
  };
  roomState.jobs.push(job);
  roomState.processedCreateRequests.set(event.requestId, job);
  roomState.save();
  sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

  return { type: 'job:created', payload: job };
}
