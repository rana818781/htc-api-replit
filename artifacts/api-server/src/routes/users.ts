import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, plansTable, usageLogsTable } from "@workspace/db";
import { requireAuth, getOrCreateUser, type AuthenticatedRequest } from "../middlewares/auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const clerkUserId = req.clerkUserId!;

  // Get email from Clerk auth session claims
  const auth = getAuth(req);
  const email =
    (auth?.sessionClaims?.email as string | undefined) ||
    (auth?.sessionClaims?.primary_email_address as string | undefined) ||
    `${clerkUserId}@unknown.local`;

  const user = await getOrCreateUser(clerkUserId, email);

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
    clerkUserId: user.clerkUserId,
    email: user.email,
    isAdmin: user.isAdmin,
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
  const clerkUserId = req.clerkUserId!;
  const auth = getAuth(req);
  const email =
    (auth?.sessionClaims?.email as string | undefined) ||
    `${clerkUserId}@unknown.local`;

  const user = await getOrCreateUser(clerkUserId, email);

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
