import { Job } from 'bullmq';
import { createS3UploadStream, getPublicUrlForKey } from '@/lib/s3.ts';
import { transcodeToMp4Stream } from '@/lib/ffmpeg.ts';

type VideoTranscodeJobData = {
  videoId: string;
  path: string;
  height: '1080' | '720' | '480';
};

export async function videoTranscodeJob(
  job: Job<VideoTranscodeJobData>
): Promise<{ status: 'ok'; key: string; height: string }> {
  const { videoId, path, height } = job.data;

  const videoKey = `videos/${videoId}/${videoId}-${height}p.mp4`;
  const { pass: videoPass, uploadPromise: videoUploadPromise } =
    createS3UploadStream(videoKey, 'video/mp4');

  await transcodeToMp4Stream(path, height, videoPass, (percent) => {
    job.updateProgress(Math.round(percent));
  });

  await videoUploadPromise;

  return { status: 'ok', key: getPublicUrlForKey(videoKey), height };
}
