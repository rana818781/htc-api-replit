import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db, usersTable, plansTable, sessionsTable, usageLogsTable } from "@workspace/db";
import { requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/admin", requireAdmin);

router.get("/admin/sessions/stats", async (req, res): Promise<void> => {
  const [[totalSessionsRow], [activeSessionsRow], [totalUsersRow], [totalUsageRow]] =
    await Promise.all([
      db.select({ count: count() }).from(sessionsTable),
      db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.isActive, true)),
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(usageLogsTable),
    ]);

  res.json({
    totalSessions: totalSessionsRow?.count ?? 0,
    activeSessions: activeSessionsRow?.count ?? 0,
    totalUsers: totalUsersRow?.count ?? 0,
    totalUsage: totalUsageRow?.count ?? 0,
  });
});

router.get("/admin/sessions", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));
  res.json(sessions);
});

router.post("/admin/sessions", async (req, res): Promise<void> => {
  const { label, cookieData, isActive } = req.body;

  if (!label || cookieData == null) {
    res.status(400).json({ error: "label and cookieData are required" });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      label,
      cookieData,
      isActive: isActive !== undefined ? isActive : true,
      cookieUpdatedAt: new Date(),
    })
    .returning();

  res.status(201).json(session);
});

router.patch("/admin/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { label, cookieData, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = label;
  if (cookieData !== undefined) {
    updates.cookieData = cookieData;
    updates.cookieUpdatedAt = new Date();
  }
  if (isActive !== undefined) updates.isActive = isActive;

  const [session] = await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(session);
});

router.delete("/admin/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  await db.delete(usageLogsTable).where(eq(usageLogsTable.sessionId, id));

  const [session] = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/admin/sessions/:id/generate-sync-key", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const syncKey = randomBytes(16).toString("hex");
  const [session] = await db
    .update(sessionsTable)
    .set({ syncKey })
    .where(eq(sessionsTable.id, id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ syncKey: session.syncKey });
});

router.patch("/admin/plans/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const { name, priceUsd, creditsPerMonth, description, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (priceUsd !== undefined) updates.priceUsd = priceUsd;
  if (creditsPerMonth !== undefined) updates.creditsPerMonth = creditsPerMonth;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.isActive = isActive;

  const [plan] = await db
    .update(plansTable)
    .set(updates)
    .where(eq(plansTable.id, id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.json(plan);
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      isAdmin: usersTable.isAdmin,
      isReseller: usersTable.isReseller,
      addedBy: usersTable.addedBy,
      planId: usersTable.planId,
      planName: plansTable.name,
      creditsTotal: usersTable.creditsTotal,
      creditsUsed: usersTable.creditsUsed,
      subscriptionStartedAt: usersTable.subscriptionStartedAt,
      planExpiresAt: usersTable.planExpiresAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(plansTable, eq(usersTable.planId, plansTable.id))
    .orderBy(desc(usersTable.createdAt));

  res.json(users);
});

router.post("/admin/users", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { username, password, planId, creditsTotal, isAdmin, isReseller } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim()));

  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let newUser;
  try {
    const planExpiresAt = planId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    [newUser] = await db
      .insert(usersTable)
      .values({
        username: username.trim(),
        passwordHash,
        planId: planId ?? null,
        creditsTotal: creditsTotal ?? 0,
        isAdmin: isAdmin ?? false,
        isReseller: isReseller ?? false,
        addedBy: req.dbUser!.id,
        subscriptionStartedAt: planId ? new Date() : null,
        planExpiresAt,
      })
      .returning();
  } catch (dbErr: unknown) {
    req.log.error({ dbErr }, "Failed to insert user into DB");
    res.status(500).json({ error: "Failed to save user; please try again" });
    return;
  }

  let planName: string | null = null;
  if (newUser.planId) {
    const [plan] = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, newUser.planId));
    planName = plan?.name ?? null;
  }

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({ ...safeUser, planName });
});

router.patch("/admin/users/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const { planId, creditsTotal, creditsUsed, isAdmin, isReseller, newPassword } = req.body;
  const updates: Record<string, unknown> = {};
  if (newPassword !== undefined) {
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }
  if (planId !== undefined) {
    updates.planId = planId;
    if (planId) {
      updates.subscriptionStartedAt = new Date();
      updates.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      updates.subscriptionStartedAt = null;
      updates.planExpiresAt = null;
    }
  }
  if (creditsTotal !== undefined) updates.creditsTotal = creditsTotal;
  if (creditsUsed !== undefined) updates.creditsUsed = creditsUsed;
  if (isAdmin !== undefined) {
    const isSelf = req.dbUser?.id === id;
    if (isSelf && !isAdmin) {
      res.status(400).json({ error: "Cannot remove your own admin status" });
      return;
    }
    updates.isAdmin = isAdmin;
  }
  if (isReseller !== undefined) updates.isReseller = isReseller;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

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

  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, planName });
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/admin/usage", async (req, res): Promise<void> => {
  const logs = await db
    .select({
      id: usageLogsTable.id,
      userId: usageLogsTable.userId,
      userEmail: usersTable.username,
      sessionId: usageLogsTable.sessionId,
      action: usageLogsTable.action,
      creditsUsed: usageLogsTable.creditsUsed,
      createdAt: usageLogsTable.createdAt,
    })
    .from(usageLogsTable)
    .leftJoin(usersTable, eq(usageLogsTable.userId, usersTable.id))
    .orderBy(desc(usageLogsTable.createdAt))
    .limit(500);

  res.json(logs);
});

export default router;
