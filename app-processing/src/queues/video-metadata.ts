import { Queue } from 'bullmq';
import { redis } from '@/lib/redis.ts';

export const videoMetadataQueue = new Queue('videos.metadata', {
  connection: redis,
});
