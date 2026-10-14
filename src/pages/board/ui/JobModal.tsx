import { useId, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { JobStatusSwitch } from './JobStatusSwitch';
import { JOB_STATUS, type ActiveJobStatus } from '../model/jobStatus';
import styles from './JobModal.module.scss';

export type JobDetails = { title: string; description: string; status?: ActiveJobStatus };

type Props = {
  initialValues?: JobDetails;
  connected: boolean;
  onSubmit: (details: JobDetails) => void;
  onDismiss: () => void;
  onActivity?: () => void;
};

export function JobModal({ initialValues, connected, onSubmit, onDismiss, onActivity }: Props) {
  const headingId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [status, setStatus] = useState<ActiveJobStatus>(JOB_STATUS.BACKLOG);
  const editing = initialValues !== undefined;
  const canSave =
    connected && title.trim().length > 0 && title.length <= 200 && description.length <= 1000;

  return (
    <Modal headingId={headingId} onDismiss={onDismiss}>
      <div className={styles.header}>
        <div>
          <h2 id={headingId}>{editing ? 'Edit job' : 'New job'}</h2>
          <p>{editing ? 'Update the details of your job.' : 'Add details and choose a status.'}</p>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Close dialog"
          onClick={onDismiss}
        >
          <Icon name="cross" />
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!canSave) return;

          onSubmit({
            title: title.trim(),
            description: description.trim(),
            ...(!editing && { status }),
          });
        }}
      >
        <div className={styles.field}>
          <label htmlFor={titleId}>Job title</label>
          <input
            id={titleId}
            required
            maxLength={200}
            value={title}
            disabled={!connected}
            onChange={(event) => {
              setTitle(event.target.value);
              onActivity?.();
            }}
            placeholder="What needs to get done?"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={descriptionId}>
            Description <span>Optional</span>
          </label>
          <textarea
            id={descriptionId}
            rows={5}
            maxLength={1000}
            value={description}
            disabled={!connected}
            onChange={(event) => {
              setDescription(event.target.value);
              onActivity?.();
            }}
            placeholder="Add context, requirements or notes…"
          />
          <small>{description.length} / 1000</small>
        </div>
        {!editing && <JobStatusSwitch status={status} disabled={!connected} onChange={setStatus} />}
        {!connected && (
          <p className={styles.notice} role="status">
            Connection lost. Reconnect to save your changes.
          </p>
        )}
        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onDismiss}>
            Cancel
          </button>
          <button type="submit" className={styles.submit} disabled={!canSave}>
            {editing ? 'Save changes' : 'Create job'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
