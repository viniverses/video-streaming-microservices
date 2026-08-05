import { Elysia, t } from 'elysia';

import {
  findByVideoId,
  getStatusWithLogs,
} from '@/db/repositories/processing-repository.ts';
import { buildVideoResult } from '@/http/lib/build-video-result.ts';

export const processingRoutes = (app: Elysia) =>
  app.group('/processing', (app) =>
    app
      .get(
        '/:videoId/result',
        async ({ params }) => {
          const { videoId } = params;
          const record = await findByVideoId(videoId);

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
        async ({ params }) => getStatusWithLogs(params.videoId),
        {
          params: t.Object({
            videoId: t.String({ format: 'uuid' }),
          }),
        }
      )
  );
