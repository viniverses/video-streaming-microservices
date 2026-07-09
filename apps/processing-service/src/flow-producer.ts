import { createFlowProducer } from '@repo/queue';

import { redis } from './infra/redis.ts';

export const flowProducer = createFlowProducer(redis);
