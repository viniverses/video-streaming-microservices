import 'dotenv/config';

import { brokerEnv } from '@repo/env/broker';
import { storageEnv } from '@repo/env/storage';
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  extends: [brokerEnv, storageEnv],
  server: {
    CORS_ORIGIN: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3333),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
