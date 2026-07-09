import { EVENT } from '@repo/contracts';
import type { Processor } from 'bullmq';

import {
  type LifecycleHooks,
  type ProcessingEventDispatcher,
} from './types.ts';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const safeDispatch = async (
  dispatch: ProcessingEventDispatcher,
  ...[routingKey, payload]: Parameters<ProcessingEventDispatcher>
): Promise<void> => {
  try {
    await dispatch(routingKey, payload);
  } catch (dispatchError) {
    console.error(
      `[processing-lifecycle] Failed to dispatch "${String(routingKey)}"`,
      dispatchError
    );
  }
};

export const withProcessingLifecycle = <TData, TResult>(
  processor: Processor<TData, TResult, string>,
  dispatch: ProcessingEventDispatcher,
  hooks: LifecycleHooks<TData, TResult>
): Processor<TData, TResult, string> => {
  return async (job, token) => {
    await safeDispatch(
      dispatch,
      EVENT.PROCESSING_STEP_STARTED,
      hooks.buildStartedPayload(job)
    );

    try {
      const result = await processor(job, token);

      await safeDispatch(
        dispatch,
        EVENT.PROCESSING_STEP_COMPLETED,
        hooks.buildCompletedPayload(job, result)
      );

      return result;
    } catch (rawError) {
      const error = toError(rawError);

      await safeDispatch(
        dispatch,
        EVENT.PROCESSING_STEP_FAILED,
        hooks.buildFailedPayload(job, error)
      );

      throw error;
    }
  };
};
