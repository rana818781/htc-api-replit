import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, plansTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_PLANS = [
  {
    name: "Pro",
    priceUsd: "0",
    creditsPerMonth: 25000,
    description: "25,000 credits per month. 750 AI videos / month. Google Flow managed access.",
    isActive: true,
  },
  {
    name: "Ultra",
    priceUsd: "0",
    creditsPerMonth: 45000,
    description: "45,000 credits per month. 1,250 AI videos / month. Google Flow managed access. Priority session pool.",
    isActive: true,
  },
  {
    name: "Flow Unlimited",
    priceUsd: "0",
    creditsPerMonth: 999999,
    description: "Unlimited credits. Unlimited AI videos. Google Flow managed access. Dedicated account manager.",
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
  if (existing.length === 0) {
    await db.insert(plansTable).values(DEFAULT_PLANS);
    logger.info("Seeded default plans");
    return;
  }

  for (let i = 0; i < DEFAULT_PLANS.length; i++) {
    const plan = DEFAULT_PLANS[i];
    const match = existing[i];
    if (match && match.name !== plan.name) {
      await db
        .update(plansTable)
        .set({
          name: plan.name,
          priceUsd: plan.priceUsd,
          creditsPerMonth: plan.creditsPerMonth,
          description: plan.description,
        })
        .where(eq(plansTable.id, match.id));
      logger.info({ oldName: match.name, newName: plan.name }, "Plan updated");
    }
  }

  logger.info({ count: existing.length }, "Plans seed check complete");
}
