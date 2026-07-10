import {
  BULLMQ_QUEUES,
  type MetadataChildResult,
  type ProcessingJobData,
} from '@repo/contracts';
import { createProcessingStepWorker } from '@repo/queue';

import { broker } from '@/broker/broker.ts';
import { videoMetadataJob } from '@/job.ts';
import { redis } from '@/lib/redis.ts';

export const worker = createProcessingStepWorker<
  ProcessingJobData,
  MetadataChildResult
>({
  queueName: BULLMQ_QUEUES.METADATA,
  processor: videoMetadataJob,
  connection: redis,
  dispatch: (name, payload) => broker.publish(name, payload),
  concurrency: 2,
  buildStartedPayload: (job) => ({
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'in_progress',
    message: 'Metadata started',
  }),
  buildCompletedPayload: (job, result) => ({
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'completed',
    message: 'Metadata completed',
    data: result.metadata,
  }),
  buildFailedPayload: (job, err) => ({
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'failed',
    message: 'Metadata failed',
    error: err.message,
  }),
});
