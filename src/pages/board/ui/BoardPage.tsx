import styles from './BoardPage.module.scss';
import { useEffect, useRef, useState } from 'react';

import { type Job, type JobCreateEvent, serverEventSchema } from '@/shared/protocol/index.js';

export default function BoardPage() {
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Отключено');
  const [jobs, setJobs] = useState<Job[]>([]);

  const connect = () => {
    let wasConnected = false;

    if (socketRef.current !== null) return;

    const socket = new WebSocket('ws://localhost:3001');

    socketRef.current = socket;
    setConnectionStatus('Подключение...');

    socket.onopen = () => {
      console.log('[open] Соединение установлено');
      setConnectionStatus('Подключено');
      wasConnected = true;
    };

    socket.onerror = (event) => {
      console.error('[error] Ошибка соединения', event);
      setConnectionStatus('Ошибка соединения');
    };

    socket.onclose = (event) => {
      if (!wasConnected) {
        setConnectionStatus('Не удалось подключиться');
      } else if (event.wasClean) {
        setConnectionStatus('Отключено');
      } else {
        setConnectionStatus('Соединение потеряно');
      }

      console.log('[close] Соединение закрыто', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      socketRef.current = null;
    };

    socket.onmessage = (event) => {
      let parsedMessage: unknown;

      try {
        parsedMessage = JSON.parse(event.data);
      } catch {
        console.error('Сервер прислал некорректный JSON');
        return;
      }

      const result = serverEventSchema.safeParse(parsedMessage);

      if (!result.success) {
        console.error('Неверное событие сервера:', result.error.issues);
        return;
      }

      const job = result.data;

      switch (job.type) {
        case 'job:created':
          setJobs((previousJobs) => [...previousJobs, job.payload]);
          break;

        case 'jobs:sync':
          setJobs(job.payload);
          break;
      }
    };
  };

  const disconnect = () => {
    const socket = socketRef.current;

    if (socket === null) return;

    setConnectionStatus('Отключение...');
    socket.close(1000, 'Отключение пользователем');
  };

  const send = (message: JobCreateEvent) => {
    const socket = socketRef.current;

    if (socket === null || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(message));
  };

  useEffect(() => {
    return () => {
      const socket = socketRef.current;

      if (socket === null) return;

      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.onmessage = null;

      socket.close();
      socketRef.current = null;
    };
  }, []);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Доска задач</h1>

      <p role="status">Соединение: {connectionStatus}</p>

      <div>
        <button
          onClick={connect}
          disabled={
            connectionStatus === 'Подключение...' ||
            connectionStatus === 'Подключено' ||
            connectionStatus === 'Отключение...'
          }
        >
          Подключиться
        </button>

        <button onClick={disconnect} disabled={connectionStatus !== 'Подключено'}>
          Отключиться
        </button>

        {connectionStatus === 'Подключено' && (
          <button
            onClick={() =>
              send({
                type: 'job:create',
                payload: {
                  title: `Job №${Math.random()}`,
                },
              })
            }
          >
            Отправить сообщение
          </button>
        )}
      </div>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>{job.title}</li>
        ))}
      </ul>
    </main>
  );
}
