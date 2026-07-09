export {
  PROCESSING_STATUSES,
  PROCESSING_STEPS,
  type ProcessingStatus,
  type ProcessingStep,
  RENDITION_HEIGHTS,
  type RenditionHeight,
} from './domain/processing.ts';
export type {
  EncodeJobData,
  ProcessingJobData,
} from './domain/processing-job.ts';
export {
  type CompletedProcessingPipelineResult,
  completedProcessingPipelineResultSchema,
  type FailedProcessingPipelineResult,
  failedProcessingPipelineResultSchema,
  type MetadataChildResult,
  metadataChildResultSchema,
  type ProcessingChildResult,
  processingChildResultSchema,
  type ProcessingPipelineResult,
  processingPipelineResultSchema,
  type TranscodeChildResult,
  transcodeChildResultSchema,
} from './domain/processing-result.ts';
export type {
  AudioTrackInfo,
  ThumbnailInfo,
  VideoMetadata,
} from './domain/video-metadata.ts';
export { videoMetadataSchema } from './domain/video-metadata.ts';
export {
  type DomainEvent,
  type DomainEventByName,
  EVENT_SCHEMAS,
  type EventMap,
  type EventMetadata,
  eventMetadataSchema,
  PROCESSING_EVENT_SCHEMAS,
  type ProcessingEventByRoutingKey,
  type ProcessingEventPayloadByRoutingKey,
  type ProcessingStepCompletedPayload,
  type ProcessingStepFailedPayload,
  type ProcessingStepStartedPayload,
  UPLOAD_EVENT_SCHEMAS,
  type UploadEventByRoutingKey,
  type UploadEventPayloadByRoutingKey,
  type VideoUploadedPayload,
} from './events/event-schemas.ts';
export { BULLMQ_QUEUES, processingJobIds } from './infra/bullmq.ts';
export { parseOriginalUploadKey, s3Keys } from './infra/s3-keys.ts';
export {
  EVENT,
  type EventName,
  type ProcessingEventRoutingKey,
  type UploadEventRoutingKey,
} from './messaging.ts';
