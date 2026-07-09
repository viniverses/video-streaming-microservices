import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { db } from '../db/client.ts';
import { processing } from '../db/schema/processing.ts';

export const ensureProcessingIsActive = async (videoId: string) => {
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
