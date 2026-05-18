import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const usageLogsTable = sqliteTable("usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  action: text("action").notNull(),
  creditsUsed: integer("credits_used").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertUsageLogSchema = createInsertSchema(usageLogsTable).omit({ id: true, createdAt: true });
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;
export type UsageLog = typeof usageLogsTable.$inferSelect;
