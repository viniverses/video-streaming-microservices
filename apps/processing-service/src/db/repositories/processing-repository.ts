import { randomUUID } from 'node:crypto';

import {
  type ProcessingPipelineResult,
  processingPipelineResultSchema,
  videoMetadataSchema,
} from '@repo/contracts';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '../client.ts';
import { processing } from '../schema/processing.ts';
import { processingLogs } from '../schema/processing-logs.ts';

const normalizeLogData = (
  step: string,
  status: string,
  data: unknown
): unknown => {
  if (step !== 'metadata' || status !== 'completed' || data == null) {
    return data;
  }

  const parsed = videoMetadataSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
};

export const findByVideoId = async (videoId: string) => {
  const [record] = await db
    .select()
    .from(processing)
    .where(eq(processing.videoId, videoId))
    .orderBy(desc(processing.updatedAt))
    .limit(1);

  return record;
};

export const claimPending = async (videoId: string) => {
  const now = new Date();

  await db
    .insert(processing)
    .values({
      id: randomUUID(),
      videoId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: processing.videoId });

  const [claimed] = await db
    .update(processing)
    .set({ status: 'in_progress', updatedAt: now })
    .where(
      and(eq(processing.videoId, videoId), eq(processing.status, 'pending'))
    )
    .returning({ status: processing.status });

  if (claimed) return true;

  const [current] = await db
    .select({ status: processing.status })
    .from(processing)
    .where(eq(processing.videoId, videoId))
    .limit(1);

  return current?.status === 'in_progress';
};

export const finishProcessing = async (result: ProcessingPipelineResult) => {
  const now = new Date();
  const [updated] = await db
    .update(processing)
    .set({
      status: result.status,
      result,
      finishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(processing.videoId, result.videoId),
        eq(processing.status, 'in_progress')
      )
    )
    .returning({ result: processing.result });

  if (updated) return { result, shouldPublish: true };

  const [current] = await db
    .select({ status: processing.status, result: processing.result })
    .from(processing)
    .where(eq(processing.videoId, result.videoId))
    .limit(1);

  if (!current) {
    throw new Error(`Processing record not found for video ${result.videoId}`);
  }

  const persisted = processingPipelineResultSchema.safeParse(current.result);
  if (persisted.success) {
    return { result: persisted.data, shouldPublish: true };
  }

  throw new Error(
    `Processing ${result.videoId} is terminal without a valid pipeline result`
  );
};

export const getStatusWithLogs = async (videoId: string) => {
  const record = await findByVideoId(videoId);

  if (!record) {
    return {
      videoId,
      status: 'pending' as const,
      createdAt: null,
      updatedAt: null,
      finishedAt: null,
      logs: [] as const,
    };
  }

  const logs = await db
    .select({
      id: processingLogs.id,
      step: processingLogs.step,
      status: processingLogs.status,
      message: processingLogs.message,
      data: processingLogs.data,
      error: processingLogs.error,
      resolution: processingLogs.resolution,
      timestamp: processingLogs.timestamp,
      createdAt: processingLogs.createdAt,
    })
    .from(processingLogs)
    .where(eq(processingLogs.videoId, videoId))
    .orderBy(desc(processingLogs.createdAt));

  return {
    videoId: record.videoId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    finishedAt: record.finishedAt,
    logs: logs.map((log) => ({
      ...log,
      data: normalizeLogData(log.step, log.status, log.data),
    })),
  };
};
