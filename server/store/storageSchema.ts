import { z } from 'zod';
import { jobSchema } from '@/shared/protocol/index.js';

export const storedBoardsSchema = z.object({
  formatVersion: z.literal(1),
  rooms: z.array(
    z.object({
      name: z.string().min(1),
      jobs: z.array(jobSchema),
      processedCreateRequests: z.array(z.tuple([z.string(), jobSchema])),
      processedUpdateRequests: z.array(z.string()),
    }),
  ),
});

export type StoredBoards = z.infer<typeof storedBoardsSchema>;
