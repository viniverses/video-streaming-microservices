import { RabbitMQDomainBroker } from '@repo/broker';

import { env } from '../config/env.ts';

export const broker = new RabbitMQDomainBroker({
  url: env.BROKER_URL,
  exchange: env.BROKER_EXCHANGE,
  producer: 'upload-service',
});
