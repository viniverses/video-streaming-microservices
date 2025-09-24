import { channels } from "../channels/index.ts";
import { EVENTS } from "../events.ts";
import type { UploadCreated } from "./../../../../contracts/messages/upload-created.ts";
import type { UploadFinished } from "./../../../../contracts/messages/upload-finished.ts";

export function dispatchUploadCreated(data: UploadCreated) {
  channels.uploads.publish(
    "upload.events",
    EVENTS.UPLOAD_CREATED,
    Buffer.from(JSON.stringify(data))
  );
}

export function dispatchUploadFinished(data: UploadFinished) {
  channels.uploads.publish(
    "upload.events",
    EVENTS.UPLOAD_FINISHED,
    Buffer.from(JSON.stringify(data))
  );
}
