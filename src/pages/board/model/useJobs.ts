import { MAX_CACHED_ROOMS, MAX_JOBS_PER_ROOM } from '@/shared/limits';
import { useWebSocket } from '@/src/shared/connection/useWebSocket';
import {
  type Job,
  type JobEvent,
  type Participant,
  type EditingParticipant,
  serverEventSchema,
} from '@/shared/protocol';
import { useRef, useState } from 'react';
import { useRequests } from './useRequests';
import type { Room } from '@/shared/rooms';

export const useJobs = (room: Room, name = 'Guest') => {
  const [clientId] = useState(() => crypto.randomUUID());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [editors, setEditors] = useState<EditingParticipant[]>([]);
  const activeRoomRef = useRef(room);
  const lastEditingAtRef = useRef(0);
  const jobsCacheRef = useRef<Map<Room, Job[]>>(new Map());

  const [jobs, setJobs] = useState<Job[]>([]);

  const requestTracker = useRequests();

  const changeRoom = (nextRoom: Room): boolean => {
    if (!connection.canChangeConnection()) return false;

    const roomName = nextRoom;

    if (activeRoomRef.current !== roomName) {
      requestTracker.reset();
      setParticipants([]);
      setEditors([]);
      setJobs(jobsCacheRef.current.get(roomName) ?? []);
      activeRoomRef.current = roomName;
    }

    return true;
  };

  const updateRoomJobs = (update: (previousJobs: Job[]) => Job[]) => {
    const roomName = activeRoomRef.current;
    const nextJobs = update(jobsCacheRef.current.get(roomName) ?? []);

    jobsCacheRef.current.delete(roomName);
    jobsCacheRef.current.set(roomName, nextJobs.slice(-MAX_JOBS_PER_ROOM));
    while (jobsCacheRef.current.size > MAX_CACHED_ROOMS) {
      const oldest = jobsCacheRef.current.keys().next().value;

      if (oldest === undefined) break;

      jobsCacheRef.current.delete(oldest);
    }

    setJobs(nextJobs);
  };

  const handleMessage = (data: string) => {
    let parsedMessage: unknown;

    try {
      parsedMessage = JSON.parse(data);
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
      case 'room:editing':
        setEditors(serverJob.payload.filter((editor) => editor.clientId !== clientId));
        break;
      case 'room:participants':
        setParticipants(serverJob.payload);
        break;
      case 'request:error':
        requestTracker.fail(serverJob.payload.requestId, serverJob.payload.message);
        const currentJob = serverJob.payload.currentJob;

        if (currentJob) {
          updateRoomJobs((previousJobs) =>
            previousJobs.map((job) =>
              job.id === currentJob.id && job.version <= currentJob.version ? currentJob : job,
            ),
          );
        }

        break;
      case 'request:ack':
        requestTracker.confirm(serverJob.payload.requestId);

        break;
      case 'job:created':
        updateRoomJobs((previousJobs) => [...previousJobs, serverJob.payload]);

        break;
      case 'jobs:sync':
        updateRoomJobs(() => serverJob.payload);

        break;
      case 'job:updated':
        updateRoomJobs((previousJobs) =>
          previousJobs.map((currentJob) =>
            currentJob.id === serverJob.payload.id ? serverJob.payload : currentJob,
          ),
        );

        break;
      case 'job:deleted':
        updateRoomJobs((previousJobs) =>
          previousJobs.map((job) =>
            job.id === serverJob.payload.id
              ? (serverJob.payload.job ?? { ...job, status: 'deleted' })
              : job,
          ),
        );

        break;
    }
  };

  const url = new URL('ws://localhost:3001');
  url.searchParams.set('room', room);
  url.searchParams.set('name', name.trim() || 'Guest');
  url.searchParams.set('clientId', clientId);

  const connection = useWebSocket(url.toString(), handleMessage, (transmit) =>
    transmit(JSON.stringify({ type: 'room:sync' })),
  );

  const connect = () => {
    if (changeRoom(room)) connection.connect();
  };

  const disconnect = () => {
    setParticipants([]);
    setEditors([]);
    requestTracker.cancelPending();
    connection.disconnect();
  };

  const send = (message: JobEvent) => {
    if (!connection.canSend()) return;

    if (message.type === 'job:editing') {
      const now = Date.now();

      if (message.payload.active && now - lastEditingAtRef.current < 1000) return;

      lastEditingAtRef.current = message.payload.active ? now : 0;
    }

    if (
      message.type === 'job:create' ||
      message.type === 'job:update' ||
      message.type === 'job:delete'
    ) {
      const title =
        message.type === 'job:create'
          ? message.payload.title
          : (jobsCacheRef.current
              .get(activeRoomRef.current)
              ?.find((job) => job.id === message.payload.id)?.title ?? 'Job update');
      requestTracker.submitRequest(
        message,
        (event) => connection.send(JSON.stringify(event)),
        title,
      );
    } else {
      connection.send(JSON.stringify(message));
    }
  };

  const retry = (requestId: string) => {
    if (!connection.canSend()) return;

    requestTracker.retry(requestId, (event) => connection.send(JSON.stringify(event)));
  };

  return {
    connectionStatus: connection.connectionStatus,
    jobs,
    participants,
    editors,
    clientId,
    requests: requestTracker.requests,
    connect,
    disconnect,
    send,
    retry,
    changeRoom,
  };
};
