import { type Writable } from 'node:stream';

import ffmpeg from 'fluent-ffmpeg';

type PipeFfmpegToWritableOptions = {
  writable: Writable;
  onWritableError?: (err: Error) => void;
  onError?: (
    err: Error,
    stdout?: string | null,
    stderr?: string | null
  ) => void;
  pipe: (command: ffmpeg.FfmpegCommand) => void;
};

export const pipeFfmpegToWritable = ({
  writable,
  onWritableError,
  onError,
  pipe,
}: PipeFfmpegToWritableOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;

    const handleWritableError = (err: Error) => {
      if (done) return;
      onWritableError?.(err);
      writable.destroy(err);
      reject(err);
    };

    const command = ffmpeg();

    command
      .on('end', () => {
        done = true;
        writable.off('error', handleWritableError);
        writable.end();
        resolve();
      })
      .on(
        'error',
        (err: Error, stdout: string | null, stderr: string | null) => {
          done = true;
          writable.off('error', handleWritableError);
          onError?.(err, stdout, stderr);
          writable.destroy(err);
          reject(err);
        }
      );

    pipe(command);
    writable.on('error', handleWritableError);
  });
