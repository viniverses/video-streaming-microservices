import {
  brokerEnvSchema,
  httpEnvSchema,
  parseEnv,
  storageEnvSchema,
} from '@repo/env';

export const env = parseEnv({
  ...brokerEnvSchema,
  ...httpEnvSchema,
  ...storageEnvSchema,
});
