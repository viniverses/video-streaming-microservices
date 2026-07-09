import { z } from 'zod';

import { RENDITION_HEIGHTS, type RenditionHeight } from './processing.ts';
import { videoMetadataSchema } from './video-metadata.ts';

const videoIdSchema = z.string().uuid();
const renditionHeightSchema = z.custom<RenditionHeight>(
  (value) =>
    typeof value === 'number' &&
    RENDITION_HEIGHTS.some((height) => height === value),
  'Unsupported rendition height'
);

export const metadataChildResultSchema = z
  .object({
    kind: z.literal('metadata'),
    status: z.literal('completed'),
    videoId: videoIdSchema,
    metadata: videoMetadataSchema,
  })
  .strict();

export const transcodeChildResultSchema = z
  .object({
    kind: z.literal('transcode'),
    status: z.literal('completed'),
    videoId: videoIdSchema,
    resolution: renditionHeightSchema,
    outputKey: z.string().trim().min(1),
  })
  .strict();

export const processingChildResultSchema = z.discriminatedUnion('kind', [
  metadataChildResultSchema,
  transcodeChildResultSchema,
]);

const processingFailureSchema = z
  .object({
    childKey: z.string().trim().min(1),
    error: z.string().trim().min(1),
  })
  .strict();

export const completedProcessingPipelineResultSchema = z
  .object({
    status: z.literal('completed'),
    videoId: videoIdSchema,
    metadata: metadataChildResultSchema,
    renditions: z
      .array(transcodeChildResultSchema)
      .length(RENDITION_HEIGHTS.length),
  })
  .strict();

export const failedProcessingPipelineResultSchema = z
  .object({
    status: z.literal('failed'),
    videoId: videoIdSchema,
    failures: z.array(processingFailureSchema).min(1),
  })
  .strict();

export const processingPipelineResultSchema = z.discriminatedUnion('status', [
  completedProcessingPipelineResultSchema,
  failedProcessingPipelineResultSchema,
]);

export type MetadataChildResult = z.infer<typeof metadataChildResultSchema>;
export type TranscodeChildResult = z.infer<typeof transcodeChildResultSchema>;
export type ProcessingChildResult = z.infer<typeof processingChildResultSchema>;
export type CompletedProcessingPipelineResult = z.infer<
  typeof completedProcessingPipelineResultSchema
>;
export type FailedProcessingPipelineResult = z.infer<
  typeof failedProcessingPipelineResultSchema
>;
export type ProcessingPipelineResult = z.infer<
  typeof processingPipelineResultSchema
>;
