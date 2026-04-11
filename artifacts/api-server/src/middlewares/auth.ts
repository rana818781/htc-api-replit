import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable, apiTokensTable } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface AuthenticatedRequest extends Request {
  userId?: number;
  dbUser?: typeof usersTable.$inferSelect;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;
  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

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
