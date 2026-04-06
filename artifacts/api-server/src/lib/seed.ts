import { db, plansTable } from "@workspace/db";
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

export async function seedPlans(): Promise<void> {
  const existing = await db.select().from(plansTable);
  if (existing.length > 0) {
    logger.info({ count: existing.length }, "Plans already seeded, skipping");
    return;
  }

  await db.insert(plansTable).values(DEFAULT_PLANS);
  logger.info("Seeded default plans");
}
