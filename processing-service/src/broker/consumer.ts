import type { UploadFinished } from '../../../contracts/messages/upload-finished.ts';
import { channels } from './channels/index.ts';
import { EVENTS } from './events.ts';
import { videoMetadataQueue } from '@/queues/video-metadata.ts';
import { videoThumbnailQueue } from '@/queues/video-thumbnail.ts';
import { videoTranscodeQueue } from '@/queues/video-transcode.ts';

const RESOLUTIONS = ['1080', '720', '480'] as const;

export async function processUploadFinished(
  data: UploadFinished
): Promise<void> {
  const { videoId, path } = data;

  await videoMetadataQueue.add('videos.metadata', { videoId, path });
  await videoThumbnailQueue.add('videos.thumbnail', { videoId, path });

  for (const height of RESOLUTIONS) {
    await videoTranscodeQueue.add('videos.transcode', {
      videoId,
      path,
      height,
    });
  }
}

channels.uploads.consume(
  'uploads',
  async (message) => {
    if (message?.content) {
      const routingKey = message.fields.routingKey;

      try {
        if (routingKey === EVENTS.UPLOAD_FINISHED) {
          const data = JSON.parse(message.content.toString());
          await processUploadFinished(data as UploadFinished);
        }
        channels.uploads.ack(message);
      } catch (error) {
        console.error(error);
        channels.uploads.nack(message, false, false);
      }
    }
  },
  {
    noAck: false,
  }
);
