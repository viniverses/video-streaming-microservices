const S3_VIDEOS_PREFIX = 'videos' as const;

export const s3Keys = {
  originalUpload: (videoId: string) => `${S3_VIDEOS_PREFIX}/${videoId}.mp4`,
  rendition: (videoId: string, height: number) =>
    `${S3_VIDEOS_PREFIX}/${videoId}/renditions/${height}p.mp4`,
  thumbnail: (videoId: string, index: number, timestampSec: number) =>
    `${S3_VIDEOS_PREFIX}/${videoId}/thumbnails/${index}_${timestampSec.toFixed(2)}s.jpg`,
  audioTrack: (videoId: string, trackIndex: number) =>
    `${S3_VIDEOS_PREFIX}/${videoId}/audio/${trackIndex}.m4a`,
} as const;

const ORIGINAL_UPLOAD_KEY_PATTERN =
  /^videos\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.mp4$/i;

const decodeS3ObjectKey = (key: string): string =>
  decodeURIComponent(key.replace(/\+/g, ' '));

export const parseOriginalUploadKey = (
  key: string
): { videoId: string; key: string } | null => {
  const decoded = decodeS3ObjectKey(key);
  const match = ORIGINAL_UPLOAD_KEY_PATTERN.exec(decoded);
  if (!match?.[1]) {
    return null;
  }
  return { videoId: match[1], key: decoded };
};
