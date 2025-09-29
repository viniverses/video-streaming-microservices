import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { videoMetadataJob } from '@/job.ts';
import { dispatchProcessingEvent } from '@/broker/dispatch.ts';
import type { ProcessingStepStatus } from '../../contracts/messages/processing-step-status.ts';
import { EVENTS } from './events.ts';

const QUEUE_NAME = 'processing.metadata.queue' as const;

export const worker = new Worker(QUEUE_NAME, videoMetadataJob, {
  connection: redis,
  concurrency: 2,
});

worker.on('completed', (job) => {
  console.log(`Metadata generated for video ${job.data.videoId}`);

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'completed',
    data: job.returnvalue.metadata,
    timestamp: new Date().toISOString(),
  };

  dispatchProcessingEvent(EVENTS.PROCESSING_STEP_COMPLETED, message);
});

worker.on('error', (err) => {
  console.error('Error in metadata worker:', err);
});

worker.on('active', async (job) => {
  console.log(`Processing metadata for video: ${job.data.videoId}`);

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'in_progress',
    message: 'Processing metadata started',
    timestamp: new Date().toISOString(),
  };

  dispatchProcessingEvent(EVENTS.PROCESSING_STEP_STARTED, message);
});

worker.on('failed', async (job, err) => {
  console.error(
    `Failed to generate metadata for video ${job?.data.videoId}: ${err.message}`
  );

  if (!job) return;

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'metadata',
    status: 'failed',
    message: 'Failed to generate metadata',
    error: err.message,
    timestamp: new Date().toISOString(),
  };

  // Check if job reached maximum retry attempts
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    console.log(
      `Job ${job.id} reached maximum retry attempts (${job.attemptsMade}). Updating main processing status to failed.`
    );

    // Dispatch event to update main processing record to failed
    dispatchProcessingEvent(EVENTS.PROCESSING_FAILED, {
      videoId: job.data.videoId,
      step: 'metadata',
      status: 'failed',
      message: `Processing failed after maximum retry attempts for video ${job.data.videoId}`,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  dispatchProcessingEvent(EVENTS.PROCESSING_STEP_FAILED, message);
});

function handleShutdown() {
  worker.close();
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
