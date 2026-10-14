import { useState } from 'react';
import { Icon } from './Icon';
import { JobModal, type JobDetails } from './JobModal';
import styles from './JobsPanel.module.scss';

type Props = { connected: boolean; onCreate: (details: JobDetails) => void };

export function CreateJobForm({ connected, onCreate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.creation}>
      <button
        className={styles.create}
        disabled={!connected}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Icon name="plus" />
        New job
      </button>
      {open && (
        <JobModal
          connected={connected}
          onDismiss={() => setOpen(false)}
          onSubmit={(details) => {
            onCreate(details);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
