import { type Writable } from 'node:stream';

import { THUMBNAIL_OUTPUT_OPTIONS } from './output-options.ts';
import { pipeFfmpegToWritable } from './pipe-ffmpeg-to-writable.ts';

export const extractThumbnail = async (
  source: string,
  seekSeconds: number,
  writable: Writable
): Promise<void> => {
  console.log(
    `[ffmpeg] Extracting thumbnail at ${seekSeconds}s from: ${source}`
  );

  await pipeFfmpegToWritable({
    writable,
    onWritableError: (err) => {
      console.error(
        `[ffmpeg] Write stream error at ${seekSeconds}s:`,
        err.message
      );
    },
    onError: (err, stdout, stderr) => {
      console.error(
        `[ffmpeg] Thumbnail error at ${seekSeconds}s:`,
        err.message
      );
      console.error('stdout:', stdout);
      console.error('stderr:', stderr);
    },
    pipe: (command) => {
      command
        .input(source)
        .seekInput(seekSeconds)
        .frames(1)
        .format('mjpeg')
        .outputOptions([...THUMBNAIL_OUTPUT_OPTIONS])
        .pipe(writable, { end: false });
    },
  });
};
