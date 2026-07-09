import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PassThrough, Readable, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageConfig = {
  client: S3Client;
  defaultBucket: string;
  region: string;
  endpoint?: string;
};

export interface UploadStream {
  pass: Writable;
  uploadPromise: Promise<void>;
  abort: () => Promise<void>;
}

export const createStorage = (config: StorageConfig) => {
  const resolveBucket = (bucket?: string) => bucket ?? config.defaultBucket;

  const getPresignedUploadUrl = async ({
    bucket,
    key,
    contentType = 'video/mp4',
    expiresIn = 3600,
  }: {
    bucket?: string;
    key: string;
    contentType?: string;
    expiresIn?: number;
  }) => {
    const resolvedBucket = resolveBucket(bucket);
    return getSignedUrl(
      config.client,
      new PutObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn }
    );
  };

  const getPublicUrl = (key: string, bucket?: string): string => {
    const resolvedBucket = resolveBucket(bucket);
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return config.endpoint
      ? `${config.endpoint}/${resolvedBucket}/${encodedKey}`
      : `https://${resolvedBucket}.s3.${config.region}.amazonaws.com/${encodedKey}`;
  };

  const createS3UploadStream = (
    key: string,
    contentType: string,
    bucket?: string
  ): UploadStream => {
    const resolvedBucket = resolveBucket(bucket);
    const pass = new PassThrough();
    const upload = new Upload({
      client: config.client,
      params: {
        Bucket: resolvedBucket,
        Key: key,
        Body: pass,
        ContentType: contentType,
      },
    });
    const abort = async () => {
      pass.destroy(new Error('Upload aborted'));
      await upload.abort().catch(() => undefined);
    };
    const uploadPromise = upload.done().then(() => undefined);
    return { pass, uploadPromise, abort };
  };

  const downloadToFile = async (
    key: string,
    outputPath: string,
    bucket?: string
  ) => {
    const resolvedBucket = resolveBucket(bucket);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const response = await config.client.send(
      new GetObjectCommand({ Bucket: resolvedBucket, Key: key })
    );
    if (!(response.Body instanceof Readable)) {
      throw new Error(`S3 object ${key} did not return a Node.js stream`);
    }
    await pipeline(response.Body, createWriteStream(outputPath));
  };

  return {
    createS3UploadStream,
    downloadToFile,
    getDefaultBucket: () => config.defaultBucket,
    getPresignedUploadUrl,
    getPublicUrl,
  };
};

export type Storage = ReturnType<typeof createStorage>;
