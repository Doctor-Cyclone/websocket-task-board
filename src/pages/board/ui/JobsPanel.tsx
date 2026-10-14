import type { Job } from '@/shared/protocol';
import { Icon } from './Icon';
import styles from './JobsPanel.module.scss';
import { useState } from 'react';

type Props = {
  jobs: Job[];
  connected: boolean;
  onCreate: (title: string) => void;
  onToggle: (job: Job) => void;
  onDelete: (id: string) => void;
};

export function JobsPanel({ jobs, connected, onCreate, onToggle, onDelete }: Props) {
  const [jobTitle, setJobTitle] = useState('');

  return (
    <section className={styles.panel} aria-labelledby="jobs-heading">
      <div className={styles.heading}>
        <div>
          <h2 id="jobs-heading">Jobs</h2>
          <p>Create and manage your jobs.</p>
        </div>
        <button
          className={styles.create}
          type="submit"
          form="create-job-form"
          disabled={!connected}
        >
          <Icon name="plus" />
          Create job
        </button>
      </div>
      <form
        id="create-job-form"
        className={styles.createForm}
        onSubmit={(event) => {
          event.preventDefault();

          if (connected) onCreate(jobTitle);
        }}
      >
        <label htmlFor="job-title">Job title</label>
        <input
          id="job-title"
          value={jobTitle}
          disabled={!connected}
          onChange={(event) => setJobTitle(event.target.value)}
          placeholder="What needs to get done?"
          aria-describedby="job-title-hint"
        />
        <p id="job-title-hint">Use a title between 1 and 200 characters.</p>
      </form>
      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="check" />
          </span>
          <h3>A little space for your next idea.</h3>
          <p>
            {connected
              ? 'Create your first job to get things moving.'
              : 'Connect to load your jobs and start working.'}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.columns} aria-hidden="true">
            <span>Job</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <ul className={styles.list}>
            {jobs.map((job) => (
              <li className={styles.row} key={job.id}>
                <label className={styles.job}>
                  <input
                    type="checkbox"
                    checked={job.completed}
                    disabled={!connected}
                    onChange={() => onToggle(job)}
                  />
                  <span className={job.completed ? styles.completedTitle : ''}>{job.title}</span>
                </label>
                <span
                  className={`${styles.badge} ${job.completed ? styles.completed : styles.progress}`}
                >
                  <Icon name={job.completed ? 'check' : 'clock'} />
                  {job.completed ? 'Completed' : 'In progress'}
                </span>
                <button
                  className={styles.delete}
                  disabled={!connected}
                  onClick={() => onDelete(job.id)}
                  aria-label={`Delete ${job.title}`}
                  title="Delete job"
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
