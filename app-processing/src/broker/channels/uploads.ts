import { broker } from '../broker.ts';
import { EVENTS } from '../events.ts';

export const uploads = await broker.createChannel();

await uploads.assertQueue('uploads');

await uploads.assertExchange('upload.events', 'topic', { durable: true });

await uploads.bindQueue('uploads', 'upload.events', EVENTS.UPLOAD_CREATED);
await uploads.bindQueue('uploads', 'upload.events', EVENTS.UPLOAD_FINISHED);
