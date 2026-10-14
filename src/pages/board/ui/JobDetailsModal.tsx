import { useId } from 'react';
import type { Job } from '@/shared/protocol';
import {
  JOB_STATUS,
  JOB_STATUS_LABEL,
  getJobStatus,
  type ActiveJobStatus,
} from '../model/jobStatus';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { JobStatusSwitch } from './JobStatusSwitch';
import styles from './JobModal.module.scss';

type Props = {
  job: Job;
  number: number;
  connected: boolean;
  onDismiss: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onMove: (job: Job, status: ActiveJobStatus) => void;
};

export function JobDetailsModal({
  job,
  number,
  connected,
  onDismiss,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const headingId = useId();
  const status = getJobStatus(job);
  const canChange = connected && status !== JOB_STATUS.DELETED;

  return (
    <Modal headingId={headingId} onDismiss={onDismiss}>
      <div className={`${styles.header} ${styles.detailsHeader}`}>
        <div className={styles.detailsHeading}>
          <small>
            #{String(number).padStart(3, '0')} · {JOB_STATUS_LABEL[status]}
          </small>
          <h2 id={headingId}>{job.title}</h2>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.close}
            disabled={!canChange}
            aria-label={`Delete ${job.title}`}
            title="Delete job"
            onClick={() => {
              onDismiss();
              onDelete(job.id);
            }}
          >
            <Icon name="trash" />
          </button>
          <button
            type="button"
            className={styles.close}
            aria-label="Close dialog"
            onClick={onDismiss}
          >
            <Icon name="cross" />
          </button>
        </div>
      </div>
      <section className={styles.description}>
        <h3>Description</h3>
        <p>{job.description?.trim() ? job.description : 'No description yet.'}</p>
      </section>
      <JobStatusSwitch
        status={status}
        disabled={!canChange}
        onChange={(nextStatus) => onMove(job, nextStatus)}
      />
      {!connected && <p className={styles.notice}>Connect to edit this job.</p>}
      {status === JOB_STATUS.DELETED && (
        <p className={styles.notice}>This job has been deleted and is read-only.</p>
      )}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.editButton}
          disabled={!canChange}
          aria-label={`Edit ${job.title}`}
          onClick={onEdit}
        >
          Edit job
        </button>
      </div>
    </Modal>
  );
}
