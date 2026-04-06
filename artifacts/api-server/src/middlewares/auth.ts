import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, apiTokensTable } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  clerkUserId?: string;
  dbUser?: typeof usersTable.$inferSelect;
}

export async function getOrCreateUser(
  clerkUserId: string,
  email: string,
): Promise<typeof usersTable.$inferSelect> {
  const [byClerkId] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (byClerkId) {
    // Update stale placeholder email if we now have the real one
    if (byClerkId.email.includes("@unknown.local") && !email.includes("@unknown.local")) {
      const [updated] = await db
        .update(usersTable)
        .set({ email })
        .where(eq(usersTable.id, byClerkId.id))
        .returning();
      return updated;
    }
    return byClerkId;
  }

  // Check by email — handles pre-created manual_ users
  const [byEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (byEmail) {
    if (byEmail.clerkUserId.startsWith("manual_")) {
      const [updated] = await db
        .update(usersTable)
        .set({ clerkUserId })
        .where(eq(usersTable.id, byEmail.id))
        .returning();
      return updated;
    }
    return byEmail;
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({ clerkUserId, email })
    .returning();

  return newUser;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, auth.userId));

  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.dbUser = user;
  next();
}

export async function requireApiToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers["x-api-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Missing X-API-Token header" });
    return;
  }

  const [apiToken] = await db
    .select()
    .from(apiTokensTable)
    .where(eq(apiTokensTable.token, token));

  if (!apiToken) {
    res.status(401).json({ error: "Invalid API token" });
    return;
  }

  await db
    .update(apiTokensTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokensTable.id, apiToken.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, apiToken.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.dbUser = user;
  next();
}
