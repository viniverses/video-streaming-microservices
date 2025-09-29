import { Job } from 'bullmq';

import { transcodeToMp4Stream } from '@/lib/ffmpeg.ts';
import { createS3UploadStream } from './lib/s3.ts';

export async function videoTranscodeJob(
  job: Job<{ videoId: string; url: string; resolution: number }>
): Promise<void> {
  try {
    const { videoId, url, resolution } = job.data;

    console.log('Transcoding video to resolution:', resolution);

    const videoKey = `videos/${videoId}/${videoId}-${resolution}p.mp4`;

    const { pass: videoPass, uploadPromise: videoUploadPromise } =
      createS3UploadStream(videoKey, 'video/mp4');

    await transcodeToMp4Stream(url, resolution, videoPass, (percent) => {
      job.updateProgress(Math.round(percent).toString());
    });

    await videoUploadPromise;
  } catch (error) {
    console.error('Error generating transcode for video');
    throw error;
  }
}
