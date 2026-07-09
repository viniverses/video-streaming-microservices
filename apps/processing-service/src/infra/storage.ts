import { createStorage, createStorageClient } from '@repo/storage';

import { env } from '../config/env.ts';

export const storage = createStorage({
  client: createStorageClient({
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    endpoint: env.AWS_ENDPOINT_URL,
  }),
  defaultBucket: env.AWS_S3_BUCKET,
  region: env.AWS_REGION,
  endpoint: env.AWS_ENDPOINT_URL,
});
