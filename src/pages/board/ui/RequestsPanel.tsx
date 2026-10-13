import { REQUEST_STATUS, REQUEST_STATUS_LABEL, type CreateRequest } from '../model/requests';
import { Icon } from './Icon';
import styles from './RequestsPanel.module.scss';

type Props = { requests: CreateRequest[]; connected: boolean; onRetry: (id: string) => void };

export function RequestsPanel({ requests, connected, onRetry }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="requests-heading">
      <div className={styles.heading}>
        <h2 id="requests-heading">Requests</h2>
        <p>Creation confirmations.</p>
      </div>
      {requests.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.file}>
            <Icon name="file" />
          </span>
          <h3>Nothing waiting in the wings.</h3>
          <p>Your creation requests will appear here.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {requests.map((request) => {
            const confirmed = request.status === REQUEST_STATUS.CONFIRMED;
            const timedOut = request.status === REQUEST_STATUS.TIMED_OUT;
            return (
              <li key={request.event.requestId} className={styles.card}>
                <span className={styles.file}>
                  <Icon name="file" />
                </span>
                <div className={styles.content}>
                  <h3>{request.event.payload.title}</h3>
                  <span
                    className={`${styles.badge} ${confirmed ? styles.confirmed : timedOut ? styles.warning : styles.pending}`}
                  >
                    <Icon name={confirmed ? 'check' : 'clock'} />
                    {REQUEST_STATUS_LABEL[request.status]}
                  </span>
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
