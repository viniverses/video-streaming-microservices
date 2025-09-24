import { channels } from "../channels/index.ts";
import type { UploadCreated } from "./../../../../contracts/messages/upload-created.ts";

export function dispatchUploadCreated(data: UploadCreated) {
  channels.uploads.sendToQueue("uploads", Buffer.from(JSON.stringify(data)));
}
