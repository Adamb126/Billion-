import Stripe from "stripe";
import { env, stripeEnabled } from "./env";

// A single Stripe client, created only when a secret key is configured.
// In dev/simulated mode this stays null and the booking flow confirms instantly.
export const stripe: Stripe | null = stripeEnabled
  ? new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" })
  : null;
