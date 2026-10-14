import { useWebSocket } from '@/src/shared/connection/useWebSocket';
import { type Job, type JobEvent, serverEventSchema } from '@/shared/protocol';
import { useRef, useState } from 'react';
import { useCreateRequests } from './useCreateRequests';
import type { Room } from '@/shared/rooms';

export const useJobs = (room: Room) => {
  const activeRoomRef = useRef(room);
  const jobsCacheRef = useRef<Map<Room, Job[]>>(new Map());

  const [jobs, setJobs] = useState<Job[]>([]);

  const createRequests = useCreateRequests();

  const changeRoom = (nextRoom: Room): boolean => {
    if (!connection.canChangeConnection()) return false;

    const roomName = nextRoom;

    if (activeRoomRef.current !== roomName) {
      createRequests.reset();
      setJobs(jobsCacheRef.current.get(roomName) ?? []);
      activeRoomRef.current = roomName;
    }

    return true;
  };

  const updateRoomJobs = (update: (previousJobs: Job[]) => Job[]) => {
    const roomName = activeRoomRef.current;
    const nextJobs = update(jobsCacheRef.current.get(roomName) ?? []);

    jobsCacheRef.current.set(roomName, nextJobs);

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
      case 'request:error':
        createRequests.fail(serverJob.payload.requestId, serverJob.payload.message);
        break;
      case 'request:ack':
        createRequests.confirm(serverJob.payload.requestId);

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
          previousJobs.filter((job) => job.id !== serverJob.payload.id),
        );

        break;
    }
  };

  const url = new URL('ws://localhost:3001');
  url.searchParams.set('room', room);

  const connection = useWebSocket(url.toString(), handleMessage);

  const connect = () => {
    if (changeRoom(room)) connection.connect();
  };

  const disconnect = () => {
    createRequests.cancelPending();
    connection.disconnect();
  };

  const send = (message: JobEvent) => {
    if (!connection.canSend()) return;

    if (message.type === 'job:create') {
      createRequests.submitCreateRequest(message, (event) =>
        connection.send(JSON.stringify(event)),
      );
    } else {
      connection.send(JSON.stringify(message));
    }
  };

  const retry = (requestId: string) => {
    if (!connection.canSend()) return;

    createRequests.retry(requestId, (event) => connection.send(JSON.stringify(event)));
  };

  return {
    connectionStatus: connection.connectionStatus,
    jobs,
    requests: createRequests.requests,
    connect,
    disconnect,
    send,
    retry,
    changeRoom,
  };
};
