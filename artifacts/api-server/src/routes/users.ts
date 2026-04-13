import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, plansTable, usageLogsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let planName: string | null = null;
  if (user.planId) {
    const [plan] = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, user.planId));
    planName = plan?.name ?? null;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    isReseller: user.isReseller,
    planId: user.planId,
    planName,
    creditsTotal: user.creditsTotal,
    creditsUsed: user.creditsUsed,
    creditsRemaining: Math.max(0, user.creditsTotal - user.creditsUsed),
    subscriptionStartedAt: user.subscriptionStartedAt,
    createdAt: user.createdAt,
  });
});

router.get("/users/usage", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const logs = await db
    .select({
      id: usageLogsTable.id,
      sessionId: usageLogsTable.sessionId,
      action: usageLogsTable.action,
      creditsUsed: usageLogsTable.creditsUsed,
      createdAt: usageLogsTable.createdAt,
    })
    .from(usageLogsTable)
    .where(eq(usageLogsTable.userId, user.id))
    .orderBy(desc(usageLogsTable.createdAt))
    .limit(100);

  res.json(logs);
});

export default router;
