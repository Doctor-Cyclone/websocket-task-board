import type { Job } from '@/shared/protocol';

export const JOB_STATUS = {
  BACKLOG: 'backlog',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  DELETED: 'deleted',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
export type ActiveJobStatus = Exclude<JobStatus, 'deleted'>;

export const JOB_STATUS_LABEL = {
  backlog: 'Backlog',
  'in-progress': 'In progress',
  done: 'Done',
  deleted: 'Deleted',
};

export function getJobStatus(job: Job): JobStatus {
  return job.status ?? (job.completed ? JOB_STATUS.DONE : JOB_STATUS.BACKLOG);
}
