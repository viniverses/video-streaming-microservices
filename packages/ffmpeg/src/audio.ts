import { Writable } from 'node:stream';

import { MP4_STREAMING_AUDIO_OPTS } from './output-options.ts';
import { pipeFfmpegToWritable } from './pipe-ffmpeg-to-writable.ts';

export const extractAudioTrackStream = async (
  source: string,
  trackIndex: number,
  writable: Writable
): Promise<void> => {
  console.log(`[ffmpeg] Extracting audio track ${trackIndex}`);

  await pipeFfmpegToWritable({
    writable,
    pipe: (command) => {
      command
        .input(source)
        .outputOptions([
          '-map',
          `0:a:${trackIndex}`,
          '-vn',
          ...MP4_STREAMING_AUDIO_OPTS,
        ])
        .format('mp4')
        .writeToStream(writable, { end: false });
    },
  });
};
