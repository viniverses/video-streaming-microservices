export interface ThumbnailInfo {
  timestamp: number;
  url: string;
}

export interface VideoMetadata {
  fileName?: string;
  duration?: number;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: string;
  codec?: string;
  thumbnails?: ThumbnailInfo[];
}
