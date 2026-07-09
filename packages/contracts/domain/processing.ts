export const PROCESSING_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'failed',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const PROCESSING_STEPS = ['metadata', 'transcode'] as const;

export type ProcessingStep = (typeof PROCESSING_STEPS)[number];

export const RENDITION_HEIGHTS = [1080, 720, 480] as const;

export type RenditionHeight = (typeof RENDITION_HEIGHTS)[number];

export const isRenditionHeight = (value: unknown): value is RenditionHeight =>
  typeof value === 'number' &&
  RENDITION_HEIGHTS.some((height) => height === value);
