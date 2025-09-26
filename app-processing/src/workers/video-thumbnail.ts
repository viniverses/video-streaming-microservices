import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { videoThumbnailJob } from '@/jobs/video-thumbnail.ts';

export const videoThumbnailWorker = new Worker(
  'videos.thumbnail',
  videoThumbnailJob,
  {
    connection: redis,
    concurrency: 1,
  }
);

videoThumbnailWorker.on('completed', (job) => {
  console.log('--------------------------------------------------');
  console.log(
    `Thumbnail gerada para o vídeo ${job.data.videoId}: ${job.returnvalue.key}`
  );
});

videoThumbnailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});
