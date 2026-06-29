# Recovery Studio OS — Phase 1 (Booking + Payments)

Software for recovery / wellness studios (cold plunge, sauna, contrast therapy)
to manage bookings and take payments online — one connected system the owner and
their clients use every day.

This repository implements **Phase 1** of the build spec: **Booking + Payments**.
Phases 2 (Waivers + Document Vault) and 3 (Financial Reporting + Accounting Sync)
are intentionally **not** built yet.

---

## Multi-tenant by design

This is **one shared app that serves many studios**, not a separate site per
studio. It's built that way from day one so adding studio #2 is a config change,
not a rebuild.

- **Each studio is a tenant** (a row in the `Studio` table). Every service,
  availability rule and booking is tagged with its `studioId`, and **every query
  is scoped by studio**, so one studio can never see another's data.
- **Each studio has its own booking URL:** `yourapp.com/<studio-slug>`
  (e.g. `/northside-recovery`). The page reads the slug, finds the studio, and
  shows only that studio's services and slots.
- **Each studio has its own owner login and its own Stripe account**, so payments
  land in that studio's Stripe — not a shared platform account.
- **One back office at `/admin`**, scoped by who logs in: an owner only ever sees
  their own studio's data.

Only one studio needs to be live right now; there's no public studio sign-up
flow yet (a studio is set up manually — see "Adding another studio" below).
Subdomains and custom domains are deliberately left for later.

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

`npm run setup` seeds the **first studio** from your `.env` (slug `STUDIO_SLUG`).
Then open:
- **http://localhost:3000/my-studio** — that studio's public booking page
  (`my-studio` is the default `STUDIO_SLUG`).
- **http://localhost:3000/admin** — the owner back office
  (log in with `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env`).
- **http://localhost:3000** — a simple root landing that links to each studio.

### Demo mode vs. live mode

Payment mode is **per studio** (each studio has its own Stripe keys):

- **Demo mode (default):** a studio with no `stripeSecretKey` confirms bookings
  instantly without a real charge, and confirmation emails are printed to the
  server console. The first studio is seeded with whatever `STRIPE_SECRET_KEY`
  is in `.env` — leave it blank for demo mode.
- **Live mode:** give the studio real Stripe keys (seeded from `.env` for the
  first studio, or set on the `Studio` row) and configure `SMTP_*` to send real
  email.

---

## Taking real payments with Stripe (per studio)

Each studio uses **its own Stripe account**, so money lands in the studio's
account, not a shared one.

1. Put the studio's `STRIPE_SECRET_KEY` on its `Studio` row (seeded from `.env`
   for the first studio).
2. In **that studio's Stripe account**, add a webhook for the
   `checkout.session.completed` event pointing at:
   ```
   POST /api/stripe/webhook?studio=<studio-slug>
   ```
   The `?studio=` part tells the app which studio's signing secret to verify
   against. Save the signing secret to the studio's `stripeWebhookSecret`.
   - Locally: `stripe listen --forward-to "localhost:3000/api/stripe/webhook?studio=my-studio"`
3. Bookings are created as `PENDING`, the client is sent to Stripe Checkout, and
   the webhook (with a success-page fallback) marks them `PAID` + `CONFIRMED`
   and sends the confirmation email.

---

## Adding another studio

No rebuild and no sign-up flow needed — insert a `Studio` row. For example with
Prisma Studio (`npm run db:studio`) or a script:

```ts
await prisma.studio.create({
  data: {
    slug: "northside-recovery",      // its booking URL: /northside-recovery
    name: "Northside Recovery",
    currency: "eur",
    ownerEmail: "owner@northside.ie", // lower-case
    ownerPassword: "their-password",
    stripeSecretKey: "sk_live_...",   // optional; null => demo mode
    stripeWebhookSecret: "whsec_...", // optional
  },
});
```

That studio is immediately live at `/northside-recovery`, its owner can log in at
`/admin`, and its data is fully isolated from every other studio.

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
  schema.prisma          # Studio (tenant), Service, AvailabilityRule, Booking
  seed.ts                # first studio + its sample services + weekly hours
src/
  middleware.ts          # protects /admin
  lib/                   # env, prisma, auth, studio, email, money, time, slots,
                         #   bookings  (studio.ts = tenant resolution + Stripe)
  app/
    page.tsx             # root landing (links to each studio)
    [studioSlug]/
      page.tsx           # public: that studio's services
      book/[serviceId]/  # public: pick slot, enter details, pay
      booking/success/   # confirmation (with Stripe fallback verify)
      booking/cancelled/ # releases the slot on abandoned payment
    api/availability/    # GET slots: ?studio=<slug>&serviceId&date
    api/stripe/webhook/  # per-studio webhook: ?studio=<slug>
    admin/               # login + dashboard/services/availability, scoped to
                         #   the logged-in owner's studio
```

Every data access in `lib/` and `app/` is scoped by `studioId`, so tenants are
isolated. See `src/lib/studio.ts` for how the current studio is resolved (by URL
slug for public pages, by session for the back office).

---

## Definition of done (Phase 1)

> A real client can visit the studio's booking page on their phone, pick a cold
> plunge session for Thursday at 6pm, pay €25, and get a confirmation email — and
> the owner sees that booking, marked paid, on their dashboard.

That flow is implemented end-to-end here.
