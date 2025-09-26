import { Queue } from 'bullmq';
import { redis } from '@/lib/redis.ts';

export const videoTranscodeQueue = new Queue('videos.transcode', {
  connection: redis,
});
