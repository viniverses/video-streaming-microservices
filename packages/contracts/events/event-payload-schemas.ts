import { z } from 'zod';

import {
  isRenditionHeight,
  type RenditionHeight,
} from '../domain/processing.ts';
import {
  completedProcessingPipelineResultSchema,
  failedProcessingPipelineResultSchema,
} from '../domain/processing-result.ts';
import { videoMetadataSchema } from '../domain/video-metadata.ts';
import { EVENT } from '../messaging.ts';

const videoIdSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const renditionHeightSchema = z.custom<RenditionHeight>(
  isRenditionHeight,
  'Unsupported rendition height'
);

const stepPayloadBaseSchema = z
  .object({
    videoId: videoIdSchema,
    message: nonEmptyStringSchema.optional(),
  })
  .strict();

const metadataStartedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('metadata'),
  status: z.literal('in_progress'),
});

const processingTranscodeStartedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('transcode'),
  status: z.literal('in_progress'),
  resolution: renditionHeightSchema,
});

const metadataCompletedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('metadata'),
  status: z.literal('completed'),
  data: videoMetadataSchema,
});

const transcodeCompletedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('transcode'),
  status: z.literal('completed'),
  resolution: renditionHeightSchema,
});

const metadataFailedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('metadata'),
  status: z.literal('failed'),
  error: nonEmptyStringSchema,
});

const processingTranscodeFailedPayloadSchema = stepPayloadBaseSchema.extend({
  step: z.literal('transcode'),
  status: z.literal('failed'),
  resolution: renditionHeightSchema,
  error: nonEmptyStringSchema,
});

export const videoUploadedPayloadSchema = z
  .object({
    bucket: nonEmptyStringSchema,
    key: nonEmptyStringSchema,
    videoId: videoIdSchema,
    sourceUrl: z.string().url(),
  })
  .strict();

export const processingStepStartedPayloadSchema = z.discriminatedUnion('step', [
  metadataStartedPayloadSchema,
  processingTranscodeStartedPayloadSchema,
]);

export const processingStepCompletedPayloadSchema = z.discriminatedUnion(
  'step',
  [metadataCompletedPayloadSchema, transcodeCompletedPayloadSchema]
);

export const processingStepFailedPayloadSchema = z.discriminatedUnion('step', [
  metadataFailedPayloadSchema,
  processingTranscodeFailedPayloadSchema,
]);

export const processingCompletedPayloadSchema =
  completedProcessingPipelineResultSchema;

export const processingFailedPayloadSchema =
  failedProcessingPipelineResultSchema;

export const UPLOAD_EVENT_PAYLOAD_SCHEMAS = {
  [EVENT.VIDEO_UPLOADED]: videoUploadedPayloadSchema,
} as const;

export const PROCESSING_EVENT_PAYLOAD_SCHEMAS = {
  [EVENT.PROCESSING_STEP_STARTED]: processingStepStartedPayloadSchema,
  [EVENT.PROCESSING_STEP_COMPLETED]: processingStepCompletedPayloadSchema,
  [EVENT.PROCESSING_STEP_FAILED]: processingStepFailedPayloadSchema,
  [EVENT.PROCESSING_COMPLETED]: processingCompletedPayloadSchema,
  [EVENT.PROCESSING_FAILED]: processingFailedPayloadSchema,
} as const;

export const EVENT_PAYLOAD_SCHEMAS = {
  ...UPLOAD_EVENT_PAYLOAD_SCHEMAS,
  ...PROCESSING_EVENT_PAYLOAD_SCHEMAS,
} as const;
