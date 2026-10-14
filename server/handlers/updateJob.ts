import type { WebSocket } from 'ws';
import type { JobUpdateEvent, JobUpdatedEvent } from '@/shared/protocol/index.js';
import type { RoomState } from '../store/roomStore.js';
import { sendEvent } from '../transport/sendEvent.js';

export function updateJob(
  socket: WebSocket,
  roomState: RoomState,
  event: JobUpdateEvent,
): JobUpdatedEvent | undefined {
  if (roomState.processedUpdateRequests.has(event.requestId)) {
    sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

    return;
  }

  const job = roomState.jobs.find((entry) => entry.id === event.payload.id);

  if (!job) {
    console.error('Job not found');
    sendEvent(socket, {
      type: 'request:error',
      payload: { requestId: event.requestId, message: 'Job not found' },
    });

    return;
  }

  if (job.version !== event.payload.expectedVersion) {
    sendEvent(socket, {
      type: 'request:error',
      payload: {
        requestId: event.requestId,
        message:
          'This job changed in another tab. The latest version has been loaded. Please try again.',
        currentJob: job,
      },
    });

    return;
  }

  if (event.payload.completed !== undefined) job.completed = event.payload.completed;

  if (event.payload.title !== undefined) job.title = event.payload.title;

  job.version += 1;
  roomState.processedUpdateRequests.add(event.requestId);
  roomState.save();
  sendEvent(socket, { type: 'request:ack', payload: { requestId: event.requestId } });

  return { type: 'job:updated', payload: job };
}
