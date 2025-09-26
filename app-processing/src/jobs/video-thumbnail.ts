import { Job } from 'bullmq';
import { createS3UploadStream, getPublicUrlForKey } from '@/lib/s3.ts';
import { generateThumbnailToStream } from '@/lib/ffmpeg.ts';

type VideoThumbnailJobData = {
  videoId: string;
  path: string;
};

export async function videoThumbnailJob(
  job: Job<VideoThumbnailJobData>
): Promise<{ status: 'ok'; key: string }> {
  const { videoId, path } = job.data;

  const thumbKey = `videos/${videoId}/thumbnail.jpg`;

  const { pass: thumbPass, uploadPromise: thumbUploadPromise } =
    createS3UploadStream(thumbKey, 'image/jpg');

  await generateThumbnailToStream(path, thumbPass);
  await thumbUploadPromise;

  return { status: 'ok', key: getPublicUrlForKey(thumbKey) };
}
