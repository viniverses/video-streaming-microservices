export const EVENTS = {
  UPLOAD_CREATED: "upload.created",
  UPLOAD_FINISHED: "upload.finished",
} as const;

export type EventRoutingKey = (typeof EVENTS)[keyof typeof EVENTS];
