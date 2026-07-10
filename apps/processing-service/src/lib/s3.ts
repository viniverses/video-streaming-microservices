import { createStorage } from '@repo/storage';

import { env } from '../config/env.ts';

export const storage = createStorage({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  endpoint: env.AWS_ENDPOINT_URL,
  bucket: env.AWS_S3_BUCKET,
});
