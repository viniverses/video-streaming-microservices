import { type FlowJob, FlowProducer } from 'bullmq';
import type { Redis } from 'ioredis';

export const createFlowProducer = (connection: Redis) => {
  const producer = new FlowProducer({ connection });

  return {
    add: (flow: FlowJob) => producer.add(flow),
    close: async (force = false): Promise<void> => {
      try {
        await producer.close();
      } catch (error) {
        console.error('[flow-producer] Error closing producer', error);

        if (force) {
          throw error;
        }
      }
    },
  };
};
