import { eq } from "drizzle-orm";
import { db, plansTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_PLANS = [
  {
    name: "Starter",
    priceUsd: "9.99",
    creditsPerMonth: 10,
    description: "10 credits per month. Perfect for getting started.",
    isActive: true,
  },
  {
    name: "Pro",
    priceUsd: "29.99",
    creditsPerMonth: 50,
    description: "50 credits per month. Great for regular users.",
    isActive: true,
  },
  {
    name: "Unlimited",
    priceUsd: "79.99",
    creditsPerMonth: 200,
    description: "200 credits per month. For power users.",
    isActive: true,
  },
];

export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, adminEmail));

  if (!user) {
    logger.info({ adminEmail }, "Admin user not found in DB yet, skipping");
    return;
  }

  if (user.isAdmin) {
    logger.info({ adminEmail }, "Admin already set, skipping");
    return;
  }

  await db
    .update(usersTable)
    .set({ isAdmin: true })
    .where(eq(usersTable.email, adminEmail));

  logger.info({ adminEmail }, "Admin privileges granted on startup");
}

export async function seedPlans(): Promise<void> {
  const existing = await db.select().from(plansTable);
  if (existing.length > 0) {
    logger.info({ count: existing.length }, "Plans already seeded, skipping");
    return;
  }

  await db.insert(plansTable).values(DEFAULT_PLANS);
  logger.info("Seeded default plans");
}
