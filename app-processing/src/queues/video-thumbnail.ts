import { Queue } from 'bullmq';
import { redis } from '@/lib/redis.ts';

export const videoThumbnailQueue = new Queue('videos.thumbnail', {
  connection: redis,
});
