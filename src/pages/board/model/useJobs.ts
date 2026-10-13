import { CONNECTION_STATUS, type ConnectionStatus } from '@/src/shared/connection';
import { type Job, type JobEvent, serverEventSchema } from '@/shared/protocol';
import { useEffect, useRef, useState } from 'react';

const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;

export const useJobs = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    CONNECTION_STATUS.DISCONNECTED,
  );

  const connect = () => {
    shouldReconnectRef.current = true;

    if (socketRef.current !== null) return;

    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = new WebSocket('ws://localhost:3001');

    socketRef.current = socket;
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    socket.onopen = () => {
      if (!shouldReconnectRef.current || socketRef.current !== socket) return;
      reconnectAttemptRef.current = 0;
      console.log('[open] Connection established');
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    };

    socket.onerror = (event) => {
      console.error('[error] Connection error', event);
      if (shouldReconnectRef.current && socketRef.current === socket) {
        setConnectionStatus(CONNECTION_STATUS.ERROR);
      }
    };

    socket.onclose = (event) => {
      if (socketRef.current !== socket) return;

      console.log('[close] Connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      socketRef.current = null;

      if (!shouldReconnectRef.current) {
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        return;
      }

      setConnectionStatus(CONNECTION_STATUS.RECONNECTING);
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptRef.current,
        RECONNECT_MAX_DELAY_MS,
      );
      reconnectAttemptRef.current += 1;

      console.log(
        `[reconnect] Attempt ${reconnectAttemptRef.current} scheduled in ${delay / 1000}s`,
      );

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (shouldReconnectRef.current) connect();
      }, delay);
    };

    socket.onmessage = (event) => {
      let parsedMessage: unknown;

      try {
        parsedMessage = JSON.parse(event.data);
      } catch {
        console.error('Server sent invalid JSON');
        return;
      }

      const result = serverEventSchema.safeParse(parsedMessage);

      if (!result.success) {
        console.error('Invalid server event:', result.error.issues);
        return;
      }

      const serverJob = result.data;

      switch (serverJob.type) {
        case 'request:ack':
          console.log('[ack] Request confirmed:', serverJob.payload.requestId);
          break;
        case 'job:created':
          setJobs((previousJobs) => [...previousJobs, serverJob.payload]);
          break;

        case 'jobs:sync':
          setJobs(serverJob.payload);
          break;

        case 'job:updated':
          setJobs((previousJobs) =>
            previousJobs.map((currentJob) =>
              currentJob.id === serverJob.payload.id ? serverJob.payload : currentJob,
            ),
          );
          break;
        case 'job:deleted':
          setJobs((previousJobs) => previousJobs.filter((job) => job.id !== serverJob.payload.id));
          break;
      }
    };
  };

  const disconnect = () => {
    const socket = socketRef.current;
    shouldReconnectRef.current = false;
    reconnectAttemptRef.current = 0;

    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (socket === null) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      return;
    }

    setConnectionStatus(CONNECTION_STATUS.DISCONNECTING);
    socket.close(1000, 'Disconnected by user');
  };

  const send = (message: JobEvent) => {
    const socket = socketRef.current;

    if (socket === null || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(message));
  };

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      reconnectAttemptRef.current = 0;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

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

  return { connectionStatus, jobs, connect, disconnect, send };
};
