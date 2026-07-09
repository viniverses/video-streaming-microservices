import { existsSync } from 'node:fs';

import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';

export const FFMPEG_BINARY_PATH = ffmpegPath as unknown as string;
export const FFPROBE_BINARY_PATH = (ffprobePath as { path: string }).path;

const configureFfmpeg = (): void => {
  if (!FFMPEG_BINARY_PATH || !existsSync(FFMPEG_BINARY_PATH)) {
    throw new Error(`FFmpeg binary not found at: ${FFMPEG_BINARY_PATH}`);
  }

  if (!FFPROBE_BINARY_PATH || !existsSync(FFPROBE_BINARY_PATH)) {
    throw new Error(`FFprobe binary not found at: ${FFPROBE_BINARY_PATH}`);
  }

  ffmpeg.setFfmpegPath(FFMPEG_BINARY_PATH);
  ffmpeg.setFfprobePath(FFPROBE_BINARY_PATH);
};

configureFfmpeg();
