import { RabbitMQDomainBroker } from '@repo/broker';

import { env } from '../config/env.ts';

export const broker = new RabbitMQDomainBroker({
  url: env.BROKER_URL,
  exchange: 'domain.events',
  producer: 'metadata-service',
  queuePrefix: 'video-streaming',
});
