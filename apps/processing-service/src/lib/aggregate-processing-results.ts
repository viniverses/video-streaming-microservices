import {
  type FailedProcessingPipelineResult,
  processingChildResultSchema,
  type ProcessingPipelineResult,
  RENDITION_HEIGHTS,
} from '@repo/contracts';

const failedResult = (
  videoId: string,
  failures: FailedProcessingPipelineResult['failures']
): FailedProcessingPipelineResult => ({
  status: 'failed',
  videoId,
  failures,
});

export const aggregateProcessingResults = (
  videoId: string,
  childrenValues: Record<string, unknown>,
  failedChildren: Record<string, string> = {}
): ProcessingPipelineResult => {
  const childFailures = Object.entries(failedChildren).map(
    ([childKey, error]) => ({
      childKey,
      error: error.trim() || 'Child failed without an error message',
    })
  );

  if (childFailures.length > 0) {
    return failedResult(videoId, childFailures);
  }

  const parsedChildren = Object.entries(childrenValues).map(
    ([childKey, value]) => ({
      childKey,
      result: processingChildResultSchema.safeParse(value),
    })
  );

  const invalidChildren = parsedChildren.flatMap(({ childKey, result }) =>
    result.success
      ? []
      : [
          {
            childKey,
            error: `Invalid child result: ${result.error.message}`,
          },
        ]
  );

  if (invalidChildren.length > 0) {
    return failedResult(videoId, invalidChildren);
  }

  const results = parsedChildren.flatMap(({ result }) =>
    result.success ? [result.data] : []
  );
  const mismatchedResults = results.filter(
    (result) => result.videoId !== videoId
  );

  if (mismatchedResults.length > 0) {
    return failedResult(videoId, [
      {
        childKey: 'orchestrator',
        error: `Received ${mismatchedResults.length} result(s) for another video`,
      },
    ]);
  }

  const metadataResults = results.filter(
    (result) => result.kind === 'metadata'
  );
  const transcodeResults = results.filter(
    (result) => result.kind === 'transcode'
  );

  if (metadataResults.length !== 1) {
    return failedResult(videoId, [
      {
        childKey: 'orchestrator',
        error: `Expected exactly one metadata result, received ${metadataResults.length}`,
      },
    ]);
  }

  const invalidRenditions = RENDITION_HEIGHTS.flatMap((resolution) => {
    const count = transcodeResults.filter(
      (result) => result.resolution === resolution
    ).length;

    return count === 1
      ? []
      : [
          {
            childKey: `transcode-${resolution}`,
            error: `Expected exactly one ${resolution}p result, received ${count}`,
          },
        ];
  });

  if (
    invalidRenditions.length > 0 ||
    transcodeResults.length !== RENDITION_HEIGHTS.length
  ) {
    return failedResult(
      videoId,
      invalidRenditions.length > 0
        ? invalidRenditions
        : [
            {
              childKey: 'orchestrator',
              error: `Expected ${RENDITION_HEIGHTS.length} rendition results, received ${transcodeResults.length}`,
            },
          ]
    );
  }

  const metadata = metadataResults[0];

  if (!metadata) {
    return failedResult(videoId, [
      { childKey: 'orchestrator', error: 'Metadata result is missing' },
    ]);
  }

  return {
    status: 'completed',
    videoId,
    metadata,
    renditions: RENDITION_HEIGHTS.map((resolution) => {
      const rendition = transcodeResults.find(
        (result) => result.resolution === resolution
      );

      if (!rendition) {
        throw new Error(`Validated ${resolution}p rendition is missing`);
      }

      return rendition;
    }),
  };
};
