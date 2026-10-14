import type { JobDetails } from './JobModal';
import { useState } from 'react';
import { JobDialog } from './JobDialog';
import type { Job, EditingParticipant } from '@/shared/protocol';
import { Icon } from './Icon';
import styles from './JobsPanel.module.scss';
import { JobRow } from './JobRow';
import { CreateJobForm } from './CreateJobForm';
import {
  JOB_STATUS,
  JOB_STATUS_LABEL,
  getJobStatus,
  type JobStatus,
  type ActiveJobStatus,
} from '../model/jobStatus';

type Props = {
  jobs: Job[];
  connected: boolean;
  onCreate: (details: JobDetails) => void;
  onMove: (job: Job, status: ActiveJobStatus) => void;
  onDelete: (id: string) => void;
  onUpdateDetails: (job: Job, details: JobDetails) => void;
  editors: EditingParticipant[];
  onEditing: (id: string, active: boolean) => void;
};

const icons = {
  backlog: 'plus',
  'in-progress': 'clock',
  done: 'check',
  deleted: 'cross',
} as const;

export function JobsPanel({
  jobs,
  connected,
  onCreate,
  onMove,
  onDelete,
  onUpdateDetails,
  editors,
  onEditing,
}: Props) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  return (
    <section className={styles.board} aria-label="Job board">
      {Object.values(JOB_STATUS).map((status: JobStatus) => {
        const columnJobs = jobs.filter((job) => getJobStatus(job) === status);

        return (
          <section
            key={status}
            className={`${styles.column} ${styles[status]}`}
            aria-label={JOB_STATUS_LABEL[status]}
          >
            <h2 className={styles.heading}>
              <Icon name={icons[status]} />
              {JOB_STATUS_LABEL[status]}
            </h2>
            {status === JOB_STATUS.BACKLOG && (
              <CreateJobForm connected={connected} onCreate={onCreate} />
            )}
            <ul className={styles.list}>
              {columnJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  number={job.number ?? jobs.indexOf(job) + 1}
                  onOpen={() => setSelectedJobId(job.id)}
                  connected={connected}
                  onDelete={onDelete}
                  editorNames={editors
                    .filter((editor) => editor.jobId === job.id)
                    .map((editor) => editor.name)}
                />
              ))}
            </ul>
            {columnJobs.length === 0 && (
              <p className={styles.empty}>
                {status === JOB_STATUS.BACKLOG && !connected
                  ? 'Connect to load your jobs.'
                  : 'No jobs here yet.'}
              </p>
            )}
          </section>
        );
      })}
      {selectedJob && (
        <JobDialog
          key={selectedJob.id}
          job={selectedJob}
          number={selectedJob.number ?? jobs.indexOf(selectedJob) + 1}
          connected={connected}
          onDismiss={() => setSelectedJobId(null)}
          onMove={onMove}
          onDelete={onDelete}
          onUpdateDetails={onUpdateDetails}
          onEditing={onEditing}
        />
      )}
    </section>
  );
}
