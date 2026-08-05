import {
  BULLMQ_QUEUES,
  EVENT,
  type ProcessingJobData,
  type ProcessingPipelineResult,
} from '@repo/contracts';
import { type Job, Worker } from '@repo/queue';

import { broker } from './broker/broker.ts';
import { finishProcessing } from './db/repositories/processing-repository.ts';
import { aggregateProcessingResults } from './lib/aggregate-processing-results.ts';
import { redis } from './lib/redis.ts';

type OrchestratorJob = Job<ProcessingJobData, ProcessingPipelineResult, string>;

const getPipelineResult = async (
  job: OrchestratorJob
): Promise<ProcessingPipelineResult> => {
  const failedChildren = await job.getIgnoredChildrenFailures();

  if (Object.keys(failedChildren).length > 0) {
    await job.removeUnprocessedChildren();
    return aggregateProcessingResults(job.data.videoId, {}, failedChildren);
  }

  const childrenValues = await job.getChildrenValues<unknown>();
  return aggregateProcessingResults(job.data.videoId, childrenValues);
};

const publishResult = async (result: ProcessingPipelineResult) => {
  const routingKey =
    result.status === 'completed'
      ? EVENT.PROCESSING_COMPLETED
      : EVENT.PROCESSING_FAILED;

  await broker.publish(routingKey, result);
};

export const worker = new Worker<ProcessingJobData, ProcessingPipelineResult>(
  BULLMQ_QUEUES.ORCHESTRATOR,
  async (job) => {
    console.log('Processing orchestrator job:', job.data.videoId);

    const result = await getPipelineResult(job);
    const persisted = await finishProcessing(result);

    if (persisted.shouldPublish) {
      await publishResult(persisted.result);
    }

    return persisted.result;
  },
  {
    connection: redis,
  }
);

worker.on('error', (err) => {
  console.error('Error in orchestrator worker:', err);
});

worker.on('failed', (job) => {
  if (!job) return;

  const attempts = job.opts.attempts ?? 1;
  const exhausted = job.attemptsMade >= attempts;

  console.error('Orchestrator attempt failed', {
    videoId: job.data.videoId,
    attempt: job.attemptsMade,
    attempts,
    exhausted,
    error: job.failedReason,
  });
});
