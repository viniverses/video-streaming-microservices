import {
  brokerEnvSchema,
  parseEnv,
  redisEnvSchema,
  storageEnvSchema,
} from '@repo/env';

export const env = parseEnv({
  ...brokerEnvSchema,
  ...redisEnvSchema,
  ...storageEnvSchema,
});
