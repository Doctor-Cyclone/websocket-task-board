import { z } from 'zod';

export const jobCreateEventSchema = z.object({
  type: z.literal('job:create'),
  requestId: z.string().min(1),
  payload: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(200, 'Title must be 200 characters or fewer'),
  }),
});

export const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  version: z.number().int().positive(),
});

export const jobCreatedEventSchema = z.object({
  type: z.literal('job:created'),
  payload: jobSchema,
});

export const jobUpdateEventSchema = z.object({
  type: z.literal('job:update'),
  requestId: z.string().min(1),
  payload: z
    .object({
      id: z.string(),
      completed: z.boolean().optional(),
      title: jobCreateEventSchema.shape.payload.shape.title.optional(),
      expectedVersion: z.number().int().positive(),
    })
    .refine(
      (payload) => payload.completed !== undefined || payload.title !== undefined,
      'An update must contain title or completed',
    ),
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

export const requestErrorEventSchema = z.object({
  type: z.literal('request:error'),
  payload: z.object({
    requestId: z.string(),
    message: z.string(),
    currentJob: jobSchema.optional(),
  }),
});

export const participantSchema = z.object({ clientId: z.string(), name: z.string() });
export type Participant = z.infer<typeof participantSchema>;
export const roomParticipantsEventSchema = z.object({
  type: z.literal('room:participants'),
  payload: z.array(participantSchema),
});

export const serverEventSchema = z.discriminatedUnion('type', [
  roomParticipantsEventSchema,
  jobCreatedEventSchema,
  jobsSyncEventSchema,
  jobUpdatedEventSchema,
  jobDeletedEventSchema,
  jobAckEventSchema,
  requestErrorEventSchema,
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
export type RequestErrorEvent = z.infer<typeof requestErrorEventSchema>;
