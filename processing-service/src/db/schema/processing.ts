import { pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ProcessingStatus = pgEnum('processing_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

export const processing = pgTable('processing', {
  id: uuid().notNull().primaryKey(),
  videoId: uuid().notNull(),
  status: ProcessingStatus('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
});
