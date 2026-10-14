import { useEffect, useRef, useState } from 'react';
import type { RequestEvent } from './requests';
import { REQUEST_STATUS, type TrackedRequest, type RequestStatus } from './requests';
import { MAX_REQUEST_HISTORY } from '@/shared/limits';

const REQUEST_ACK_TIMEOUT_MS = 5000;
type TransmitRequestEvent = (event: RequestEvent) => boolean;

export const useRequests = () => {
  const [requests, setRequests] = useState<TrackedRequest[]>([]);
  const pendingRequestsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = (requestId: string) => {
    const timer = pendingRequestsRef.current.get(requestId);

    if (timer !== undefined) clearTimeout(timer);

    pendingRequestsRef.current.delete(requestId);
  };

  const updateStatus = (requestId: string, status: RequestStatus) => {
    setRequests((previous) =>
      previous.map((request) =>
        request.event.requestId === requestId ? { ...request, status, error: undefined } : request,
      ),
    );
  };

  const confirm = (requestId: string) => {
    clearTimer(requestId);
    updateStatus(requestId, REQUEST_STATUS.CONFIRMED);
    console.log('[ack] Request confirmed:', requestId);
  };

  const fail = (requestId: string, message: string) => {
    clearTimer(requestId);

    setRequests((previous) =>
      previous.map((request) =>
        request.event.requestId === requestId
          ? { ...request, status: REQUEST_STATUS.FAILED, error: message }
          : request,
      ),
    );
  };

  const submitRequest = (
    event: RequestEvent,
    transmit: TransmitRequestEvent,
    title: string,
  ): boolean => {
    if (pendingRequestsRef.current.has(event.requestId)) return false;

    if (pendingRequestsRef.current.size >= MAX_REQUEST_HISTORY) return false;

    setRequests((previous) => {
      const exists = previous.some((request) => request.event.requestId === event.requestId);

      if (exists) {
        return previous.map((request) =>
          request.event.requestId === event.requestId
            ? { ...request, status: REQUEST_STATUS.PENDING, error: undefined }
            : request,
        );
      }

      const next: TrackedRequest[] = [
        ...previous,
        { event, title, status: REQUEST_STATUS.PENDING },
      ];

      while (next.length > MAX_REQUEST_HISTORY) {
        const removable = next.findIndex((request) => request.status !== REQUEST_STATUS.PENDING);

        if (removable === -1) break;

        next.splice(removable, 1);
      }

      return next;
    });

    const timer = setTimeout(() => {
      pendingRequestsRef.current.delete(event.requestId);
      updateStatus(event.requestId, REQUEST_STATUS.TIMED_OUT);
      console.log('Request confirmation timed out:', event.requestId);
    }, REQUEST_ACK_TIMEOUT_MS);

    pendingRequestsRef.current.set(event.requestId, timer);

    if (!transmit(event)) {
      clearTimer(event.requestId);
      updateStatus(event.requestId, REQUEST_STATUS.TIMED_OUT);

      return false;
    }

    return true;
  };

  const retry = (requestId: string, transmit: TransmitRequestEvent): boolean => {
    const request = requests.find((entry) => entry.event.requestId === requestId);

    if (!request || request.status !== REQUEST_STATUS.TIMED_OUT) return false;

    return submitRequest(request.event, transmit, request.title);
  };

  const cancelPending = () => {
    pendingRequestsRef.current.forEach((timer) => clearTimeout(timer));
    pendingRequestsRef.current.clear();

    setRequests((previous) =>
      previous.map((request) =>
        request.status === REQUEST_STATUS.PENDING
          ? { ...request, status: REQUEST_STATUS.TIMED_OUT }
          : request,
      ),
    );
  };

  const reset = () => {
    pendingRequestsRef.current.forEach((timer) => clearTimeout(timer));
    pendingRequestsRef.current.clear();

    setRequests([]);
  };

  useEffect(() => {
    const pendingRequests = pendingRequestsRef.current;

    return () => {
      pendingRequests.forEach((timer) => clearTimeout(timer));
      pendingRequests.clear();
    };
  }, []);

  return { requests, submitRequest, confirm, fail, retry, cancelPending, reset };
};
