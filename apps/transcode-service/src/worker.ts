import {
  BULLMQ_QUEUES,
  type EncodeJobData,
  type TranscodeChildResult,
} from '@repo/contracts';
import { createProcessingStepWorker } from '@repo/queue';

import { broker } from '@/broker/broker.ts';
import { redis } from '@/lib/redis.ts';
import { videoTranscodeJob } from '@/job.ts';

export const worker = createProcessingStepWorker<
  EncodeJobData,
  TranscodeChildResult
>({
  queueName: BULLMQ_QUEUES.ENCODE,
  processor: videoTranscodeJob,
  connection: redis,
  dispatch: (name, payload) => broker.publish(name, payload),
  concurrency: 3,
  buildStartedPayload: (job) => ({
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'in_progress',
    message: `Encoding started at ${job.data.resolution}p`,
    resolution: job.data.resolution,
  }),
  buildCompletedPayload: (job) => ({
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'completed',
    message: `Encoding completed at ${job.data.resolution}p`,
    resolution: job.data.resolution,
  }),
  buildFailedPayload: (job, err) => ({
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'failed',
    message: `Encoding failed at ${job.data.resolution}p`,
    resolution: job.data.resolution,
    error: err.message,
  }),
});
