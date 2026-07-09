import { type Processor, Worker, type WorkerOptions } from 'bullmq';
import type { Redis } from 'ioredis';

import { withProcessingLifecycle } from './processing-lifecycle.ts';
import {
  type LifecycleHooks,
  type ProcessingEventDispatcher,
} from './types.ts';

type CreateProcessingStepWorkerOptions<TData, TResult> = {
  queueName: string;
  processor: Processor<TData, TResult, string>;
  connection: Redis;
  dispatch: ProcessingEventDispatcher;
  concurrency?: number;
} & LifecycleHooks<TData, TResult> &
  Omit<WorkerOptions, 'connection' | 'concurrency'>;

export const createProcessingStepWorker = <TData, TResult>(
  options: CreateProcessingStepWorkerOptions<TData, TResult>
): Worker<TData, TResult, string> => {
  const {
    queueName,
    processor,
    connection,
    dispatch,
    concurrency,
    buildStartedPayload,
    buildCompletedPayload,
    buildFailedPayload,
    ...workerOptions
  } = options;

  const handler = withProcessingLifecycle(processor, dispatch, {
    buildStartedPayload,
    buildCompletedPayload,
    buildFailedPayload,
  });

  const worker = new Worker<TData, TResult, string>(queueName, handler, {
    ...workerOptions,
    connection,
    concurrency: concurrency ?? 1,
  });

  worker.on('error', (error) => {
    console.error(
      `[processing-step-worker] Worker "${queueName}" error`,
      error
    );
  });

  return worker;
};
