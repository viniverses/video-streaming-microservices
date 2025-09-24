import { broker } from "../broker.ts";

export const uploads = await broker.createChannel();

await uploads.assertQueue("uploads");
