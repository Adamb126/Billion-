# Recovery Studio OS — Phase 1 (Booking + Payments)

Software for recovery / wellness studios (cold plunge, sauna, contrast therapy)
to manage bookings and take payments online — one connected system the owner and
their clients use every day.

This repository implements **Phase 1** of the build spec: **Booking + Payments**.
Phases 2 (Waivers + Document Vault) and 3 (Financial Reporting + Accounting Sync)
are intentionally **not** built yet.

---

## What it does

**Client side (public booking page)**
- Browse the studio's services (name, duration, price).
- Pick a service, a date, and an available time slot.
- Enter name, email and phone, and **pay online via Stripe** to confirm.
- Get a **confirmation email**.

**Owner side (back office at `/admin`)**
- Secure single-owner **login**.
- **Set up services** — name, duration, price.
- **Set availability** — open days/hours and the **capacity** (how many people
  can book the same slot).
- **Dashboard** of upcoming bookings — who's coming, when, for what, and whether
  they've **paid**.
- **Manually add** a walk-in / phone booking, **mark a booking paid**, or
  **cancel** a booking.

---

## Tech stack (boring on purpose)

- **Next.js (App Router) + TypeScript** — one app for UI and API.
- **Prisma** ORM — **SQLite** locally, one line to switch to hosted Postgres.
- **Stripe Checkout** for payments (+ webhook to confirm).
- **Nodemailer** for confirmation emails (logs to console if SMTP isn't set).
- **Tailwind CSS** — mobile-first, works great on a phone browser.

---

## Quick start (local)

Requires Node.js 18+.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   (the defaults run in "demo mode": simulated payments + emails logged to
#    the console, so you can test the whole flow with no Stripe/SMTP setup)

# 3. Create the database and seed sample data
npm run setup

# 4. Run it
npm run dev
```

Then open:
- **http://localhost:3000** — the public booking page.
- **http://localhost:3000/admin** — the owner back office
  (log in with `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env`).

### Demo mode vs. live mode

- **Demo mode (default):** leave `STRIPE_SECRET_KEY` blank. Bookings are
  confirmed instantly without a real charge, and confirmation emails are printed
  to the server console. Ideal for trying the flow end-to-end.
- **Live mode:** fill in `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the
  `SMTP_*` values to take real card payments and send real email.

---

## Taking real payments with Stripe

1. Add your `STRIPE_SECRET_KEY` to `.env`.
2. Point a Stripe webhook at `POST /api/stripe/webhook` for the
   `checkout.session.completed` event, and put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
   - Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Bookings are created as `PENDING`, the client is sent to Stripe Checkout, and
   the webhook (with a success-page fallback) marks them `PAID` + `CONFIRMED`
   and sends the confirmation email.

---

## Deploying

1. Set `provider = "postgresql"` in `prisma/schema.prisma` and point
   `DATABASE_URL` at a hosted Postgres (Neon, Supabase, Railway, …).
2. Set all the env vars from `.env.example` in your host (Vercel, Railway, etc.).
3. Run `npx prisma db push` against the production database.
4. Deploy. `npm run build` runs `prisma generate` automatically.

---

## How time / slots work

The studio runs in a single timezone, so for v1 all booking times are treated as
**studio wall-clock** times and stored as the matching UTC instant (a 6pm slot is
stored as `…T18:00:00Z`). This keeps slot maths simple and avoids DST edge cases.
See `src/lib/time.ts`. (Revisit if multiple locations / timezones are ever added
— which is explicitly out of scope for Phase 1.)

---

## Project layout

```
prisma/
  schema.prisma        # Service, AvailabilityRule, Booking models
  seed.ts              # sample services + weekly hours
src/
  middleware.ts        # protects /admin
  lib/                 # env, prisma, auth, stripe, email, money, time, slots
  app/
    page.tsx           # public: list services
    book/[serviceId]/  # public: pick slot, enter details, pay
    booking/success/   # confirmation (with Stripe fallback verify)
    booking/cancelled/ # releases the slot on abandoned payment
    api/availability/  # GET slots for a service + date
    api/stripe/webhook/# Stripe payment confirmation
    admin/             # login, dashboard, services, availability
```

---

## Definition of done (Phase 1)

> A real client can visit the studio's booking page on their phone, pick a cold
> plunge session for Thursday at 6pm, pay €25, and get a confirmation email — and
> the owner sees that booking, marked paid, on their dashboard.

That flow is implemented end-to-end here.
