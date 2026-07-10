import type { UploadEventByRoutingKey } from '@repo/contracts';
import { EVENT } from '@repo/contracts';

import { claimPending } from '../../db/repositories/processing-repository.ts';
import { createProcessingFlow } from '../../processing-flow.ts';

export const handleVideoUploaded = async (
  event: UploadEventByRoutingKey[typeof EVENT.VIDEO_UPLOADED]
) => {
  const data = event.payload;
  const active = await claimPending(data.videoId);

  if (!active) {
    console.log('Skipping upload event for terminal processing', data.videoId);
    return;
  }

  await createProcessingFlow(data);
};
