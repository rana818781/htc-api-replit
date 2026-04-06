import { Router, type IRouter } from "express";
import { eq, asc, isNull, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, usersTable, sessionsTable, usageLogsTable, apiTokensTable, plansTable } from "@workspace/db";
import { requireAuth, requireApiToken, getOrCreateUser, type AuthenticatedRequest } from "../middlewares/auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/extension/token", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const clerkUserId = req.clerkUserId!;
  const auth = getAuth(req);
  const email =
    (auth?.sessionClaims?.email as string | undefined) ||
    `${clerkUserId}@unknown.local`;

  const user = await getOrCreateUser(clerkUserId, email);

  // Check if user already has a token
  const [existingToken] = await db
    .select()
    .from(apiTokensTable)
    .where(eq(apiTokensTable.userId, user.id));

  if (existingToken) {
    res.json({ token: existingToken.token });
    return;
  }

  // Create a new token
  const token = randomBytes(32).toString("hex");
  await db.insert(apiTokensTable).values({ userId: user.id, token });

  res.json({ token });
});

router.get("/extension/me", requireApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.dbUser!;

  let planName: string | null = null;
  if (user.planId) {
    const [plan] = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, user.planId));
    planName = plan?.name ?? null;
  }

  const fullUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id))
    .then((rows) => rows[0]);

  res.json({
    id: fullUser.id,
    clerkUserId: fullUser.clerkUserId,
    email: fullUser.email,
    isAdmin: fullUser.isAdmin,
    planId: fullUser.planId,
    planName,
    creditsTotal: fullUser.creditsTotal,
    creditsUsed: fullUser.creditsUsed,
    creditsRemaining: Math.max(0, fullUser.creditsTotal - fullUser.creditsUsed),
    subscriptionStartedAt: fullUser.subscriptionStartedAt,
    createdAt: fullUser.createdAt,
  });
});

router.post("/extension/inject", requireApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.dbUser!;

  // Reload fresh user data
  const [freshUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  const creditsRemaining = Math.max(0, freshUser.creditsTotal - freshUser.creditsUsed);

  if (creditsRemaining <= 0) {
    res.status(403).json({ error: "No credits remaining" });
    return;
  }

  // Pick least-recently-used active session
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.isActive, true))
    .orderBy(asc(sessionsTable.lastUsedAt))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "No active session available" });
    return;
  }

  // Deduct 1 credit
  await db
    .update(usersTable)
    .set({ creditsUsed: freshUser.creditsUsed + 1 })
    .where(eq(usersTable.id, freshUser.id));

  // Update session lastUsedAt and usageCount
  await db
    .update(sessionsTable)
    .set({
      lastUsedAt: new Date(),
      usageCount: session.usageCount + 1,
    })
    .where(eq(sessionsTable.id, session.id));

  // Log usage
  await db.insert(usageLogsTable).values({
    userId: freshUser.id,
    sessionId: session.id,
    action: "inject",
    creditsUsed: 1,
  });

  res.json({
    cookieData: session.cookieData,
    creditsRemaining: creditsRemaining - 1,
  });
});

export default router;
