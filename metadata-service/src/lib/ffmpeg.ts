import ffmpeg from 'fluent-ffmpeg';
import type { VideoMetadata } from '../../../contracts/messages/video-metadata.ts';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { existsSync } from 'node:fs';
import { Writable } from 'node:stream';
import { createS3UploadStream } from './s3.ts';

export function ensureFfmpegConfigured(): void {
  const ffmpegBinaryPath = ffmpegPath as unknown as string;
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  const ffprobeBinaryPath = (ffprobePath as any).path;

  if (!ffmpegBinaryPath || !existsSync(ffmpegBinaryPath)) {
    throw new Error(`FFmpeg bin not found at: ${ffmpegBinaryPath}`);
  }

  if (!ffprobeBinaryPath || !existsSync(ffprobeBinaryPath)) {
    throw new Error(`FFprobe bin not found at: ${ffprobeBinaryPath}`);
  }

  ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  ffmpeg.setFfprobePath(ffprobeBinaryPath);
}

export async function getVideoMetadata(
  videoPath: string
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    try {
      ensureFfmpegConfigured();

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          fileName: metadata.format.filename,
          duration: metadata.format.duration,
          format: metadata.format.format_name,
          width: metadata.streams[0].width,
          height: metadata.streams[0].height,
          fps: metadata.streams[0].r_frame_rate,
          codec: metadata.streams[0].codec_name,
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateThumbnailToStream(
  sourcePath: string,
  writable: Writable
): Promise<void> {
  ensureFfmpegConfigured();
  console.log('Iniciando geração de thumbnail para:', sourcePath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .seekInput(0.25)
      .frames(1)
      .format('mjpeg')
      .outputOptions(['-vf', 'scale=500:-2', '-q:v', '2'])
      .on('end', () => {
        writable.end();
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Erro ao gerar thumbnail:', err);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        writable.destroy(err);
        reject(err);
      })
      .pipe(writable, { end: false });

    writable.on('error', (err) => {
      console.error('Erro no stream de escrita da thumbnail:', err);
      reject(err);
    });
  });
}

export async function generateMultipleThumbnails(
  videoId: string,
  sourcePath: string,
  videoDuration: number,
  thumbnailCount: number = 3
): Promise<{ timestamp: number; stream: Writable }[]> {
  ensureFfmpegConfigured();
  console.log(
    `Starting generation of ${thumbnailCount} thumbnails for:`,
    sourcePath
  );

  const thumbnails: { timestamp: number; stream: Writable }[] = [];

  const timestamps: number[] = [];
  for (let i = 1; i <= thumbnailCount; i++) {
    const timestamp = (videoDuration * i) / (thumbnailCount + 1);
    timestamps.push(timestamp);
  }

  for (const timestamp of timestamps) {
    const { pass, uploadPromise } = createS3UploadStream(
      `videos/${videoId}/thumbnails/${Date.now()}_${timestamp.toFixed(2)}.jpg`,
      'image/jpeg'
    );

    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .seekInput(timestamp)
        .frames(1)
        .format('mjpeg')
        .outputOptions(['-vf', 'scale=500:-2', '-q:v', '2'])
        .on('end', () => {
          pass.end();
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error(
            `Erro ao gerar thumbnail no timestamp ${timestamp}:`,
            err
          );
          console.error('stdout:', stdout);
          console.error('stderr:', stderr);
          pass.destroy(err);
          reject(err);
        })
        .pipe(pass, { end: false });

      pass.on('error', (err) => {
        console.error(
          `Erro no stream de escrita da thumbnail no timestamp ${timestamp}:`,
          err
        );
        reject(err);
      });
    });

    await uploadPromise;
    thumbnails.push({ timestamp, stream: pass });
  }

  return thumbnails;
}
