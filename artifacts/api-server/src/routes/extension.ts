import { Router, type IRouter, type Response, type NextFunction } from "express";
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

// Combined middleware: accepts either X-API-Token or Clerk JWT Bearer token
async function requireAuthOrApiToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiTokenHeader = req.headers["x-api-token"] as string | undefined;
  if (apiTokenHeader) {
    return requireApiToken(req, res, next);
  }
  // Fall back to Clerk JWT
  const { getAuth } = await import("@clerk/express");
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  const email = await resolveClerkEmail(req, auth.userId);
  const user = await getOrCreateUser(auth.userId, email);
  req.dbUser = user;
  next();
}

router.post("/extension/inject", requireAuthOrApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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

router.get("/extension-removed", (_req, res): void => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html><head><title>FlowAccess — Session Cleanup</title>
<style>body{background:#1a1a1a;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
.box{text-align:center;}.spinner{border:3px solid #333;border-top:3px solid #4a9eff;border-radius:50%;width:32px;height:32px;animation:spin 0.8s linear infinite;margin:16px auto;}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="box"><div class="spinner"></div><p>Signing out of session...</p>
<form id="sf" method="POST" action="https://labs.google/fx/api/auth/signout"></form>
<script>
try{document.cookie.split(';').forEach(function(c){var n=c.split('=')[0].trim();if(!n)return;
['/','/fx','/fx/tools','/fx/tools/flow','/fx/api','/fx/api/auth'].forEach(function(p){
['.labs.google','labs.google',''].forEach(function(d){
var s=n+'=;expires=Thu,01 Jan 1970 00:00:00 GMT;path='+p;if(d)s+=';domain='+d;document.cookie=s;});});});}catch(e){}
document.getElementById('sf').submit();
setTimeout(function(){window.location.href='https://labs.google/fx/tools/flow';},3000);
</script></div></body></html>`);
});

export default router;
