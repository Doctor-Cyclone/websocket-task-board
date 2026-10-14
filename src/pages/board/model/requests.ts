import type { JobCreateEvent } from '@/shared/protocol';

export const REQUEST_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  TIMED_OUT: 'timedOut',
  FAILED: 'failed',
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export type CreateRequest = {
  event: JobCreateEvent;
  status: RequestStatus;
  error?: string;
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  timedOut: 'Confirmation not received',
  failed: 'Failed',
};
