import { z } from 'zod';

export const jobCreateEventSchema = z.object({
  type: z.literal('job:create'),
  requestId: z.string(),
  payload: z.object({
    title: z.string(),
  }),
});

export const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const jobCreatedEventSchema = z.object({
  type: z.literal('job:created'),
  payload: jobSchema,
});

export const jobUpdateEventSchema = z.object({
  type: z.literal('job:update'),
  payload: z.object({
    id: z.string(),
    completed: z.boolean(),
  }),
});

export const jobUpdatedEventSchema = z.object({
  type: z.literal('job:updated'),
  payload: jobSchema,
});

export const jobsSyncEventSchema = z.object({
  type: z.literal('jobs:sync'),
  payload: z.array(jobSchema),
});

export const jobDeleteEventSchema = z.object({
  type: z.literal('job:delete'),
  payload: z.object({ id: z.string() }),
});

export const jobDeletedEventSchema = z.object({
  type: z.literal('job:deleted'),
  payload: z.object({ id: z.string() }),
});

export const jobAckEventSchema = z.object({
  type: z.literal('request:ack'),
  payload: z.object({ requestId: z.string() }),
});

export const serverEventSchema = z.discriminatedUnion('type', [
  jobCreatedEventSchema,
  jobsSyncEventSchema,
  jobUpdatedEventSchema,
  jobDeletedEventSchema,
  jobAckEventSchema,
]);

export const jobEventSchema = z.discriminatedUnion('type', [
  jobCreateEventSchema,
  jobUpdateEventSchema,
  jobDeleteEventSchema,
]);

export type JobCreateEvent = z.infer<typeof jobCreateEventSchema>;
export type JobCreatedEvent = z.infer<typeof jobCreatedEventSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobsSyncEvent = z.infer<typeof jobsSyncEventSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
export type JobUpdateEvent = z.infer<typeof jobUpdateEventSchema>;
export type JobEvent = z.infer<typeof jobEventSchema>;
export type JobUpdatedEvent = z.infer<typeof jobUpdatedEventSchema>;
export type JobDeleteEvent = z.infer<typeof jobDeleteEventSchema>;
export type JobDeletedEvent = z.infer<typeof jobDeletedEventSchema>;
export type JobAckEvent = z.infer<typeof jobAckEventSchema>;
