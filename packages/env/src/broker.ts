import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const brokerEnv = createEnv({
  server: {
    BROKER_URL: z.string().url(),
    BROKER_EXCHANGE: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
