import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const COOKIE_NAME = "session_token";
export const SESSION_DAYS = 7;

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Create SHA-256 hash of input string (hex format)
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Create a new session for a user
 * Returns the raw token (also sets cookie)
 */
export async function createSession(userId: string): Promise<string> {
  // Generate random token
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(token);

  // Calculate expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  // Store session in database
  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60, // 7 days in seconds
  });

  return token;
}

/**
 * Get the current session user from cookie
 * Returns null if no valid session
 */
export async function getSessionUser(): Promise<{
  id: string;
  username: string;
  role: string;
  isActive: boolean;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = sha256Hex(token);

  // Find session with user
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session expired
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  // Check if user is active
  if (!session.user.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    isActive: session.user.isActive,
  };
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = sha256Hex(token);
    // Delete session from database
    await db.session.deleteMany({
      where: { tokenHash },
    });
  }

  // Clear cookie
  cookieStore.delete(COOKIE_NAME);
}
