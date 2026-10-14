import type { Job } from '@/shared/protocol';
import { Icon } from './Icon';
import { JOB_STATUS, getJobStatus } from '../model/jobStatus';
import styles from './JobsPanel.module.scss';

type Props = {
  job: Job;
  number: number;
  editorNames: string[];
  connected: boolean;
  onOpen: () => void;
  onDelete: (id: string) => void;
};

export function JobRow({ job, number, editorNames, connected, onOpen, onDelete }: Props) {
  return (
    <li className={styles.row}>
      <button
        className={styles.preview}
        type="button"
        aria-label={`Open ${job.title}`}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <span className={styles.title}>{job.title}</span>
        <span className={styles.cardBottom}>
          <small className={styles.number}>#{String(number).padStart(3, '0')}</small>
          {editorNames.length > 0 && (
            <small className={styles.editors}>{editorNames.join(', ')} editing…</small>
          )}
        </span>
      </button>
      <button
        type="button"
        className={styles.deletePreview}
        aria-label={`Delete ${job.title}`}
        title="Delete job"
        disabled={!connected || getJobStatus(job) === JOB_STATUS.DELETED}
        onClick={() => onDelete(job.id)}
      >
        <Icon name="trash" />
      </button>
    </li>
  );
}
