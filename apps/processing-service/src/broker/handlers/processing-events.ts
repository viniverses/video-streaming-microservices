import type { ProcessingEventByRoutingKey } from '@repo/contracts';
import { EVENT } from '@repo/contracts';

import { appendProcessingStepLog } from '../../db/repositories/processing-log-repository.ts';

type ProcessingStepEvent =
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_STARTED]
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_COMPLETED]
  | ProcessingEventByRoutingKey[typeof EVENT.PROCESSING_STEP_FAILED];

export const handleProcessingStepEvent = async (event: ProcessingStepEvent) => {
  await appendProcessingStepLog(event);

  const payload = event.payload;
  const context = {
    eventId: event.metadata.messageId,
    videoId: payload.videoId,
    step: payload.step,
    status: payload.status,
    ...('resolution' in payload ? { resolution: payload.resolution } : {}),
    ...('error' in payload ? { error: payload.error } : {}),
  };

  if (payload.status === 'failed') {
    console.error('Processing step failed', context);
    return;
  }

  console.log('Processing step event consumed', context);
};
