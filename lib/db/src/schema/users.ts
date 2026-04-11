import { pgTable, serial, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  isAdmin: boolean("is_admin").notNull().default(false),
  planId: integer("plan_id").references(() => plansTable.id),
  creditsTotal: integer("credits_total").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  subscriptionStartedAt: timestamp("subscription_started_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
