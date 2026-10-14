import { REQUEST_STATUS, REQUEST_STATUS_LABEL, type TrackedRequest } from '../model/requests';
import { Icon } from './Icon';
import styles from './RequestsPanel.module.scss';

type Props = { requests: TrackedRequest[]; connected: boolean; onRetry: (id: string) => void };

export function RequestsPanel({ requests, connected, onRetry }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="requests-heading">
      <div className={styles.heading}>
        <h2 id="requests-heading">Requests</h2>
        <p>Creation and update confirmations.</p>
      </div>
      {requests.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.file}>
            <Icon name="file" />
          </span>
          <h3>Nothing waiting in the wings.</h3>
          <p>Your creation and update requests will appear here.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {requests.map((request) => {
            const confirmed = request.status === REQUEST_STATUS.CONFIRMED;
            const timedOut = request.status === REQUEST_STATUS.TIMED_OUT;
            const failed = request.status === REQUEST_STATUS.FAILED;

            return (
              <li key={request.event.requestId} className={styles.card}>
                <span className={styles.file}>
                  <Icon name="file" />
                </span>
                <div className={styles.content}>
                  <h3>{request.title.trim() || 'Untitled job'}</h3>
                  <p className={styles.requestAction}>
                    {request.event.type === 'job:create' ? 'Create job' : 'Update job'}
                  </p>
                  <span
                    className={`${styles.badge} ${confirmed ? styles.confirmed : failed ? styles.failed : timedOut ? styles.warning : styles.pending}`}
                  >
                    <Icon name={confirmed ? 'check' : 'clock'} />
                    {REQUEST_STATUS_LABEL[request.status]}
                  </span>
                  {failed && (
                    <p className={styles.error} role="alert">
                      {request.error}
                    </p>
                  )}
                </div>
                {timedOut && (
                  <button
                    className={styles.retry}
                    disabled={!connected}
                    onClick={() => onRetry(request.event.requestId)}
                  >
                    Retry
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
