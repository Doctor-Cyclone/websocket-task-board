import type { WebSocket } from 'ws';
import { sendEvent } from '../transport/sendEvent.js';
import type { JobDeleteEvent, JobDeletedEvent } from '@/shared/protocol/index.js';
import type { RoomState } from '../store/roomStore.js';

export function deleteJob(
  socket: WebSocket,
  roomState: RoomState,
  event: JobDeleteEvent,
): JobDeletedEvent | undefined {
  if (roomState.processedDeleteRequests.has(event.requestId)) {
    sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

    return;
  }

  const jobIndex = roomState.jobs.findIndex((job) => job.id === event.payload.id);

  if (jobIndex === -1) {
    console.error('Job not found');
    sendEvent(socket, {
      type: 'request:error',
      payload: { requestId: event.requestId, message: 'Job not found' },
    });

    return;
  }

  const job = roomState.jobs[jobIndex]!;

  if (job.status !== 'deleted') {
    job.status = 'deleted';
    job.version += 1;
  }

  roomState.processedDeleteRequests.add(event.requestId);
  roomState.save();
  sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

  return { type: 'job:deleted', payload: { id: event.payload.id, job } };
}
