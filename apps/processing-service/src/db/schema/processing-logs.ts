import { PROCESSING_STATUSES, PROCESSING_STEPS } from '@repo/contracts';
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const LogStatus = pgEnum('log_status', PROCESSING_STATUSES);

export const Steps = pgEnum('steps', PROCESSING_STEPS);

export const processingLogs = pgTable('processing_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().unique(),
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
