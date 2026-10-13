import { CONNECTION_STATUS } from '@/src/shared/connection';
import styles from './BoardPage.module.scss';
import { useJobs } from '@/src/pages/board/model/useJobs';
import { REQUEST_STATUS, REQUEST_STATUS_LABEL } from '../model/requests';

export default function BoardPage() {
  const { connectionStatus, jobs, requests, connect, send, disconnect, retry } = useJobs();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Job Board</h1>

      <p role="status">Connection: {connectionStatus}</p>

      <div>
        <button
          onClick={connect}
          disabled={
            connectionStatus === CONNECTION_STATUS.CONNECTING ||
            connectionStatus === CONNECTION_STATUS.RECONNECTING ||
            connectionStatus === CONNECTION_STATUS.CONNECTED ||
            connectionStatus === CONNECTION_STATUS.DISCONNECTING
          }
        >
          Connect
        </button>

        <button
          onClick={disconnect}
          disabled={
            connectionStatus === CONNECTION_STATUS.DISCONNECTED ||
            connectionStatus === CONNECTION_STATUS.DISCONNECTING
          }
        >
          Disconnect
        </button>

        {connectionStatus === CONNECTION_STATUS.CONNECTED && (
          <button
            onClick={() =>
              send({
                type: 'job:create',
                requestId: crypto.randomUUID(),
                payload: {
                  title: `Job #${Math.random()}`,
                },
              })
            }
          >
            Create job
          </button>
        )}
      </div>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            {job.title}
            <button
              onClick={() =>
                send({
                  type: 'job:update',
                  payload: {
                    id: job.id,
                    completed: !job.completed,
                  },
                })
              }
            >
              Toggle completion
            </button>
            <span>Status: {job.completed ? 'Completed' : 'In progress'}</span>
            <button
              disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
              onClick={() => send({ type: 'job:delete', payload: { id: job.id } })}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <h2>Create requests</h2>
      <ul>
        {requests.map((request) => (
          <li key={request.event.requestId}>
            {request.event.payload.title} — {REQUEST_STATUS_LABEL[request.status]}
            {request.status === REQUEST_STATUS.TIMED_OUT && (
              <button
                disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
                onClick={() => retry(request.event.requestId)}
              >
                Retry
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
