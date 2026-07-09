import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

import { db } from '@/db/client.ts';
import { processing } from '@/db/schema/processing.ts';
import { buildVideoResult } from '@/http/lib/build-video-result.ts';
import { getProcessingStatus } from '@/lib/get-processing-status.ts';

export const processingRoutes = (app: Elysia) =>
  app.group('/processing', (app) =>
    app
      .get(
        '/:videoId/result',
        async ({ params }) => {
          const { videoId } = params;

          const [record] = await db
            .select()
            .from(processing)
            .where(eq(processing.videoId, videoId))
            .limit(1);

          return buildVideoResult(videoId, record);
        },
        {
          params: t.Object({
            videoId: t.String({ format: 'uuid' }),
          }),
        }
      )
      .get(
        '/:videoId',
        async ({ params }) => getProcessingStatus(params.videoId),
        {
          params: t.Object({
            videoId: t.String({ format: 'uuid' }),
          }),
        }
      )
  );
