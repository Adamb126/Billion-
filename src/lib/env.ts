// Centralised, typed access to environment configuration.

export const env = {
  studioName: process.env.STUDIO_NAME || "Recovery Studio",
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  currency: (process.env.CURRENCY || "eur").toLowerCase(),

  ownerEmail: process.env.OWNER_EMAIL || "",
  ownerPassword: process.env.OWNER_PASSWORD || "",
  authSecret: process.env.AUTH_SECRET || "dev-insecure-secret-change-me",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || "bookings@example.com",
};

// When no Stripe key is configured we run in "simulated payment" mode so the
// whole booking flow is testable locally without any Stripe setup.
export const stripeEnabled = Boolean(env.stripeSecretKey);

// When no SMTP host is configured we log emails to the console instead.
export const emailEnabled = Boolean(env.smtpHost);
