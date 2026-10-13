import { CONNECTION_STATUS, type ConnectionStatus } from '@/src/shared/connection';
import styles from './BoardHeader.module.scss';

type Props = { status: ConnectionStatus; onConnect: () => void; onDisconnect: () => void };

export function BoardHeader({ status, onConnect, onDisconnect }: Props) {
  const connected = status === CONNECTION_STATUS.CONNECTED;
  const active =
    connected ||
    status === CONNECTION_STATUS.CONNECTING ||
    status === CONNECTION_STATUS.RECONNECTING ||
    status === CONNECTION_STATUS.ERROR;
  const closing = status === CONNECTION_STATUS.DISCONNECTING;
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Job Board</h1>
        <span>Your work, in sync.</span>
      </div>
      <div className={styles.controls}>
        <span role="status" className={`${styles.status} ${connected ? styles.connected : ''}`}>
          <span className={styles.dot} />
          {status}
        </span>
        <button
          className={styles.button}
          disabled={closing}
          onClick={active ? onDisconnect : onConnect}
        >
          {active || closing ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </header>
  );
}
