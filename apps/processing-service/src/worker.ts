import {
  BULLMQ_QUEUES,
  EVENT,
  type ProcessingJobData,
  type ProcessingPipelineResult,
  processingPipelineResultSchema,
} from '@repo/contracts';
import { type Job, Worker } from '@repo/queue';
import { and, eq } from 'drizzle-orm';

import { broker } from './broker/broker.ts';
import { db } from './db/client.ts';
import { processing } from './db/schema/processing.ts';
import { redis } from './infra/redis.ts';
import { aggregateProcessingResults } from './lib/aggregate-processing-results.ts';

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

const persistResult = async (result: ProcessingPipelineResult) => {
  const now = new Date();
  const [updated] = await db
    .update(processing)
    .set({
      status: result.status,
      result,
      finishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(processing.videoId, result.videoId),
        eq(processing.status, 'in_progress')
      )
    )
    .returning({ result: processing.result });

  if (updated) return { result, shouldPublish: true };

  const [current] = await db
    .select({ status: processing.status, result: processing.result })
    .from(processing)
    .where(eq(processing.videoId, result.videoId))
    .limit(1);

  if (!current) {
    throw new Error(`Processing record not found for video ${result.videoId}`);
  }

  const persisted = processingPipelineResultSchema.safeParse(current.result);
  if (persisted.success) {
    return { result: persisted.data, shouldPublish: true };
  }

  throw new Error(
    `Processing ${result.videoId} is terminal without a valid pipeline result`
  );
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
    const persisted = await persistResult(result);

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
