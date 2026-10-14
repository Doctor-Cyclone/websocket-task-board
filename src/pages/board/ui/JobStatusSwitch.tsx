import { useId } from 'react';
import {
  JOB_STATUS,
  JOB_STATUS_LABEL,
  type JobStatus,
  type ActiveJobStatus,
} from '../model/jobStatus';
import { Icon } from './Icon';
import styles from './JobModal.module.scss';

const options = [
  { status: JOB_STATUS.BACKLOG, icon: 'plus' },
  { status: JOB_STATUS.IN_PROGRESS, icon: 'clock' },
  { status: JOB_STATUS.DONE, icon: 'check' },
] as const;

type Props = { status: JobStatus; disabled: boolean; onChange: (status: ActiveJobStatus) => void };

export function JobStatusSwitch({ status, disabled, onChange }: Props) {
  const name = useId();
  const selectedIndex = options.findIndex((option) => option.status === status);

  return (
    <fieldset className={styles.statusSwitch} disabled={disabled}>
      <legend>Status{status === JOB_STATUS.DELETED ? ' · Deleted' : ''}</legend>
      <div className={`${styles.statusOptions} ${selectedIndex < 0 ? '' : styles[status]}`}>
        {selectedIndex >= 0 && (
          <span
            aria-hidden="true"
            className={styles.statusSlider}
            style={{ transform: `translateX(${selectedIndex * 100}%)` }}
          />
        )}
        {options.map((option) => (
          <label key={option.status} className={styles.statusOption}>
            <input
              type="radio"
              name={name}
              checked={option.status === status}
              onChange={() => onChange(option.status)}
            />
            <span>
              <Icon name={option.icon} />
              {JOB_STATUS_LABEL[option.status]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
