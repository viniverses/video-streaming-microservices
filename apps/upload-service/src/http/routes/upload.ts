import { randomUUID } from 'node:crypto';

import { EVENT, parseOriginalUploadKey, s3Keys } from '@repo/contracts';
import { Elysia, status, t } from 'elysia';

import { broker } from '../../broker/broker.ts';
import { storage } from '../../infra/storage.ts';

export const uploadRoutes = (app: Elysia) => {
  return app.group('/upload', (app) =>
    app
      .onError(({ error }) => {
        console.error('Error', error);
        return status(500, {
          message: 'Internal server error',
        });
      })
      .post('/request', async ({ status }) => {
        const videoId = randomUUID();
        const key = s3Keys.originalUpload(videoId);

        const contentType = 'video/mp4';
        const presignedUploadUrl = await storage.getPresignedUploadUrl({
          key,
          contentType,
        });

        return status(201, {
          videoId,
          bucket: storage.getDefaultBucket(),
          key,
          presignedUploadUrl,
          contentType,
        });
      })
      .post(
        '/webhook',
        async ({ body }) => {
          const { key, videoId } = body;

          console.log('Webhook received', body);

          const parsed = parseOriginalUploadKey(key);
          if (!parsed || parsed.videoId !== videoId) {
            console.log(
              '[webhook] Ignoring non-original upload key or videoId mismatch:',
              key
            );
            return status(204);
          }

          await broker.publish(EVENT.VIDEO_UPLOADED, {
            bucket: storage.getDefaultBucket(),
            key,
            videoId,
            sourceUrl: await storage.getPresignedDownloadUrl({ key }),
          });
        },
        {
          body: t.Object({
            key: t.String(),
            videoId: t.String(),
          }),
        }
      )
  );
};
