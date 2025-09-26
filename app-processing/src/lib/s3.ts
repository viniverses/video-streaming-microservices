import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'node:stream';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION || 'sa-east-1';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function getPresignedUploadUrl(
  key: string,
  contentType = 'application/octet-stream',
  expiresIn = 3600
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function objectExists(key: string) {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    await s3Client.send(command);
    return true;
    /* eslint-disable  @typescript-eslint/no-explicit-any */
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }

    throw error;
  }
}

export function getPublicUrlForKey(key: string) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export function createS3UploadStream(key: string, contentType?: string) {
  const pass = new PassThrough();

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: pass,
      ...(contentType ? { ContentType: contentType } : {}),
    },
  });

  const donePromise = upload.done();

  return { pass, uploadPromise: donePromise };
}
