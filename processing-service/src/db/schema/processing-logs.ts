import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const LogStatus = pgEnum('log_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

export const processingLogs = pgTable('processing_logs', {
  id: uuid('id').primaryKey(),
  videoId: uuid().notNull(),
  step: text().notNull(),
  status: LogStatus('status').notNull().default('pending'),
  message: text('message'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
