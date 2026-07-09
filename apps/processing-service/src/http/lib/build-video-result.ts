import {
  processingPipelineResultSchema,
  RENDITION_HEIGHTS,
} from '@repo/contracts';

import type { processing } from '@/db/schema/processing.ts';
import { storage } from '@/infra/storage.ts';

type ProcessingRecord = typeof processing.$inferSelect;

export const buildVideoResult = (
  videoId: string,
  record: ProcessingRecord | undefined
) => {
  const status = record?.status ?? 'pending';
  const parsedResult = processingPipelineResultSchema.safeParse(record?.result);
  const completedResult =
    parsedResult.success && parsedResult.data.status === 'completed'
      ? parsedResult.data
      : null;
  const ready = status === 'completed' && completedResult != null;
  const metadata = completedResult?.metadata.metadata ?? null;

  const renditions = RENDITION_HEIGHTS.map((height) => {
    const rendition = completedResult?.renditions.find(
      (candidate) => candidate.resolution === height
    );

    return {
      height,
      label: `${height}p`,
      url: rendition ? storage.getPublicUrl(rendition.outputKey) : null,
      status: rendition ? ('completed' as const) : ('pending' as const),
    };
  });

  return {
    videoId,
    status,
    ready,
    original: {
      url: null,
    },
    metadata: metadata
      ? {
          duration: metadata.duration ?? null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          format: metadata.format ?? null,
          fps: metadata.fps ?? null,
          codec: metadata.codec ?? null,
          bitrate: metadata.bitrate ?? null,
          size: metadata.size ?? null,
          fileName: metadata.fileName ?? null,
          audioTracks: metadata.audioTracks ?? [],
        }
      : null,
    thumbnails: metadata?.thumbnails ?? [],
    renditions,
    finishedAt: record?.finishedAt ?? null,
  };
};
