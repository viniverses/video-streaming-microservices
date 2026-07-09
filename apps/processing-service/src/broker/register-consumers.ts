import type { Unsubscribe } from '@repo/broker';
import { EVENT } from '@repo/contracts';

import { broker } from './broker.ts';
import { handleProcessingStepEvent } from './handlers/processing-events.ts';
import { handleVideoUploaded } from './handlers/upload-events.ts';

export const registerConsumers = async (): Promise<Unsubscribe[]> =>
  Promise.all([
    broker.subscribe(EVENT.VIDEO_UPLOADED, handleVideoUploaded, {
      consumerName: 'processing-uploads',
    }),
    broker.subscribe(EVENT.PROCESSING_STEP_STARTED, handleProcessingStepEvent, {
      consumerName: 'processing-audit',
    }),
    broker.subscribe(
      EVENT.PROCESSING_STEP_COMPLETED,
      handleProcessingStepEvent,
      {
        consumerName: 'processing-audit',
      }
    ),
    broker.subscribe(EVENT.PROCESSING_STEP_FAILED, handleProcessingStepEvent, {
      consumerName: 'processing-audit',
    }),
  ]);
