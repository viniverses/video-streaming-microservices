import {
  BULLMQ_QUEUES,
  type ProcessingJobData,
  processingJobIds,
  RENDITION_HEIGHTS,
} from '@repo/contracts';
import type { FlowChildJob } from '@repo/queue';

import { flowProducer } from './flow-producer.ts';

const PROCESSING_JOB_ATTEMPTS = 3;
const PROCESSING_JOB_BACKOFF = {
  type: 'exponential' as const,
  delay: 1000,
};

const processingJobOpts = {
  attempts: PROCESSING_JOB_ATTEMPTS,
  backoff: PROCESSING_JOB_BACKOFF,
  continueParentOnFailure: true,
};

export async function createProcessingFlow(data: ProcessingJobData) {
  console.log('Creating processing flow...');

  const jobs: FlowChildJob[] = [
    {
      name: 'metadata-job',
      queueName: BULLMQ_QUEUES.METADATA,
      data,
      opts: {
        ...processingJobOpts,
        jobId: processingJobIds.metadata(data.videoId),
      },
    },
    ...RENDITION_HEIGHTS.map((resolution) => ({
      name: 'encode-job',
      queueName: BULLMQ_QUEUES.ENCODE,
      data: {
        ...data,
        resolution,
      },
      opts: {
        ...processingJobOpts,
        jobId: processingJobIds.encode(data.videoId, resolution),
      },
    })),
  ];

  const flow = await flowProducer.add({
    name: 'process-content',
    queueName: BULLMQ_QUEUES.ORCHESTRATOR,
    data,
    opts: {
      attempts: PROCESSING_JOB_ATTEMPTS,
      backoff: PROCESSING_JOB_BACKOFF,
      jobId: processingJobIds.orchestrator(data.videoId),
    },
    children: jobs,
  });

  return flow;
}
