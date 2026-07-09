import { z } from 'zod';

export const thumbnailInfoSchema = z
  .object({
    timestamp: z.number().nonnegative(),
    url: z.string().url(),
  })
  .strict();

export const audioTrackInfoSchema = z
  .object({
    index: z.number().int().nonnegative(),
    trackIndex: z.number().int().nonnegative(),
    codec: z.string().nullable(),
    channels: z.number().int().positive().nullable(),
    sampleRate: z.number().positive().nullable(),
    language: z.string().nullable(),
    title: z.string().nullable(),
    label: z.string().trim().min(1),
    url: z.string().url().optional(),
  })
  .strict();

export const videoMetadataSchema = z
  .object({
    fileName: z.string().optional(),
    duration: z.number().nonnegative().optional(),
    format: z.string().optional(),
    size: z.number().nonnegative().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    bitrate: z.number().nonnegative().optional(),
    fps: z.string().optional(),
    codec: z.string().optional(),
    thumbnails: z.array(thumbnailInfoSchema).optional(),
    audioTracks: z.array(audioTrackInfoSchema).optional(),
  })
  .strict();

export type ThumbnailInfo = z.infer<typeof thumbnailInfoSchema>;
export type AudioTrackInfo = z.infer<typeof audioTrackInfoSchema>;
export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
