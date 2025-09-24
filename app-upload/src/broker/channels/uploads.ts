import { broker } from "../broker.ts";

export const uploads = await broker.createChannel();

await uploads.assertExchange("upload.events", "topic", { durable: true });
