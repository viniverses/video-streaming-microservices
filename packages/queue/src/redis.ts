import { Redis, type RedisOptions } from 'ioredis';

export const createRedisConnection = (target: string | RedisOptions): Redis => {
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  return typeof target === 'string'
    ? new Redis(target, baseOptions)
    : new Redis({ ...baseOptions, ...target });
};
