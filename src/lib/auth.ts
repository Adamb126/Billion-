// Owner authentication for the back office.
//
// v1 keeps this deliberately simple: a single owner login defined by env vars
// (OWNER_EMAIL / OWNER_PASSWORD). On success we issue a signed JWT stored in an
// httpOnly cookie. Staff logins can be layered on later without changing the
// client-facing flow.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const COOKIE_NAME = "rs_session";
const secret = new TextEncoder().encode(env.authSecret);

export function credentialsValid(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === env.ownerEmail.trim().toLowerCase() &&
    password === env.ownerPassword
  );
}

export async function createSession(): Promise<void> {
  const token = await new SignJWT({ role: "owner", email: env.ownerEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Returns true when the current request carries a valid owner session.
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
