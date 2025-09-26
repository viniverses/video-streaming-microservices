import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { videoMetadataJob } from '@/jobs/video-metadata.ts';

export const videoMetadataWorker = new Worker(
  'videos.metadata',
  videoMetadataJob,
  {
    connection: redis,
    concurrency: 1,
    lockDuration: 600000,
    maxStalledCount: 5,
  }
);

videoMetadataWorker.on('completed', (job) => {
  console.log(`Gerado metadata para o vídeo ${job.data.videoId}`);
});

videoMetadataWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});
