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

import { createStorageClient } from './client.ts';

type StorageWithClientConfig = {
  client: S3Client;
  defaultBucket: string;
  region: string;
  endpoint?: string;
  publicBaseUrl?: string;
};

type StorageCredentialsConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  bucket: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
};

export type StorageConfig = StorageWithClientConfig | StorageCredentialsConfig;

export interface UploadStream {
  pass: Writable;
  uploadPromise: Promise<void>;
  abort: () => Promise<void>;
}

export interface StoragePort {
  createS3UploadStream(
    key: string,
    contentType: string,
    bucket?: string
  ): UploadStream;
  downloadToFile(key: string, outputPath: string, bucket?: string): Promise<void>;
  getDefaultBucket(): string;
  getPresignedDownloadUrl(options: {
    bucket?: string;
    key: string;
    expiresIn?: number;
  }): Promise<string>;
  getPresignedUploadUrl(options: {
    bucket?: string;
    key: string;
    contentType?: string;
    expiresIn?: number;
  }): Promise<string>;
  getPublicUrl(key: string, bucket?: string): string;
}

export const createStorage = (config: StorageConfig): StoragePort => {
  const client =
    'client' in config ? config.client : createStorageClient(config);
  const defaultBucket =
    'client' in config ? config.defaultBucket : config.bucket;
  const { endpoint, publicBaseUrl, region } = config;
  const resolveBucket = (bucket?: string) => bucket ?? defaultBucket;

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
      client,
      new PutObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn }
    );
  };

  const getPresignedDownloadUrl = async ({
    bucket,
    key,
    expiresIn = 3600,
  }: {
    bucket?: string;
    key: string;
    expiresIn?: number;
  }) => {
    const resolvedBucket = resolveBucket(bucket);
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
      }),
      { expiresIn }
    );
  };

  const getPublicUrl = (key: string, bucket?: string): string => {
    const resolvedBucket = resolveBucket(bucket);
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${encodedKey}`;
    }

    return endpoint
      ? `${endpoint}/${resolvedBucket}/${encodedKey}`
      : `https://${resolvedBucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  };

  const createS3UploadStream = (
    key: string,
    contentType: string,
    bucket?: string
  ): UploadStream => {
    const resolvedBucket = resolveBucket(bucket);
    const pass = new PassThrough();
    const upload = new Upload({
      client,
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
    const response = await client.send(
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
    getDefaultBucket: () => defaultBucket,
    getPresignedDownloadUrl,
    getPresignedUploadUrl,
    getPublicUrl,
  };
};

export type Storage = StoragePort;
