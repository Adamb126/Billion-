// Centralised, typed access to environment configuration.
//
// MULTI-TENANT note: per-studio settings (name, currency, owner login, Stripe
// keys, email-from) now live in the Studio table in the database, not here.
// The values below are used (a) to SEED the first studio and (b) as the global
// email transport + fallbacks. Adding more studios is a DB insert, not an env
// change.

export const env = {
  // ---- Used to seed the first studio (see prisma/seed.ts) ----
  studioSlug: process.env.STUDIO_SLUG || "my-studio",
  studioName: process.env.STUDIO_NAME || "Recovery Studio",
  currency: (process.env.CURRENCY || "eur").toLowerCase(),
  ownerEmail: process.env.OWNER_EMAIL || "",
  ownerPassword: process.env.OWNER_PASSWORD || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  emailFrom: process.env.EMAIL_FROM || "bookings@example.com",

  // ---- App-wide settings ----
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  authSecret: process.env.AUTH_SECRET || "dev-insecure-secret-change-me",

  // ---- Global email transport (SMTP) shared by all studios ----
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
};

// When no SMTP host is configured we log emails to the console instead.
export const emailEnabled = Boolean(env.smtpHost);
