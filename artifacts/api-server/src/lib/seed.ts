import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername) return;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, adminUsername));

  if (user) {
    if (user.isAdmin) {
      logger.info({ adminUsername }, "Admin already set, skipping");
      return;
    }
    await db
      .update(usersTable)
      .set({ isAdmin: true })
      .where(eq(usersTable.id, user.id));
    logger.info({ adminUsername }, "Admin privileges granted on startup");
    return;
  }

  if (!adminPassword) {
    logger.info({ adminUsername }, "Admin user not found and no ADMIN_PASSWORD set, skipping");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.insert(usersTable).values({
    username: adminUsername,
    passwordHash,
    isAdmin: true,
  });
  logger.info({ adminUsername }, "Admin user created on startup");
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
