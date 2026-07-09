import { parseOriginalUploadKey } from '@repo/contracts';
import type { Context, S3Event } from 'aws-lambda';

const defaultWebhookUrl = 'http://host.docker.internal:3333/upload/webhook';

export const handler = async (
  event: S3Event,
  context: Context
): Promise<void> => {
  console.log('Upload notifier lambda function called', context);

  const webhookBase =
    process.env.UPLOAD_SERVICE_WEBHOOK_URL ?? defaultWebhookUrl;
  const webhookUrl = webhookBase.endsWith('/upload/webhook')
    ? webhookBase
    : `${webhookBase.replace(/\/$/, '')}/upload/webhook`;

  for (const record of event.Records) {
    const rawKey = record.s3.object.key;
    const parsed = parseOriginalUploadKey(rawKey);
    if (!parsed) {
      console.log('[upload-notifier] Skipping non-original key:', rawKey);
      continue;
    }

    const body = {
      bucket: record.s3.bucket.name,
      key: parsed.key,
      videoId: parsed.videoId,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to notify upload service: ${response.status} ${response.statusText}`
      );
    }

    console.log('Upload service notified', response.status);
  }
};
