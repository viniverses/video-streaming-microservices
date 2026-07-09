import { s3Keys, videoMetadataSchema } from '@repo/contracts';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client.ts';
import { processing } from '@/db/schema/processing.ts';
import { processingLogs } from '@/db/schema/processing-logs.ts';
import { storage } from '@/infra/storage.ts';

const originalVideoPublicUrl = (videoId: string) =>
  storage.getPublicUrl(s3Keys.originalUpload(videoId));

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

export const getProcessingStatus = async (videoId: string) => {
  const [record] = await db
    .select()
    .from(processing)
    .where(eq(processing.videoId, videoId))
    .orderBy(desc(processing.updatedAt))
    .limit(1);

  if (!record) {
    return {
      videoId,
      publicUrl: originalVideoPublicUrl(videoId),
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
    publicUrl: originalVideoPublicUrl(record.videoId),
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
