export const BULLMQ_QUEUES = {
  ORCHESTRATOR: 'processing.orchestrator.queue',
  METADATA: 'processing.metadata.queue',
  ENCODE: 'processing.encode.queue',
} as const;

export const processingJobIds = {
  orchestrator: (videoId: string) => `processing-${videoId}`,
  metadata: (videoId: string) => `metadata-${videoId}`,
  encode: (videoId: string, height: number) => `encode-${videoId}-${height}`,
} as const;
