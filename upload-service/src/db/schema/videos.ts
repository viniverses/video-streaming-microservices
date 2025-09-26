import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const UploadStatus = pgEnum("upload_status", [
  "pending",
  "uploaded",
  "processing",
  "processed",
  "failed",
  "moderation_pending",
  "published",
]);

export const videos = pgTable("videos", {
  id: uuid().notNull().primaryKey(),
  title: text().notNull(),
  description: text(),
  tags: text(),
  path: text(),
  duration: integer(),
  status: UploadStatus().notNull().default("uploaded"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
