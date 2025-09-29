import { channels } from '@/broker/channels/index.ts';
import { ProcessingStepStatus } from '../../../contracts/messages/processing-step-status.ts';

export async function dispatchProcessingEvent(
  routingKey: string,
  payload: ProcessingStepStatus
) {
  const content = Buffer.from(JSON.stringify(payload));

  channels.processing.publish('processing.events', routingKey, content);
}
