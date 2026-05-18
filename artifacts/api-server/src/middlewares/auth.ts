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

export function signToken(userId: number, tokenVersion: number = 0): string {
  return jwt.sign({ userId, tv: tokenVersion }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number; tv?: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; tv?: number };
  } catch {
    return null;
  }
}

export async function requireAuth(
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

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

  if (!user || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    res.status(401).json({ error: "Session expired. Please sign in again." });
    return;
  }

  req.userId = payload.userId;
  req.dbUser = user;
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

  if (!user || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    res.status(401).json({ error: "Session expired. Please sign in again." });
    return;
  }

  if (!user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.dbUser = user;
  next();
}

export async function requireReseller(
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

  if (!user || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    res.status(401).json({ error: "Session expired. Please sign in again." });
    return;
  }

  if (!user.isAdmin && !user.isReseller) {
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

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, apiToken.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if ((user.tokenVersion ?? 0) !== (apiToken.tokenVersion ?? 0)) {
    res.status(401).json({ error: "API token has been revoked. Please re-generate your extension token." });
    return;
  }

  await db
    .update(apiTokensTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokensTable.id, apiToken.id));

  req.dbUser = user;
  next();
}
