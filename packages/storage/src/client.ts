import { S3Client } from '@aws-sdk/client-s3';

export type StorageClientConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
};

export const createStorageClient = (config: StorageClientConfig) =>
  new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint && {
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? true,
    }),
  });
