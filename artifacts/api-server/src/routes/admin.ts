import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, usersTable, plansTable, sessionsTable, usageLogsTable } from "@workspace/db";
import { requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// All admin routes require admin middleware
router.use(requireAdmin);

// GET /admin/sessions/stats - must come before /admin/sessions/:id
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

// GET /admin/sessions
router.get("/admin/sessions", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));
  res.json(sessions);
});

// POST /admin/sessions
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
    })
    .returning();

  res.status(201).json(session);
});

// PATCH /admin/sessions/:id
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
  if (cookieData !== undefined) updates.cookieData = cookieData;
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

// DELETE /admin/sessions/:id
router.delete("/admin/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

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

// GET /admin/users
router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      clerkUserId: usersTable.clerkUserId,
      email: usersTable.email,
      isAdmin: usersTable.isAdmin,
      planId: usersTable.planId,
      planName: plansTable.name,
      creditsTotal: usersTable.creditsTotal,
      creditsUsed: usersTable.creditsUsed,
      subscriptionStartedAt: usersTable.subscriptionStartedAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(plansTable, eq(usersTable.planId, plansTable.id))
    .orderBy(desc(usersTable.createdAt));

  res.json(users);
});

// POST /admin/users
router.post("/admin/users", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { email, password, planId, creditsTotal, isAdmin } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  // Create the Clerk user, then explicitly mark the email as verified.
  // If either step fails the request fails — no silent fallbacks on the verification step.
  let clerkUser;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      skipPasswordChecks: false,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to create Clerk user");
    const clerkErr = err as { errors?: Array<{ message: string }> };
    const message = clerkErr?.errors?.[0]?.message ?? "Failed to create user in Clerk";
    res.status(400).json({ error: message });
    return;
  }

  // Immediately mark the email as verified so no verification email is sent.
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.emailAddress === email,
  );
  if (primaryEmail && primaryEmail.verification?.status !== "verified") {
    try {
      await clerk.emailAddresses.updateEmailAddress(primaryEmail.id, {
        verified: true,
        primary: true,
      } as Parameters<typeof clerk.emailAddresses.updateEmailAddress>[1]);
    } catch (verifyErr: unknown) {
      // Verification update failed — delete the partially-created Clerk user and fail the request.
      try {
        await clerk.users.deleteUser(clerkUser.id);
      } catch {
        // Best-effort cleanup; log if needed.
      }
      req.log.error({ verifyErr }, "Failed to verify email address for admin-created user");
      res.status(500).json({ error: "Failed to mark email as verified; user was not created" });
      return;
    }
  }

  let newUser;
  try {
    [newUser] = await db
      .insert(usersTable)
      .values({
        clerkUserId: clerkUser.id,
        email,
        planId: planId ?? null,
        creditsTotal: creditsTotal ?? 0,
        isAdmin: isAdmin ?? false,
      })
      .returning();
  } catch (dbErr: unknown) {
    // DB insert failed — clean up the Clerk user to prevent identity drift.
    try {
      await clerk.users.deleteUser(clerkUser.id);
    } catch {
      // Best-effort cleanup.
    }
    req.log.error({ dbErr }, "Failed to insert user into DB; rolled back Clerk user");
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

  res.status(201).json({ ...newUser, planName });
});

// PATCH /admin/users/:id
router.patch("/admin/users/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const { planId, creditsTotal, creditsUsed, isAdmin } = req.body;
  const updates: Record<string, unknown> = {};
  if (planId !== undefined) updates.planId = planId;
  if (creditsTotal !== undefined) updates.creditsTotal = creditsTotal;
  if (creditsUsed !== undefined) updates.creditsUsed = creditsUsed;
  // Prevent admin from accidentally removing their own admin status
  if (isAdmin !== undefined) {
    const isSelf = req.dbUser?.id === id;
    if (isSelf && !isAdmin) {
      res.status(400).json({ error: "নিজের অ্যাডমিন স্ট্যাটাস সরাতে পারবেন না" });
      return;
    }
    updates.isAdmin = isAdmin;
  }

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

  res.json({ ...user, planName });
});

// DELETE /admin/users/:id
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

// GET /admin/usage
router.get("/admin/usage", async (req, res): Promise<void> => {
  const logs = await db
    .select({
      id: usageLogsTable.id,
      userId: usageLogsTable.userId,
      userEmail: usersTable.email,
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
