import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const UploadStatus = pgEnum("upload_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
  "moderation_pending",
  "published",
]);

export const uploads = pgTable("uploads", {
  id: uuid().notNull().primaryKey(),
  title: text(),
  description: text(),
  tags: text(),
});
