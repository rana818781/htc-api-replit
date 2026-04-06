import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, usersTable, sessionsTable, usageLogsTable, apiTokensTable, plansTable } from "@workspace/db";
import { requireAuth, requireApiToken, getOrCreateUser, type AuthenticatedRequest } from "../middlewares/auth";
import { resolveClerkEmail } from "../lib/clerkEmail";

const router: IRouter = Router();

router.get("/extension/token", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const clerkUserId = req.clerkUserId!;
  const email = await resolveClerkEmail(req, clerkUserId);
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

  // Atomically deduct 1 credit using a conditional UPDATE.
  // Only succeeds if credits_used < credits_total — prevents over-spending under concurrent requests.
  const [updatedUser] = await db
    .update(usersTable)
    .set({ creditsUsed: sql`${usersTable.creditsUsed} + 1` })
    .where(
      sql`${usersTable.id} = ${user.id} AND ${usersTable.creditsUsed} < ${usersTable.creditsTotal}`,
    )
    .returning();

  if (!updatedUser) {
    // No row updated means credits_used >= credits_total — no credits remaining
    res.status(403).json({ error: "No credits remaining" });
    return;
  }

  const creditsRemaining = Math.max(0, updatedUser.creditsTotal - updatedUser.creditsUsed);

  // Pick least-recently-used active session
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.isActive, true))
    .orderBy(asc(sessionsTable.lastUsedAt))
    .limit(1);

  if (!session) {
    // Roll back the credit deduction since we can't serve a session
    await db
      .update(usersTable)
      .set({ creditsUsed: sql`${usersTable.creditsUsed} - 1` })
      .where(eq(usersTable.id, user.id));
    res.status(404).json({ error: "No active session available" });
    return;
  }

  // Update session lastUsedAt and usageCount atomically
  await db
    .update(sessionsTable)
    .set({
      lastUsedAt: new Date(),
      usageCount: sql`${sessionsTable.usageCount} + 1`,
    })
    .where(eq(sessionsTable.id, session.id));

  // Log usage
  await db.insert(usageLogsTable).values({
    userId: user.id,
    sessionId: session.id,
    action: "inject",
    creditsUsed: 1,
  });

  res.json({
    cookieData: session.cookieData,
    creditsRemaining,
  });
});

export default router;
