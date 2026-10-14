import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Job } from '@/shared/protocol';
import { JobDetailsModal } from './JobDetailsModal';
import { JobModal, type JobDetails } from './JobModal';
import { JOB_STATUS, getJobStatus, type ActiveJobStatus } from '../model/jobStatus';

type Props = {
  job: Job;
  number: number;
  connected: boolean;
  onDismiss: () => void;
  onMove: (job: Job, status: ActiveJobStatus) => void;
  onDelete: (id: string) => void;
  onUpdateDetails: (job: Job, details: JobDetails) => void;
  onEditing: (id: string, active: boolean) => void;
};

export function JobDialog({
  job,
  number,
  connected,
  onDismiss,
  onMove,
  onDelete,
  onUpdateDetails,
  onEditing,
}: Props) {
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const onEditingRef = useRef(onEditing);
  const canEdit = connected && getJobStatus(job) !== JOB_STATUS.DELETED;

  useLayoutEffect(() => {
    onEditingRef.current = onEditing;
  }, [onEditing]);

  useEffect(() => {
    if (!editingJob) return;

    const id = editingJob.id;
    onEditingRef.current(id, true);

    return () => onEditingRef.current(id, false);
  }, [editingJob]);

  if (editingJob) {
    return (
      <JobModal
        initialValues={{ title: editingJob.title, description: editingJob.description ?? '' }}
        connected={canEdit}
        onDismiss={onDismiss}
        onActivity={() => onEditing(job.id, true)}
        onSubmit={(details) => {
          onUpdateDetails(editingJob, details);
          onDismiss();
        }}
      />
    );
  }

  return (
    <JobDetailsModal
      job={job}
      number={number}
      connected={connected}
      onDismiss={onDismiss}
      onEdit={() => setEditingJob({ ...job })}
      onDelete={onDelete}
      onMove={onMove}
    />
  );
}
