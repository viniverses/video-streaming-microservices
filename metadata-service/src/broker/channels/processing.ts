import { broker } from '../broker.ts';

export const processing = await broker.createChannel();

await processing.assertExchange('processing.events', 'topic', {
  durable: true,
});
