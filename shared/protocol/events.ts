import { z } from 'zod';

export const jobCreateEventSchema = z.object({
  type: z.literal('job:create'),
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

export const jobsSyncEventSchema = z.object({
  type: z.literal('jobs:sync'),
  payload: z.array(jobSchema),
});

export const serverEventSchema = z.discriminatedUnion('type', [
  jobCreatedEventSchema,
  jobsSyncEventSchema,
]);

export type JobCreateEvent = z.infer<typeof jobCreateEventSchema>;
export type JobCreatedEvent = z.infer<typeof jobCreatedEventSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobsSyncEvent = z.infer<typeof jobsSyncEventSchema>;
export type ServerEventSchema = z.infer<typeof serverEventSchema>;
