import { Job } from 'bullmq';

import { generateMultipleThumbnails, getVideoMetadata } from '@/lib/ffmpeg.ts';
import { ProcessingJobData } from '../../contracts/messages/processing-job.ts';
import {
  VideoMetadata,
  ThumbnailInfo,
} from '../../contracts/messages/video-metadata.ts';

export async function videoMetadataJob(
  job: Job<ProcessingJobData>
): Promise<{ videoId: string; metadata: VideoMetadata }> {
  try {
    console.log('Generating metadata for video:', job.data);

    const { videoId, url } = job.data;

    const metadata = await getVideoMetadata(url);
    console.log('Metadata generated for video:', metadata);

    const thumbnails: ThumbnailInfo[] = [];

    if (metadata.duration && metadata.duration > 0) {
      console.log(
        `Gerando 3 thumbnails distribuídos para vídeo de ${metadata.duration}s`
      );

      const thumbnailData = await generateMultipleThumbnails(
        videoId,
        url,
        metadata.duration,
        3
      );

      for (const { timestamp } of thumbnailData) {
        thumbnails.push({
          timestamp,
          url: `videos/${videoId}/thumbnails/${Date.now()}_${timestamp.toFixed(2)}.jpg`,
        });
      }

      console.log('Múltiplos thumbnails gerados:', thumbnails);
    }

    const metadataWithThumbnails: VideoMetadata = {
      ...metadata,
      thumbnails,
    };

    return { videoId, metadata: metadataWithThumbnails };
  } catch (error) {
    console.error('Error generating metadata for video:', error);
    throw error;
  }
}
