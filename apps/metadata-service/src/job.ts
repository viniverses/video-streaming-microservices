import fs from 'node:fs/promises';

import {
  type AudioTrackInfo,
  type MetadataChildResult,
  type ProcessingJobData,
  s3Keys,
  type ThumbnailInfo,
  videoMetadataSchema,
} from '@repo/contracts';
import {
  extractAudioTrackStream,
  extractThumbnail,
  getVideoMetadata,
} from '@repo/ffmpeg';
import { Job } from '@repo/queue';

import { buildThumbnailTimestamps } from '@/lib/build-thumbnail-timestamps.ts';
import { storage } from '@/lib/s3.ts';

const THUMBNAIL_COUNT = 3;

async function waitForAll<T>(promises: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );

  if (failure) throw failure.reason;

  return results.map((result) => (result as PromiseFulfilledResult<T>).value);
}

async function cleanUp(filePath: string) {
  await fs.unlink(filePath).catch((err) => {
    console.warn(`[job] Failed to clean up tmp file: ${err.message}`);
  });
}

const extractAndUploadAudioTracks = async (
  source: string,
  videoId: string,
  tracks: AudioTrackInfo[]
): Promise<AudioTrackInfo[]> => {
  if (tracks.length === 0) return [];

  const audioTracks = await waitForAll(
    tracks.map(async (track) => {
      const audioKey = s3Keys.audioTrack(videoId, track.trackIndex);
      await storage.withS3UploadStream(audioKey, 'audio/mp4', (pass) =>
        extractAudioTrackStream(source, track.trackIndex, pass)
      );

      return {
        ...track,
        url: storage.getPublicUrl(audioKey),
      };
    })
  );

  console.log(
    `[job] ${audioTracks.length} faixa(s) de áudio em ${videoId}:`,
    audioTracks.map((t) => t.label).join(', ')
  );

  return audioTracks;
};

const extractAndUploadThumbnails = async (
  source: string,
  videoId: string,
  timestamps: number[]
): Promise<ThumbnailInfo[]> =>
  waitForAll(
    timestamps.map(async (seekSeconds, index) => {
      const thumbKey = s3Keys.thumbnail(videoId, index, seekSeconds);
      await storage.withS3UploadStream(thumbKey, 'image/jpeg', (pass) =>
        extractThumbnail(source, seekSeconds, pass)
      );

      return {
        timestamp: seekSeconds,
        url: storage.getPublicUrl(thumbKey),
      };
    })
  );

export async function videoMetadataJob(
  job: Job<ProcessingJobData>
): Promise<MetadataChildResult> {
  return runVideoMetadataJob(job);
}

async function runVideoMetadataJob(
  job: Job<ProcessingJobData>
): Promise<MetadataChildResult> {
  const { bucket, key, videoId } = job.data;
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const localPath = `tmp/videos/${videoId}-${now}.mp4`;

  try {
    await storage.downloadToFile(key, localPath, bucket);

    const metadata = await getVideoMetadata(localPath);
    const duration = metadata.duration ?? 0;
    const timestamps = buildThumbnailTimestamps(duration, THUMBNAIL_COUNT);

    const [audioResult, thumbnailResult] = await Promise.allSettled([
      extractAndUploadAudioTracks(
        localPath,
        videoId,
        metadata.audioTracks ?? []
      ),
      extractAndUploadThumbnails(localPath, videoId, timestamps),
    ]);

    if (audioResult.status === 'rejected') throw audioResult.reason;
    if (thumbnailResult.status === 'rejected') throw thumbnailResult.reason;

    const audioTracks = audioResult.value;
    const thumbnails = thumbnailResult.value;

    const metadataCandidate = {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      fps: metadata.fps,
      codec: metadata.codec,
      bitrate: metadata.bitrate,
      size: metadata.size,
      fileName: metadata.fileName,
      thumbnails,
      audioTracks,
    };

    const parsedMetadata = videoMetadataSchema.safeParse(metadataCandidate);

    if (!parsedMetadata.success) {
      throw new Error(
        `Invalid metadata for video ${videoId}: ${parsedMetadata.error.message}`
      );
    }

    return {
      kind: 'metadata',
      status: 'completed',
      videoId,
      metadata: parsedMetadata.data,
    };
  } catch (error) {
    console.error(`[job] Error processing video ${videoId}:`, error);
    throw error;
  } finally {
    await cleanUp(localPath);
  }
}
