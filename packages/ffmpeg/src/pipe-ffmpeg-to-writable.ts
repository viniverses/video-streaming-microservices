import { type ChildProcess } from 'node:child_process';
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

    const command = ffmpeg();

    const getProcess = () =>
      (command as ffmpeg.FfmpegCommand & { ffmpegProc?: ChildProcess })
        .ffmpegProc;

    const rejectAfterProcessExit = async (err: Error, waitForStart = false) => {
      if (waitForStart && !getProcess()) {
        await new Promise<void>((resolveStart) => {
          const onStart = () => {
            command.off('error', onEarlyError);
            resolveStart();
          };
          const onEarlyError = () => {
            command.off('start', onStart);
            resolveStart();
          };
          command.once('start', onStart);
          command.once('error', onEarlyError);
        });
        if (getProcess()) command.kill('SIGKILL');
      }

      const process = getProcess();

      if (process && process.exitCode === null && process.signalCode === null) {
        await new Promise<void>((resolveExit) => {
          process.once('close', () => resolveExit());
        });
      }

      writable.off('error', handleWritableError);
      reject(err);
    };

    const handleWritableError = (err: Error) => {
      if (done) return;
      done = true;
      onWritableError?.(err);
      command.kill('SIGKILL');
      void rejectAfterProcessExit(err, true);
    };

    command
      .on('end', () => {
        if (done) return;
        done = true;
        writable.off('error', handleWritableError);
        writable.end();
        resolve();
      })
      .on(
        'error',
        (err: Error, stdout: string | null, stderr: string | null) => {
          if (done) return;
          done = true;
          onError?.(err, stdout, stderr);
          writable.destroy();
          void rejectAfterProcessExit(err);
        }
      );

    writable.on('error', handleWritableError);
    try {
      pipe(command);
    } catch (error) {
      done = true;
      writable.destroy();
      command.kill('SIGKILL');
      void rejectAfterProcessExit(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  });
