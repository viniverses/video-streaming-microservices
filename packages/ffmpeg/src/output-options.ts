export const MP4_FRAGMENT_FLAGS = [
  '-movflags',
  'frag_keyframe+empty_moov',
] as const;

export const MP4_STREAMING_AUDIO_OPTS = [
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  ...MP4_FRAGMENT_FLAGS,
] as const;

export const THUMBNAIL_OUTPUT_OPTIONS = [
  '-vf',
  'scale=500:-2',
  '-q:v',
  '2',
] as const;
