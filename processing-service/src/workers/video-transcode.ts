import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { videoTranscodeJob } from '@/jobs/video-transcode.ts';

export const videoTranscodeWorker = new Worker(
  'videos.transcode',
  videoTranscodeJob,
  {
    connection: redis,
    concurrency: 1,
    lockDuration: 1800000,
    maxStalledCount: 5,
  }
);

videoTranscodeWorker.on('completed', (job) => {
  console.log('--------------------------------------------------');
  console.log(
    `Transcodificação gerada para o vídeo ${job.data.videoId}: ${job.returnvalue.key}`
  );
});

videoTranscodeWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});
