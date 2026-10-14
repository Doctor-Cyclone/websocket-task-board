import type { JobDeleteEvent, JobDeletedEvent } from '@/shared/protocol/index.js';
import type { RoomState } from '../store/roomStore.js';

export function deleteJob(
  roomState: RoomState,
  event: JobDeleteEvent,
): JobDeletedEvent | undefined {
  const jobIndex = roomState.jobs.findIndex((job) => job.id === event.payload.id);

  if (jobIndex === -1) {
    console.error('Job not found');

    return;
  }

  roomState.jobs.splice(jobIndex, 1);
  roomState.save();

  return { type: 'job:deleted', payload: { id: event.payload.id } };
}
