export const EVENT = {
  VIDEO_UPLOADED: 'video.uploaded',
  PROCESSING_STEP_STARTED: 'processing.step.started',
  PROCESSING_STEP_COMPLETED: 'processing.step.completed',
  PROCESSING_STEP_FAILED: 'processing.step.failed',
  PROCESSING_COMPLETED: 'processing.completed',
  PROCESSING_FAILED: 'processing.failed',
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];

export type UploadEventRoutingKey = typeof EVENT.VIDEO_UPLOADED;

export type ProcessingEventRoutingKey =
  | typeof EVENT.PROCESSING_STEP_STARTED
  | typeof EVENT.PROCESSING_STEP_COMPLETED
  | typeof EVENT.PROCESSING_STEP_FAILED
  | typeof EVENT.PROCESSING_COMPLETED
  | typeof EVENT.PROCESSING_FAILED;
