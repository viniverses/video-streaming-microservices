import { createRedisConnection } from '@repo/queue';

import { env } from '../../env.ts';

export const redis = createRedisConnection(env.REDIS_URL);
