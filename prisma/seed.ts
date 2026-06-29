// Seed the database with the first studio (from .env) plus a couple of sample
// services and a basic weekly schedule, so the app is usable straight after
// setup. Safe to re-run: it won't duplicate a studio with the same slug.
//
// Adding more studios later is just another `prisma.studio.create({...})` — no
// rebuild required.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.STUDIO_SLUG || "my-studio";
  const name = process.env.STUDIO_NAME || "Recovery Studio";
  const currency = (process.env.CURRENCY || "eur").toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || "owner@example.com")
    .trim()
    .toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD || "changeme";

  let studio = await prisma.studio.findUnique({ where: { slug } });
  if (!studio) {
    studio = await prisma.studio.create({
      data: {
        slug,
        name,
        currency,
        ownerEmail,
        ownerPassword,
        // Per-studio Stripe / email, seeded from env for the first studio.
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
        emailFrom: process.env.EMAIL_FROM || null,
      },
    });
    console.log(`Seeded studio "${name}" at /${slug}`);
  } else {
    console.log(`Studio /${slug} already exists — skipping studio seed.`);
  }

  const serviceCount = await prisma.service.count({
    where: { studioId: studio.id },
  });
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          studioId: studio.id,
          name: "30-min Cold Plunge",
          durationMinutes: 30,
          priceCents: 2500,
        },
        {
          studioId: studio.id,
          name: "60-min Sauna + Plunge",
          durationMinutes: 60,
          priceCents: 4000,
        },
      ],
    });
    console.log("Seeded sample services.");
  }

  const ruleCount = await prisma.availabilityRule.count({
    where: { studioId: studio.id },
  });
  if (ruleCount === 0) {
    // Open Mon–Fri 9:00–18:00 (capacity 2), Sat 10:00–14:00 (capacity 2).
    const weekdayRules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      studioId: studio!.id,
      dayOfWeek,
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
      capacity: 2,
    }));
    await prisma.availabilityRule.createMany({
      data: [
        ...weekdayRules,
        {
          studioId: studio.id,
          dayOfWeek: 6,
          startMinutes: 10 * 60,
          endMinutes: 14 * 60,
          capacity: 2,
        },
      ],
    });
    console.log("Seeded weekly availability.");
  }

  console.log(`Seed complete. Booking page: /${slug}  ·  Back office: /admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
