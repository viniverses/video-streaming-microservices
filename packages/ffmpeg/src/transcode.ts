import { Writable } from 'node:stream';

import { MP4_STREAMING_AUDIO_OPTS } from './output-options.ts';
import { pipeFfmpegToWritable } from './pipe-ffmpeg-to-writable.ts';

export const transcodeToMp4Stream = async (
  source: string,
  height: number,
  writable: Writable,
  onProgress?: (percent: number) => void
): Promise<void> => {
  console.log(`[ffmpeg] Starting transcode to ${height}p`);

  await pipeFfmpegToWritable({
    writable,
    onWritableError: (err) => {
      console.error(`[ffmpeg] Write stream error (${height}p):`, err.message);
    },
    onError: (err, stdout, stderr) => {
      console.error(`[ffmpeg] Transcode ${height}p error:`, err.message);
      console.error('stdout:', stdout);
      console.error('stderr:', stderr);
    },
    pipe: (command) => {
      command
        .input(source)
        .size(`?x${height}`)
        .format('mp4')
        .outputOptions([
          '-map',
          '0:v:0',
          '-map',
          '0:a',
          '-c:v',
          'libx264',
          ...MP4_STREAMING_AUDIO_OPTS,
        ])
        .on('progress', (progress) => {
          const percent = progress.percent ?? 0;
          console.log(`[ffmpeg] Transcode ${height}p: ${percent.toFixed(1)}%`);
          onProgress?.(percent);
        })
        .writeToStream(writable, { end: false });
    },
  });
};
