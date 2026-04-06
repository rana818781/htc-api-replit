import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable, plansTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface AuthenticatedRequest extends Request {
  clerkUserId?: string;
  dbUser?: {
    id: number;
    clerkUserId: string;
    email: string;
    isAdmin: boolean;
    planId: number | null;
    creditsTotal: number;
    creditsUsed: number;
  };
}

export async function getOrCreateUser(
  clerkUserId: string,
  email: string,
): Promise<typeof usersTable.$inferSelect> {
  // First try to find by clerkUserId
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (user) return user;

  // Try to find by email (handles pre-created manual_ users)
  const [byEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (byEmail) {
    // If found by email and has manual_ prefixed clerkUserId, update to real Clerk ID
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

  // Create a new user
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
  // Import here to avoid circular dep issues at module load
  const { apiTokensTable } = await import("@workspace/db");
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

  // Update lastUsedAt
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
