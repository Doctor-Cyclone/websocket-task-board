import type { Job } from '@/shared/protocol';
import { useRef, type DragEventHandler } from 'react';
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
  dragging: boolean;
  onDragStart: DragEventHandler<HTMLButtonElement>;
  onDragEnd: () => void;
};

export function JobRow({
  job,
  number,
  editorNames,
  connected,
  onOpen,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
}: Props) {
  const lastDragEnd = useRef(0);
  const canDrag = connected && getJobStatus(job) !== JOB_STATUS.DELETED;

  return (
    <li className={`${styles.row} ${dragging ? styles.dragging : ''}`}>
      <button
        className={styles.preview}
        type="button"
        aria-label={`Open ${job.title}`}
        aria-haspopup="dialog"
        draggable={canDrag}
        onDragStart={onDragStart}
        onDragEnd={() => {
          lastDragEnd.current = Date.now();
          onDragEnd();
        }}
        onClick={() => {
          if (dragging || Date.now() - lastDragEnd.current < 150) return;

          onOpen();
        }}
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
