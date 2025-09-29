import { broker } from '../broker.ts';

export const uploads = await broker.createChannel();

await uploads.assertQueue('uploads');

await uploads.assertExchange('upload.events', 'topic', { durable: true });

await uploads.bindQueue('uploads', 'upload.events', 'upload.created');

await uploads.bindQueue('uploads', 'upload.events', 'upload.finished');
