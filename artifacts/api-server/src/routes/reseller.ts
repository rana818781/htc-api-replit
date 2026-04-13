import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, plansTable } from "@workspace/db";
import { requireReseller, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/reseller", requireReseller);

router.get("/reseller/users", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUser = req.dbUser!;

    const whereClause = currentUser.isAdmin
      ? undefined
      : eq(usersTable.addedBy, currentUser.id);

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
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(plansTable, eq(usersTable.planId, plansTable.id))
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt));

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reseller users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/reseller/stats", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUser = req.dbUser!;

    const whereClause = currentUser.isAdmin
      ? undefined
      : eq(usersTable.addedBy, currentUser.id);

    const [totalRow] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(whereClause);

    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${usersTable.createdAt})`.as("date"),
        count: count(),
      })
      .from(usersTable)
      .where(whereClause)
      .groupBy(sql`DATE(${usersTable.createdAt})`)
      .orderBy(desc(sql`DATE(${usersTable.createdAt})`))
      .limit(30);

    let resellerBreakdown: Array<{ resellerId: number; resellerName: string; count: number }> = [];

    if (currentUser.isAdmin) {
      const resellers = await db
        .select({
          resellerId: usersTable.addedBy,
          count: count(),
        })
        .from(usersTable)
        .where(sql`${usersTable.addedBy} IS NOT NULL`)
        .groupBy(usersTable.addedBy);

      const resellerIds = resellers.map(r => r.resellerId).filter(Boolean) as number[];

      if (resellerIds.length > 0) {
        const resellerUsers = await db
          .select({ id: usersTable.id, username: usersTable.username })
          .from(usersTable)
          .where(sql`${usersTable.id} IN (${sql.join(resellerIds.map(id => sql`${id}`), sql`, `)})`);

        const nameMap = new Map(resellerUsers.map(u => [u.id, u.username]));
        resellerBreakdown = resellers.map(r => ({
          resellerId: r.resellerId!,
          resellerName: nameMap.get(r.resellerId!) || "Unknown",
          count: r.count,
        }));
      }
    }

    res.json({
      totalUsersAdded: totalRow?.count ?? 0,
      dailyStats,
      resellerBreakdown,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reseller stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/reseller/users/:resellerId", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUser = req.dbUser!;
    const resellerId = parseInt(Array.isArray(req.params.resellerId) ? req.params.resellerId[0] : req.params.resellerId, 10);

    if (isNaN(resellerId)) {
      res.status(400).json({ error: "Invalid reseller ID" });
      return;
    }

    if (!currentUser.isAdmin && currentUser.id !== resellerId) {
      res.status(403).json({ error: "You can only view your own users" });
      return;
    }

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
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(plansTable, eq(usersTable.planId, plansTable.id))
      .where(eq(usersTable.addedBy, resellerId))
      .orderBy(desc(usersTable.createdAt));

    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${usersTable.createdAt})`.as("date"),
        count: count(),
      })
      .from(usersTable)
      .where(eq(usersTable.addedBy, resellerId))
      .groupBy(sql`DATE(${usersTable.createdAt})`)
      .orderBy(desc(sql`DATE(${usersTable.createdAt})`))
      .limit(30);

    const [resellerInfo] = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, resellerId));

    res.json({
      reseller: resellerInfo || { id: resellerId, username: "Unknown" },
      users,
      dailyStats,
      totalUsers: users.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reseller detail");
    res.status(500).json({ error: "Failed to fetch reseller detail" });
  }
});

router.post("/reseller/users", async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.dbUser!;
  const { username, password, planId, creditsTotal } = req.body;

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
    [newUser] = await db
      .insert(usersTable)
      .values({
        username: username.trim(),
        passwordHash,
        planId: planId ?? null,
        creditsTotal: creditsTotal ?? 0,
        isAdmin: false,
        isReseller: false,
        addedBy: currentUser.id,
      })
      .returning();
  } catch (dbErr: unknown) {
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

export default router;
