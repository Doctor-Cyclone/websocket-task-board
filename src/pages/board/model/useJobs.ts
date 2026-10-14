import { useWebSocket } from '@/src/shared/connection/useWebSocket';
import { type Job, type JobEvent, serverEventSchema } from '@/shared/protocol';
import { useEffect, useRef, useState } from 'react';
import { REQUEST_STATUS, type CreateRequest } from './requests';
import type { Room } from '@/shared/rooms';

const REQUEST_ACK_TIMEOUT_MS = 5000;

export const useJobs = (room: Room) => {
  const activeRoomRef = useRef(room);
  const jobsCacheRef = useRef<Map<Room, Job[]>>(new Map());
  const pendingRequestsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<CreateRequest[]>([]);
  const changeRoom = (nextRoom: Room): boolean => {
    if (!connection.canChangeConnection()) return false;

    const roomName = nextRoom;

    if (activeRoomRef.current !== roomName) {
      pendingRequestsRef.current.forEach((timer) => clearTimeout(timer));
      pendingRequestsRef.current.clear();
      setRequests([]);
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
      case 'request:ack':
        const requestId = serverJob.payload.requestId;
        const requestTimer = pendingRequestsRef.current.get(requestId);

        if (requestTimer !== undefined) {
          clearTimeout(requestTimer);
          pendingRequestsRef.current.delete(requestId);
        }

        console.log('[ack] Request confirmed:', serverJob.payload.requestId);
        setRequests((previous) =>
          previous.map((request) =>
            request.event.requestId === requestId
              ? { ...request, status: REQUEST_STATUS.CONFIRMED }
              : request,
          ),
        );
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
    pendingRequestsRef.current.forEach((timer) => clearTimeout(timer));
    pendingRequestsRef.current.clear();
    setRequests((previous) =>
      previous.map((request) =>
        request.status === REQUEST_STATUS.PENDING
          ? { ...request, status: REQUEST_STATUS.TIMED_OUT }
          : request,
      ),
    );

    connection.disconnect();
  };

  const send = (message: JobEvent) => {
    if (!connection.canSend()) return;

    if (message.type === 'job:create') {
      if (pendingRequestsRef.current.has(message.requestId)) return;

      setRequests((previous) => {
        const exists = previous.some((request) => request.event.requestId === message.requestId);

        if (exists) {
          return previous.map((request) =>
            request.event.requestId === message.requestId
              ? { ...request, status: REQUEST_STATUS.PENDING }
              : request,
          );
        }

        return [...previous, { event: message, status: REQUEST_STATUS.PENDING }];
      });

      pendingRequestsRef.current.set(
        message.requestId,
        setTimeout(() => {
          pendingRequestsRef.current.delete(message.requestId);
          console.log('Request confirmation timed out: ', message.requestId);
          setRequests((previous) =>
            previous.map((request) =>
              request.event.requestId === message.requestId
                ? { ...request, status: REQUEST_STATUS.TIMED_OUT }
                : request,
            ),
          );
        }, REQUEST_ACK_TIMEOUT_MS),
      );
    }

    if (!connection.send(JSON.stringify(message))) {
      if (message.type === 'job:create') {
        const timer = pendingRequestsRef.current.get(message.requestId);

        if (timer !== undefined) clearTimeout(timer);

        pendingRequestsRef.current.delete(message.requestId);
        setRequests((previous) =>
          previous.map((request) =>
            request.event.requestId === message.requestId
              ? { ...request, status: REQUEST_STATUS.TIMED_OUT }
              : request,
          ),
        );
      }
    }
  };

  const retry = (requestId: string) => {
    const request = requests.find((entry) => entry.event.requestId === requestId);

    if (!request || request.status !== REQUEST_STATUS.TIMED_OUT) return;

    send(request.event);
  };

  useEffect(() => {
    const pendingRequests = pendingRequestsRef.current;

    return () => {
      pendingRequests.forEach((timer) => clearTimeout(timer));
      pendingRequests.clear();
    };
  }, []);

  return {
    connectionStatus: connection.connectionStatus,
    jobs,
    requests,
    connect,
    disconnect,
    send,
    retry,
    changeRoom,
  };
};
