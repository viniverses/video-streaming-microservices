import { channels } from "../channels/index.ts";
import type { UploadCreated } from "./../../../../contracts/messages/upload-created.ts";
import type { UploadFinished } from "./../../../../contracts/messages/upload-finished.ts";

export function dispatchUploadCreated(data: UploadCreated) {
  channels.uploads.publish(
    "upload.events",
    "upload.created",
    Buffer.from(JSON.stringify(data))
  );
}

export function dispatchUploadFinished(data: UploadFinished) {
  channels.uploads.publish(
    "upload.events",
    "upload.finished",
    Buffer.from(JSON.stringify(data))
  );
}
