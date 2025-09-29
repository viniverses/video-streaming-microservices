import { broker } from '../broker.ts';
import { EVENTS } from '../events.ts';

export const processing = await broker.createChannel();

await processing.assertQueue('processing');

await processing.assertExchange('processing.events', 'topic', {
  durable: true,
});

await processing.bindQueue(
  'processing',
  'processing.events',
  EVENTS.PROCESSING_STEP_STARTED
);

await processing.bindQueue(
  'processing',
  'processing.events',
  EVENTS.PROCESSING_STEP_COMPLETED
);

await processing.bindQueue(
  'processing',
  'processing.events',
  EVENTS.PROCESSING_STEP_FAILED
);

await processing.bindQueue(
  'processing',
  'processing.events',
  EVENTS.PROCESSING_FAILED
);
