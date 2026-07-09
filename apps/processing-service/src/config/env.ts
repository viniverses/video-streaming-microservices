import {
  brokerEnvSchema,
  databaseEnvSchema,
  httpEnvSchema,
  parseEnv,
  redisEnvSchema,
  storageEnvSchema,
} from '@repo/env';

export const env = parseEnv({
  ...brokerEnvSchema,
  ...databaseEnvSchema,
  ...httpEnvSchema,
  ...redisEnvSchema,
  ...storageEnvSchema,
});
