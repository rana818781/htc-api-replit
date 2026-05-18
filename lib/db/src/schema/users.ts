import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  clerkUserId: text("clerk_user_id"),
  email: text("email"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isReseller: integer("is_reseller", { mode: "boolean" }).notNull().default(false),
  addedBy: integer("added_by"),
  planId: integer("plan_id").references(() => plansTable.id),
  creditsTotal: integer("credits_total").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  subscriptionStartedAt: integer("subscription_started_at", { mode: "timestamp" }),
  planExpiresAt: integer("plan_expires_at", { mode: "timestamp" }),
  lastSessionId: integer("last_session_id"),
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
