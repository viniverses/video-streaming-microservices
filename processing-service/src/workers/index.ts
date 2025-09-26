import { videoMetadataWorker } from '@/workers/video-metadata.ts';
import { videoThumbnailWorker } from '@/workers/video-thumbnail.ts';
import { videoTranscodeWorker } from '@/workers/video-transcode.ts';

export const workers = {
  videoMetadata: videoMetadataWorker,
  videoThumbnail: videoThumbnailWorker,
  videoTranscode: videoTranscodeWorker,
};
