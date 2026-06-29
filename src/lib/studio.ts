// Multi-tenant helpers: resolve the current studio and its per-studio config.

import Stripe from "stripe";
import type { Studio } from "@prisma/client";
import { prisma } from "./prisma";
import { getSession } from "./auth";

// Look up a studio by its public URL slug (used by the public booking pages).
export async function getStudioBySlug(slug: string): Promise<Studio | null> {
  return prisma.studio.findUnique({ where: { slug } });
}

// The studio the logged-in owner belongs to (used by the back office).
// Returns null when there's no valid session.
export async function getCurrentStudio(): Promise<Studio | null> {
  const session = await getSession();
  if (!session) return null;
  return prisma.studio.findUnique({ where: { id: session.studioId } });
}

// A Stripe client for a specific studio, or null when that studio hasn't
// configured Stripe yet (=> simulated-payment / demo mode for that studio).
export function getStripeForStudio(studio: Studio): Stripe | null {
  if (!studio.stripeSecretKey) return null;
  return new Stripe(studio.stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

export function studioStripeEnabled(studio: Studio): boolean {
  return Boolean(studio.stripeSecretKey);
}
