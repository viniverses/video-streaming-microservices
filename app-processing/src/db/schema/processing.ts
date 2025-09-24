import { pgTable, uuid } from "drizzle-orm/pg-core";

export const processing = pgTable("processing", {
  id: uuid().notNull().primaryKey(),
  videoId: uuid().notNull(),
});
