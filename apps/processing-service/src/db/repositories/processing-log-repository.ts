import type { EVENT, ProcessingEventByRoutingKey } from '@repo/contracts';

import { db } from '../client.ts';
import { processingLogs } from '../schema/processing-logs.ts';

type ProcessingStepEvent =
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_STARTED]
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_COMPLETED]
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_FAILED];

export const appendProcessingStepLog = async (event: ProcessingStepEvent) => {
  const payload = event.payload;

  await db
    .insert(processingLogs)
    .values({
      eventId: event.metadata.messageId,
      videoId: payload.videoId,
      step: payload.step,
      status: payload.status,
      message: payload.message,
      resolution: 'resolution' in payload ? payload.resolution : undefined,
      data: 'data' in payload ? payload.data : undefined,
      error: 'error' in payload ? payload.error : undefined,
      timestamp: new Date(event.metadata.occurredAt),
    })
    .onConflictDoNothing({ target: processingLogs.eventId });
};
