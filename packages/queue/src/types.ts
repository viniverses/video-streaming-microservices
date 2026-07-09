import {
  EVENT,
  type EventMap,
  type ProcessingEventPayloadByRoutingKey,
  type ProcessingEventRoutingKey,
} from '@repo/contracts';
import type { Job } from 'bullmq';

export type ProcessingJob<TData, TResult> = Job<TData, TResult, string>;

export type ProcessingEventDispatcher = <
  TKey extends ProcessingEventRoutingKey,
>(
  routingKey: TKey,
  payload: EventMap[TKey]
) => Promise<void>;

export type PayloadBuilder<
  TData,
  TResult,
  TKey extends keyof ProcessingEventPayloadByRoutingKey,
  TExtraArgs extends unknown[] = [],
> = (
  job: ProcessingJob<TData, TResult>,
  ...extra: TExtraArgs
) => ProcessingEventPayloadByRoutingKey[TKey];

export type LifecycleHooks<TData, TResult> = {
  buildStartedPayload: PayloadBuilder<
    TData,
    TResult,
    typeof EVENT.PROCESSING_STEP_STARTED
  >;
  buildCompletedPayload: PayloadBuilder<
    TData,
    TResult,
    typeof EVENT.PROCESSING_STEP_COMPLETED,
    [result: TResult]
  >;
  buildFailedPayload: PayloadBuilder<
    TData,
    TResult,
    typeof EVENT.PROCESSING_STEP_FAILED,
    [error: Error]
  >;
};
