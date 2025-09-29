import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const LogStatus = pgEnum('log_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

export const Steps = pgEnum('steps', ['thumbnail', 'metadata', 'transcode']);

export const processingLogs = pgTable('processing_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid().notNull(),
  step: Steps('step').notNull(),
  status: LogStatus('status').notNull().default('pending'),
  message: text('message'),
  data: jsonb('data'),
  error: text('error'),
  resolution: integer('resolution'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
