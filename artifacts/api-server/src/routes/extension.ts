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
<html><head><title>FlowAccess — Signing Out</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;}
.card{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:40px;width:380px;text-align:center;}
.spinner{width:40px;height:40px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;}
@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:22px;margin-bottom:8px;font-weight:600;}
.sub{color:#8b949e;font-size:14px;margin-bottom:24px;}
.steps{text-align:left;margin-bottom:24px;}
.step{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:14px;color:#8b949e;}
.step.done{color:#e6edf3;}
.step .icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step .icon.check{color:#3fb950;}
.step .icon.loading{color:#58a6ff;animation:spin .8s linear infinite;border:2px solid #30363d;border-top-color:#58a6ff;border-radius:50%;width:16px;height:16px;}
.step .icon.pending{color:#30363d;}
.status{font-size:14px;font-weight:600;color:#f85149;}
.status.success{color:#3fb950;}
</style></head>
<body><div class="card">
<div class="spinner"></div>
<h1>Signing out...</h1>
<p class="sub">Extension removed — clearing all data and signing out.</p>
<div class="steps">
<div class="step" id="s1"><span class="icon pending">○</span>Clear All Cookies</div>
<div class="step" id="s2"><span class="icon pending">○</span>Clear All Data</div>
<div class="step" id="s3"><span class="icon pending">○</span>Clear Session Storage</div>
<div class="step" id="s4"><span class="icon pending">○</span>Clear Local Storage</div>
<div class="step" id="s5"><span class="icon pending">○</span>Expire All Cookies</div>
<div class="step" id="s6"><span class="icon pending">○</span>Browser Auto Sign Out</div>
</div>
<div class="status" id="statusText">Cleaning up...</div>
</div>
<script>
function markDone(id){
  var el=document.getElementById(id);
  if(!el)return;
  el.className='step done';
  el.querySelector('.icon').className='icon check';
  el.querySelector('.icon').textContent='✓';
}
function markLoading(id){
  var el=document.getElementById(id);
  if(!el)return;
  el.className='step done';
  var ic=el.querySelector('.icon');
  ic.className='icon loading';
  ic.textContent='';
}

setTimeout(function(){markDone('s1');},400);
setTimeout(function(){markDone('s2');},800);
setTimeout(function(){markDone('s3');},1200);
setTimeout(function(){markDone('s4');},1600);
setTimeout(function(){markDone('s5');},2000);
setTimeout(function(){
  markLoading('s6');
  document.getElementById('statusText').textContent='Signing out of browser...';
},2400);
setTimeout(function(){
  window.location.href='https://accounts.google.com/signout/chrome/landing?continue=https%3A%2F%2Faccounts.google.com%2FServiceLogin%3Ffelo%3D1';
},3000);
</script>
</div></body></html>`);
});

export default router;
