import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const storageEnv = createEnv({
  server: {
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_ENDPOINT_URL: z.string().url().optional(),
    AWS_S3_BUCKET: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
