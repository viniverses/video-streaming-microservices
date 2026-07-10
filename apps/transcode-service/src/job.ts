import {
  type EncodeJobData,
  s3Keys,
  type TranscodeChildResult,
} from '@repo/contracts';
import { transcodeToMp4Stream } from '@repo/ffmpeg';
import { Job } from '@repo/queue';

import { storage } from '@/lib/s3.ts';

export async function videoTranscodeJob(
  job: Job<EncodeJobData>
): Promise<TranscodeChildResult> {
  return runVideoTranscodeJob(job);
}

async function runVideoTranscodeJob(
  job: Job<EncodeJobData>
): Promise<TranscodeChildResult> {
  try {
    const { bucket, key, videoId, resolution } = job.data;
    const sourceUrl = await storage.getPresignedDownloadUrl({ bucket, key });

    console.log('Transcoding video to resolution:', bucket, key, videoId);

    const videoKey = s3Keys.rendition(videoId, resolution);

    const { pass: videoPass, uploadPromise: videoUploadPromise } =
      storage.createS3UploadStream(videoKey, 'video/mp4');

    await transcodeToMp4Stream(
      sourceUrl,
      resolution,
      videoPass,
      (percent) => void job.updateProgress(Math.round(percent).toString())
    );

    await videoUploadPromise;

    console.log('Public URL:', storage.getPublicUrl(videoKey));

    return {
      kind: 'transcode',
      status: 'completed',
      videoId,
      resolution,
      outputKey: videoKey,
    };
  } catch (error) {
    console.error('Error generating transcode for video');
    throw error;
  }
}
