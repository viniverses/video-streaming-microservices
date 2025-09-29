import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { existsSync } from 'node:fs';
import { Writable } from 'node:stream';

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

export async function transcodeToMp4Stream(
  sourcePath: string,
  height: number,
  writable: Writable,
  onProgress?: (percent: number) => void
): Promise<void> {
  try {
    ensureFfmpegConfigured();
    console.log(`Iniciando transcodificação para ${height}p:`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .videoCodec('libx264')
        .size(`?x${height.toString()}`)
        .format('mp4')
        .outputOptions('-movflags frag_keyframe+empty_moov')
        .on('end', () => {
          writable.end();
          resolve();
        })
        .on('progress', (progress) => {
          const percent =
            typeof progress.percent === 'number' ? progress.percent : 0;
          console.log(
            `Progresso da transcodificação ${height}p:`,
            percent + '%'
          );
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
  } catch (error) {
    console.error(`Error in transcodeToMp4Stream:`, error);
    throw error;
  }
}
