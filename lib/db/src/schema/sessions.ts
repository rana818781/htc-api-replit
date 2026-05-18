import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  cookieData: text("cookie_data").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  usageCount: integer("usage_count").notNull().default(0),
  syncKey: text("sync_key"),
  cookieUpdatedAt: integer("cookie_updated_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true, usageCount: true, syncKey: true, cookieUpdatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
