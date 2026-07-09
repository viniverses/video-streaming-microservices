export const buildThumbnailTimestamps = (
  duration: number,
  count: number
): number[] =>
  Array.from({ length: count }, (_, i) => (duration / (count + 1)) * (i + 1));
