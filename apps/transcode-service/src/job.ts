import {
  type EncodeJobData,
  s3Keys,
  type TranscodeChildResult,
} from '@repo/contracts';
import { transcodeToMp4Stream } from '@repo/ffmpeg';
import { Job } from '@repo/queue';

import { storage } from '@/infra/storage.ts';

// Metadata baixa o original para disco (probe + thumbnails + faixas de áudio).
// Transcode usa sourceUrl (URL pública) por ser single-pass e rodar em paralelo por resolução.
export async function videoTranscodeJob(
  job: Job<EncodeJobData>
): Promise<TranscodeChildResult> {
  return runVideoTranscodeJob(job);
}

async function runVideoTranscodeJob(
  job: Job<EncodeJobData>
): Promise<TranscodeChildResult> {
  try {
    const { bucket, key, sourceUrl, videoId, resolution } = job.data;

    console.log(
      'Transcoding video to resolution:',
      bucket,
      key,
      sourceUrl,
      videoId
    );

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
