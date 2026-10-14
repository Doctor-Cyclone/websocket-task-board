import { useState } from 'react';
import type { Job } from '@/shared/protocol';
import { Icon } from './Icon';
import styles from './JobsPanel.module.scss';

type Props = {
  job: Job;
  connected: boolean;
  onToggle: (job: Job) => void;
  onDelete: (id: string) => void;
  onRename: (job: Job, title: string) => void;
  editorNames: string[];
  onEditing: (id: string, active: boolean) => void;
};

export function JobRow({
  job,
  connected,
  onToggle,
  onDelete,
  onRename,
  editorNames,
  onEditing,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(job.title);
  const [editingVersion, setEditingVersion] = useState(job.version);

  return (
    <li className={styles.row}>
      {editorNames.length > 0 && (
        <small className={styles.editors}>{editorNames.join(', ')} editing…</small>
      )}
      {editing && connected ? (
        <form
          className={styles.editForm}
          onSubmit={(event) => {
            event.preventDefault();
            onRename({ ...job, version: editingVersion }, draftTitle);
            setEditing(false);
            onEditing(job.id, false);
          }}
        >
          <input
            aria-label={`Rename ${job.title}`}
            value={draftTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              onEditing(job.id, true);
            }}
            onFocus={() => onEditing(job.id, true)}
            onBlur={() => onEditing(job.id, false)}
          />
          <button type="submit">Save</button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              onEditing(job.id, false);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <label className={styles.job}>
          <input
            type="checkbox"
            checked={job.completed}
            disabled={!connected}
            onChange={() => onToggle(job)}
          />
          <span className={job.completed ? styles.completedTitle : ''}>{job.title}</span>
        </label>
      )}
      <span className={`${styles.badge} ${job.completed ? styles.completed : styles.progress}`}>
        <Icon name={job.completed ? 'check' : 'clock'} />
        {job.completed ? 'Completed' : 'In progress'}
      </span>
      <div className={styles.actions}>
        <button
          disabled={!connected}
          onClick={() => {
            setDraftTitle(job.title);
            setEditingVersion(job.version);
            setEditing(true);
            onEditing(job.id, true);
          }}
          aria-label={`Edit ${job.title}`}
        >
          Edit
        </button>
        <button
          className={styles.delete}
          disabled={!connected}
          onClick={() => onDelete(job.id)}
          aria-label={`Delete ${job.title}`}
          title="Delete job"
        >
          <Icon name="trash" />
        </button>
      </div>
    </li>
  );
}
