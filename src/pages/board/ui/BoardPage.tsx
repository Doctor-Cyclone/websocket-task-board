import { CONNECTION_STATUS } from '@/src/shared/connection';
import { useJobs } from '../model/useJobs';
import { BoardHeader } from './BoardHeader';
import { JobsPanel } from './JobsPanel';
import { RequestsPanel } from './RequestsPanel';
import styles from './BoardPage.module.scss';
import { useState } from 'react';
import { DEFAULT_ROOM, type Room } from '@/shared/rooms';

export default function BoardPage() {
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const { connectionStatus, jobs, requests, connect, send, disconnect, retry, changeRoom } =
    useJobs(room);
  const connected = connectionStatus === CONNECTION_STATUS.CONNECTED;

  return (
    <div className={styles.page}>
      <BoardHeader
        status={connectionStatus}
        room={room}
        onRoomChange={(nextRoom) => {
          if (changeRoom(nextRoom)) setRoom(nextRoom);
        }}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <main className={styles.content}>
        <JobsPanel
          jobs={jobs}
          connected={connected}
          onCreate={() =>
            send({
              type: 'job:create',
              requestId: crypto.randomUUID(),
              payload: { title: `Job #${jobs.length + 1}` },
            })
          }
          onToggle={(job) =>
            send({ type: 'job:update', payload: { id: job.id, completed: !job.completed } })
          }
          onDelete={(id) => send({ type: 'job:delete', payload: { id } })}
        />
        <RequestsPanel requests={requests} connected={connected} onRetry={retry} />
      </main>
      <footer className={styles.footer}>
        <span />
        Live updates powered by WebSocket.
      </footer>
    </div>
  );
}
