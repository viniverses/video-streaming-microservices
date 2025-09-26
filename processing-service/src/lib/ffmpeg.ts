import ffmpeg from 'fluent-ffmpeg';
import type { FfprobeData } from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import type { Writable } from 'node:stream';
import { existsSync } from 'node:fs';

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
): Promise<FfprobeData> {
  ensureFfmpegConfigured();

  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(metadata);
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

export async function transcodeToMp4Stream(
  sourcePath: string,
  height: string,
  writable: Writable,
  onProgress?: (percent: number) => void
): Promise<void> {
  ensureFfmpegConfigured();
  console.log(`Iniciando transcodificação para ${height}p:`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .videoCodec('libx264')
      .size(`?x${height}`)
      .format('mp4')
      .outputOptions('-movflags frag_keyframe+empty_moov')
      .on('end', () => {
        writable.end();
        resolve();
      })
      .on('progress', (progress) => {
        const percent =
          typeof progress.percent === 'number' ? progress.percent : 0;
        console.log(`Progresso da transcodificação ${height}p:`, percent + '%');
        if (onProgress) onProgress(percent);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`Erro na transcodificação ${height}p:`, err);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        writable.destroy(err);
        reject(err);
      })
      .writeToStream(writable, { end: false });

    writable.on('error', (err) => {
      console.error(`Erro no stream de escrita do vídeo ${height}p:`, err);
      reject(err);
    });
  });
}
