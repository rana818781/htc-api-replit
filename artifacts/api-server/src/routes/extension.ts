import { Router, type IRouter, type Response, type NextFunction } from "express";
import { eq, asc, sql, and, ne, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, usersTable, sessionsTable, usageLogsTable, apiTokensTable, plansTable } from "@workspace/db";
import { requireAuth, requireApiToken, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function checkAndExpireUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.planId) return user;

  if (user.isAdmin || user.isReseller) return user;

  const creditsRemaining = Math.max(0, user.creditsTotal - user.creditsUsed);
  const isExpired = user.planExpiresAt && new Date(user.planExpiresAt) <= new Date();
  const isOutOfCredits = creditsRemaining < 10;

  if (isExpired || isOutOfCredits) {
    const [updated] = await db
      .update(usersTable)
      .set({
        planId: null,
        creditsTotal: 0,
        creditsUsed: 0,
        subscriptionStartedAt: null,
        planExpiresAt: null,
      })
      .where(eq(usersTable.id, userId))
      .returning();
    return updated;
  }
  return user;
}

router.get("/extension/token", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [existingToken] = await db
    .select()
    .from(apiTokensTable)
    .where(eq(apiTokensTable.userId, userId));

  if (existingToken) {
    res.json({ token: existingToken.token });
    return;
  }

  const token = randomBytes(32).toString("hex");
  await db.insert(apiTokensTable).values({ userId, token });

  res.json({ token });
});

router.get("/extension/me", requireApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.dbUser!;

  const fullUser = await checkAndExpireUser(user.id);
  if (!fullUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let planName: string | null = null;
  if (fullUser.planId) {
    const [plan] = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, fullUser.planId));
    planName = plan?.name ?? null;
  }

  let daysLeft: number | null = null;
  if (fullUser.planExpiresAt) {
    const msLeft = new Date(fullUser.planExpiresAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }

  res.json({
    id: fullUser.id,
    username: fullUser.username,
    email: fullUser.email,
    isAdmin: fullUser.isAdmin,
    planId: fullUser.planId,
    planName,
    creditsTotal: fullUser.creditsTotal,
    creditsUsed: fullUser.creditsUsed,
    creditsRemaining: Math.max(0, fullUser.creditsTotal - fullUser.creditsUsed),
    subscriptionStartedAt: fullUser.subscriptionStartedAt,
    planExpiresAt: fullUser.planExpiresAt,
    daysLeft,
    createdAt: fullUser.createdAt,
  });
});

async function requireAuthOrApiToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiTokenHeader = req.headers["x-api-token"] as string | undefined;
  if (apiTokenHeader) {
    return requireApiToken(req, res, next);
  }
  return requireAuth(req, res, next) as unknown as Promise<void>;
}

router.post("/extension/inject", requireAuthOrApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  let userId = req.dbUser?.id ?? req.userId;
  if (!userId) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const user = await checkAndExpireUser(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (!user.planId) {
    res.status(403).json({ error: "No active plan. Please subscribe to continue." });
    return;
  }

  const creditsRemaining = Math.max(0, user.creditsTotal - user.creditsUsed);

  const activeSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.isActive, true))
    .orderBy(sql`${sessionsTable.lastUsedAt} ASC NULLS FIRST`);

  let session: typeof sessionsTable.$inferSelect | undefined;

  if (activeSessions.length > 1 && user.lastSessionId) {
    const lastIdx = activeSessions.findIndex(s => s.id === user.lastSessionId);
    if (lastIdx !== -1) {
      session = activeSessions[(lastIdx + 1) % activeSessions.length];
    } else {
      session = activeSessions[0];
    }
  } else {
    session = activeSessions[0];
  }

  if (!session) {
    res.status(404).json({ error: "No active session available" });
    return;
  }

  await db
    .update(sessionsTable)
    .set({
      lastUsedAt: new Date(),
      usageCount: sql`${sessionsTable.usageCount} + 1`,
    })
    .where(eq(sessionsTable.id, session.id));

  await db
    .update(usersTable)
    .set({ lastSessionId: session.id })
    .where(eq(usersTable.id, userId));

  res.json({
    cookieData: session.cookieData,
    creditsRemaining,
  });
});

router.post("/extension/charge", requireApiToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  const checkedUser = await checkAndExpireUser(req.dbUser!.id);
  if (!checkedUser || !checkedUser.planId) {
    res.status(403).json({ error: "No active plan. Please subscribe to continue." });
    return;
  }
  const user = checkedUser;

  const allowedCredits = [10, 20, 30, 40];
  const credits = typeof req.body?.credits === "number" ? req.body.credits : 10;

  if (!allowedCredits.includes(credits)) {
    res.status(400).json({ error: "Invalid credit amount. Allowed: 10, 20, 30, 40" });
    return;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({ creditsUsed: sql`${usersTable.creditsUsed} + ${credits}` })
    .where(
      sql`${usersTable.id} = ${user.id} AND (${usersTable.creditsTotal} - ${usersTable.creditsUsed}) >= ${credits}`,
    )
    .returning();

  if (!updatedUser) {
    res.status(403).json({ error: `Not enough credits (${credits} required)` });
    return;
  }

  const creditsRemaining = Math.max(0, updatedUser.creditsTotal - updatedUser.creditsUsed);
  const multiplier = credits / 10;

  await db.insert(usageLogsTable).values({
    userId: user.id,
    sessionId: null,
    action: `video_generate_x${multiplier}`,
    creditsUsed: credits,
  });

  res.json({
    success: true,
    creditsCharged: credits,
    creditsRemaining,
  });
});

router.post("/sync/cookies", async (req, res): Promise<void> => {
  const { syncKey, cookieData } = req.body;

  if (!syncKey || !cookieData) {
    res.status(400).json({ error: "syncKey and cookieData are required" });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(cookieData);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
  } catch {
    res.status(400).json({ error: "cookieData must be a valid non-empty JSON array" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.syncKey, syncKey));

  if (!session) {
    res.status(404).json({ error: "Invalid sync key" });
    return;
  }

  await db
    .update(sessionsTable)
    .set({ cookieData, cookieUpdatedAt: new Date() })
    .where(eq(sessionsTable.id, session.id));

  res.json({ success: true, sessionId: session.id, label: session.label, cookieCount: parsed.length });
});

router.get("/extension-removed", (_req, res): void => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html><head><title>HTC API — Signing Out</title>
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
