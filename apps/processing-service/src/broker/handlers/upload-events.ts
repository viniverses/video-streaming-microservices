import type { UploadEventByRoutingKey } from '@repo/contracts';
import { EVENT } from '@repo/contracts';

import { ensureProcessingIsActive } from '../../lib/ensure-processing-is-active.ts';
import { createProcessingFlow } from '../../processing-flow.ts';

export const handleVideoUploaded = async (
  event: UploadEventByRoutingKey[typeof EVENT.VIDEO_UPLOADED]
) => {
  const data = event.payload;
  const active = await ensureProcessingIsActive(data.videoId);

  if (!active) {
    console.log('Skipping upload event for terminal processing', data.videoId);
    return;
  }

  await createProcessingFlow(data);
};
