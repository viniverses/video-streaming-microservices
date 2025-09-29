import { FlowProducer } from 'bullmq';
import { redis } from '@/lib/redis.ts';

export const flowProducer = new FlowProducer({ connection: redis });
