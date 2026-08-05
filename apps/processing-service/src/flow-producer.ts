import { createFlowProducer } from '@repo/queue';

import { redis } from './lib/redis.ts';

export const flowProducer = createFlowProducer(redis);
