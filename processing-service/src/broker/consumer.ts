import type { UploadFinished } from '../../../contracts/messages/upload-finished.ts';
import type { ProcessingStepStatus } from '../../../contracts/messages/processing-step-status.ts';
import { channels } from './channels/index.ts';
import { createProcessingFlow } from '../processing-flow.ts';
import { db } from '@/db/client.ts';
import { processingLogs } from '@/db/schema/processing-logs.ts';
import { EVENTS } from './events.ts';
import { randomUUID } from 'node:crypto';
import { processing } from '@/db/schema/processing.ts';
import { eq } from 'drizzle-orm';

const RESOLUTIONS = [1080, 720, 480];

channels.uploads.consume(
  'uploads',
  async (message) => {
    if (message?.content) {
      const routingKey = message.fields.routingKey;

      try {
        if (routingKey === EVENTS.UPLOAD_FINISHED) {
          const data = JSON.parse(message.content.toString()) as UploadFinished;

          await db.insert(processing).values({
            id: randomUUID(),
            videoId: data.videoId,
            status: 'in_progress',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await createProcessingFlow({
            videoId: data.videoId,
            url: data.path,
            resolutions: RESOLUTIONS,
          });

          channels.uploads.ack(message);
        }
      } catch (error) {
        console.error(error);
        channels.uploads.nack(message, false, false);
      }
    }
  },
  {
    noAck: false,
  }
);

channels.processing.consume(
  'processing',
  async (message) => {
    if (message?.content) {
      const routingKey = message.fields.routingKey;
      try {
        const data = JSON.parse(
          message.content.toString()
        ) as ProcessingStepStatus;

        const baseValues = {
          videoId: data.videoId,
          step: data.step,
          status: data.status,
          message: data.message,
          resolution: data.resolution,
          data: data.data,
          timestamp: new Date(data.timestamp ?? new Date().toISOString()),
        } as const;

        if (routingKey === EVENTS.PROCESSING_STEP_STARTED) {
          await db.insert(processingLogs).values({
            ...baseValues,
          });
        }

        if (routingKey === EVENTS.PROCESSING_STEP_COMPLETED) {
          await db.insert(processingLogs).values({
            ...baseValues,
          });
        }

        if (routingKey === EVENTS.PROCESSING_STEP_FAILED) {
          console.error(data);
          await db.insert(processingLogs).values({
            ...baseValues,
            error: data.error,
          });
        }

        if (routingKey === EVENTS.PROCESSING_FAILED) {
          console.error('Processing failed definitively:', data);
          await db
            .update(processing)
            .set({
              status: 'failed',
              updatedAt: new Date(),
              finishedAt: new Date(),
            })
            .where(eq(processing.videoId, data.videoId));

          await db.insert(processingLogs).values({
            videoId: data.videoId,
            step: data.step,
            status: 'failed',
            message: data.message,
            error: data.error,
            resolution: data.resolution,
            timestamp: new Date(data.timestamp ?? new Date().toISOString()),
          });
        }

        channels.processing.ack(message);
      } catch (error) {
        console.error(error);
        channels.processing.nack(message, false, false);
      }
    }
  },
  { noAck: false }
);
