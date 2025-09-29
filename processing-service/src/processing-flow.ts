import { flowProducer } from './flow-producer.ts';
import { ProcessingJobData } from '../../contracts/messages/processing-job.ts';
import { FlowChildJob } from 'bullmq';

export async function createProcessingFlow(data: ProcessingJobData) {
  console.log('Creating processing flow...');

  const encodeJobs: FlowChildJob[] = data.resolutions.map((resolution) => ({
    name: 'encode-job',
    queueName: 'processing.encode.queue',
    data: {
      ...data,
      resolution,
    },
    opts: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  }));

  const flow = await flowProducer.add({
    name: 'process-content',
    queueName: 'processing.orchestrator.queue',
    data,
    children: [
      {
        name: 'metadata-job',
        queueName: 'processing.metadata.queue',
        data,
        opts: {
          attempts: 3,
          backoff: {
            type: 'exponential' as const,
            delay: 1000,
          },
        },
      },
      ...encodeJobs,
    ],
  });

  return flow;
}
