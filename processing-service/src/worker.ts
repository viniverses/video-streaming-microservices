import { Worker } from 'bullmq';
import { redis } from '@/lib/redis.ts';
import { db } from './db/client.ts';
import { processing } from './db/schema/processing.ts';
import { eq } from 'drizzle-orm';
import { ProcessingJobData } from '../../contracts/messages/processing-job.ts';

export const worker = new Worker<ProcessingJobData>(
  'processing.orchestrator.queue',
  async (job) => {
    console.log('Processing orchestrator job:', job.data);
  },
  {
    connection: redis,
  }
);

worker.on('completed', async (job) => {
  console.log('Processing orchestrator job completed:', job.data.videoId);
  await db
    .update(processing)
    .set({
      status: 'completed',
      finishedAt: new Date(),
    })
    .where(eq(processing.videoId, job.data.videoId));
});

worker.on('error', (err) => {
  console.error('Error in transcode worker:', err);
});

worker.on('failed', async (job, err) => {
  console.error(
    `Failed to generate orchestrator for video ${job?.data.videoId}: ${err.message}`
  );
});

function handleShutdown() {
  worker.close();
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
