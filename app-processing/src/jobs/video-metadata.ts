import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { db } from '@/db/client.ts';
import { processing } from '@/db/schema/processing.ts';
import { getVideoMetadata } from '@/lib/ffmpeg.ts';

type VideoMetadataJobData = {
  videoId: string;
  path: string;
};

export async function videoMetadataJob(
  job: Job<VideoMetadataJobData>
): Promise<{ status: 'ok'; duration: number | null }> {
  const { videoId, path } = job.data;

  const metadata = await getVideoMetadata(path);
  const videoDuration = metadata?.format?.duration
    ? Math.floor(metadata.format.duration)
    : null;

  await db.insert(processing).values({
    id: randomUUID(),
    videoId,
    duration: videoDuration ?? null,
  });

  return { status: 'ok', duration: videoDuration };
}
