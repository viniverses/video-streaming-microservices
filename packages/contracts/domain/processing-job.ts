import type { VideoUploadedPayload } from '../events/event-schemas.ts';
import type { RenditionHeight } from './processing.ts';

export type ProcessingJobData = VideoUploadedPayload;

export type EncodeJobData = ProcessingJobData & {
  resolution: RenditionHeight;
};
