import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { videoTranscodeJob } from '@/job.ts';
import { dispatchProcessingEvent } from '@/broker/dispatch.ts';
import type { ProcessingStepStatus } from '../../contracts/messages/processing-step-status.ts';
import { EVENTS } from './events.ts';

const QUEUE_NAME = 'processing.encode.queue' as const;

export const worker = new Worker<{
  videoId: string;
  url: string;
  resolution: number;
}>(QUEUE_NAME, videoTranscodeJob, {
  connection: redis,
  concurrency: 3,
});

worker.on('completed', (job) => {
  console.log(
    `Transcode generated for video ${job.data.videoId} at ${job.data.resolution}p`
  );

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'completed',
    resolution: job.data.resolution,
    timestamp: new Date().toISOString(),
  };

  dispatchProcessingEvent(EVENTS.PROCESSING_STEP_COMPLETED, message);
});

worker.on('error', (err) => {
  console.error('Error in transcode worker:', err);
});

worker.on('active', async (job) => {
  console.log(
    `Processing transcode for video: ${job.data.videoId} at ${job.data.resolution}p`
  );

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'in_progress',
    message: `Processing transcode for video ${job.data.videoId} at ${job.data.resolution}p started`,
    resolution: job.data.resolution,
    timestamp: new Date().toISOString(),
  };

  dispatchProcessingEvent(EVENTS.PROCESSING_STEP_STARTED, message);
});

worker.on('failed', async (job, err) => {
  console.error(
    `Failed to generate transcode for video ${job?.data.videoId} at ${job?.data.resolution}p: ${err.message}`
  );

  if (!job) return;

  const message: ProcessingStepStatus = {
    videoId: job.data.videoId,
    step: 'transcode',
    status: 'failed',
    resolution: job.data.resolution,
    message: `Failed to generate transcode for video ${job.data.videoId} at ${job.data.resolution}p`,
    error: err.message,
    timestamp: new Date().toISOString(),
  };

  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    console.log(
      `Job ${job.id} reached maximum retry attempts (${job.attemptsMade}). Updating main processing status to failed for video ${job.data.videoId} at ${job.data.resolution}p.`
    );

    dispatchProcessingEvent(EVENTS.PROCESSING_FAILED, {
      videoId: job.data.videoId,
      step: 'transcode',
      status: 'failed',
      message: `Processing failed after maximum retry attempts for video ${job.data.videoId} at ${job.data.resolution}p`,
      error: err.message,
      resolution: job.data.resolution,
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
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===', error);
});

process.on('unhandledRejection', () => {});
