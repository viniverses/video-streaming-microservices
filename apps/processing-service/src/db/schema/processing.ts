import {
  PROCESSING_STATUSES,
  type ProcessingPipelineResult,
} from '@repo/contracts';
import { jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ProcessingStatus = pgEnum(
  'processing_status',
  PROCESSING_STATUSES
);

export const processing = pgTable('processing', {
  id: uuid().notNull().primaryKey(),
  videoId: uuid().notNull().unique(),
  status: ProcessingStatus('status').notNull().default('pending'),
  result: jsonb('result').$type<ProcessingPipelineResult>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
});
