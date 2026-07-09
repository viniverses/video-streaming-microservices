import { spawn } from 'node:child_process';

import type { AudioTrackInfo, VideoMetadata } from '@repo/contracts';
import ffmpeg from 'fluent-ffmpeg';

import { FFPROBE_BINARY_PATH } from './setup.ts';

const languageDisplay = new Intl.DisplayNames(['pt-BR'], { type: 'language' });

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getStreamTag = (
  tags: Record<string, string> | undefined,
  key: string
): string | null => {
  if (!tags) return null;
  const value = tags[key] ?? tags[key.toUpperCase()];
  return value?.trim() || null;
};

const buildAudioTrackLabel = (
  trackIndex: number,
  language: string | null,
  title: string | null,
  codec: string | null
): string => {
  if (title) return title;

  if (language) {
    try {
      const name = languageDisplay.of(language);
      if (name) return name;
    } catch {
      // invalid language code
    }
    return language.toUpperCase();
  }

  const codecLabel = codec?.toUpperCase();
  if (codecLabel) return `Faixa ${trackIndex + 1} (${codecLabel})`;

  return `Faixa ${trackIndex + 1}`;
};

type FfprobeStream = {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  channels?: number;
  sample_rate?: string | number;
  tags?: Record<string, string>;
};

const extractAudioTracks = (streams: FfprobeStream[]): AudioTrackInfo[] => {
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');

  return audioStreams.map((stream, trackIndex) => {
    const language = getStreamTag(stream.tags, 'language');
    const title =
      getStreamTag(stream.tags, 'title') ??
      getStreamTag(stream.tags, 'handler_name');
    const codec = stream.codec_name ?? null;

    return {
      index: stream.index ?? trackIndex,
      trackIndex,
      codec,
      channels: stream.channels ?? null,
      sampleRate: stream.sample_rate ? Number(stream.sample_rate) : null,
      language,
      title,
      label: buildAudioTrackLabel(trackIndex, language, title, codec),
    };
  });
};

const ffprobeFile = (source: string) =>
  new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    const child = spawn(FFPROBE_BINARY_PATH, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      source,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout
      .setEncoding('utf8')
      .on('data', (chunk: string) => (stdout += chunk));
    child.stderr
      .setEncoding('utf8')
      .on('data', (chunk: string) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0)
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
      else {
        try {
          resolve(JSON.parse(stdout) as ffmpeg.FfprobeData);
        } catch (error) {
          reject(error);
        }
      }
    });
  });

export const getVideoMetadata = async (
  source: string
): Promise<VideoMetadata> => {
  const metadata = await ffprobeFile(source);

  const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

  if (!videoStream) {
    throw new Error('No video stream found');
  }

  const audioTracks = extractAudioTracks(metadata.streams);

  return {
    size: parseOptionalNumber(metadata.format.size),
    bitrate: parseOptionalNumber(metadata.format.bit_rate),
    fileName: metadata.format.filename,
    duration: parseOptionalNumber(metadata.format.duration),
    format: metadata.format.format_name,
    width: videoStream?.width,
    height: videoStream?.height,
    fps: videoStream?.r_frame_rate,
    codec: videoStream?.codec_name,
    audioTracks: audioTracks.length > 0 ? audioTracks : undefined,
  };
};
