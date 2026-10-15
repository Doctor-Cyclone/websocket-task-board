import { useState, type DragEvent } from 'react';
import type { Job } from '@/shared/protocol';
import { JOB_STATUS, getJobStatus, type ActiveJobStatus, type JobStatus } from './jobStatus';

type Options = {
  jobs: Job[];
  connected: boolean;
  onMove: (job: Job, status: ActiveJobStatus) => void;
  onDelete: (id: string) => void;
};

export function useJobDragAndDrop({ jobs, connected, onMove, onDelete }: Options) {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [targetStatus, setTargetStatus] = useState<JobStatus | null>(null);
  const activeDrag = connected && draggedJob !== null;

  const canDrop = (status: JobStatus) =>
    activeDrag &&
    status !== getJobStatus(draggedJob) &&
    jobs.some((job) => job.id === draggedJob.id && getJobStatus(job) !== JOB_STATUS.DELETED);

  const endDrag = () => {
    setDraggedJob(null);
    setTargetStatus(null);
  };

  const startDrag = (event: DragEvent, job: Job) => {
    if (!connected || getJobStatus(job) === JOB_STATUS.DELETED) {
      event.preventDefault();

      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-job-board-job', job.id);
    setDraggedJob({ ...job });
  };

  const overColumn = (event: DragEvent, status: JobStatus) => {
    if (!canDrop(status)) {
      event.dataTransfer.dropEffect = 'none';
      setTargetStatus(null);

      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setTargetStatus(status);
  };

  const leaveColumn = (event: DragEvent) => {
    const next = event.relatedTarget;

    if (next instanceof Node && event.currentTarget.contains(next)) return;

    setTargetStatus(null);
  };

  const dropOnColumn = (event: DragEvent, status: JobStatus) => {
    event.preventDefault();

    if (canDrop(status) && draggedJob) {
      if (status === JOB_STATUS.DELETED) {
        onDelete(draggedJob.id);
      } else {
        onMove(draggedJob, status);
      }
    }

    endDrag();
  };

  return {
    draggedJobId: activeDrag ? draggedJob.id : null,
    targetStatus: activeDrag ? targetStatus : null,
    startDrag,
    endDrag,
    overColumn,
    leaveColumn,
    dropOnColumn,
  };
}
