// Owner authentication for the back office.
//
// MULTI-TENANT: each studio has its own owner login (email + password stored on
// the Studio row). A successful login issues a signed JWT carrying that
// studio's id + slug, so every back-office query is scoped to the owner's own
// studio. Staff logins can be layered on later without changing this flow.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Studio } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";

const COOKIE_NAME = "rs_session";
const secret = new TextEncoder().encode(env.authSecret);

export type Session = { studioId: string; slug: string };

// Find the studio whose owner credentials match. Returns the studio or null.
export async function authenticateOwner(
  email: string,
  password: string,
): Promise<Studio | null> {
  const normalisedEmail = email.trim().toLowerCase();
  const studio = await prisma.studio.findFirst({
    where: { ownerEmail: normalisedEmail },
  });
  if (!studio) return null;
  // Plain-password comparison for v1 simplicity (see spec). Swap for a hashed
  // comparison when staff logins / self-service onboarding arrive.
  if (studio.ownerPassword !== password) return null;
  return studio;
}

export async function createSession(studio: Studio): Promise<void> {
  const token = await new SignJWT({ studioId: studio.id, slug: studio.slug })
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

// The current owner session ({ studioId, slug }) or null if not signed in.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.studioId === "string" &&
      typeof payload.slug === "string"
    ) {
      return { studioId: payload.studioId, slug: payload.slug };
    }
    return null;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
