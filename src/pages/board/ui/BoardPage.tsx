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
  const [name, setName] = useState('Guest');
  const {
    connectionStatus,
    jobs,
    participants,
    editors,
    clientId,
    requests,
    connect,
    send,
    disconnect,
    retry,
    changeRoom,
  } = useJobs(room, name);
  const connected = connectionStatus === CONNECTION_STATUS.CONNECTED;

  return (
    <div className={styles.page}>
      <BoardHeader
        status={connectionStatus}
        room={room}
        name={name}
        onNameChange={setName}
        onRoomChange={(nextRoom) => {
          if (changeRoom(nextRoom)) setRoom(nextRoom);
        }}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <div className={styles.participants}>
        <span>
          {connected
            ? `${participants.length} online in ${room}`
            : `Connect to see participants in ${room}`}
        </span>
        {connected &&
          participants.map((participant) => (
            <span key={participant.clientId}>
              {participant.name}
              {participant.clientId === clientId ? ' (you)' : ''}
            </span>
          ))}
      </div>
      <main className={styles.content}>
        <JobsPanel
          jobs={jobs}
          editors={connected ? editors : []}
          onEditing={(id, active) => send({ type: 'job:editing', payload: { id, active } })}
          connected={connected}
          onCreate={(details) =>
            send({
              type: 'job:create',
              requestId: crypto.randomUUID(),
              payload: details,
            })
          }
          onMove={(job, status) =>
            send({
              type: 'job:update',
              requestId: crypto.randomUUID(),
              payload: { id: job.id, status, expectedVersion: job.version },
            })
          }
          onDelete={(id) =>
            send({ type: 'job:delete', requestId: crypto.randomUUID(), payload: { id } })
          }
          onUpdateDetails={(job, details) =>
            send({
              type: 'job:update',
              requestId: crypto.randomUUID(),
              payload: { id: job.id, ...details, expectedVersion: job.version },
            })
          }
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
