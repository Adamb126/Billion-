// Seed the database with a couple of sample services and a basic weekly
// schedule so the app is usable straight after setup. Safe to re-run: it only
// seeds when the tables are empty.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        { name: "30-min Cold Plunge", durationMinutes: 30, priceCents: 2500 },
        {
          name: "60-min Sauna + Plunge",
          durationMinutes: 60,
          priceCents: 4000,
        },
      ],
    });
    console.log("Seeded sample services.");
  }

  const ruleCount = await prisma.availabilityRule.count();
  if (ruleCount === 0) {
    // Open Mon–Fri 9:00–18:00 (capacity 2), Sat 10:00–14:00 (capacity 2).
    const weekdayRules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
      capacity: 2,
    }));
    await prisma.availabilityRule.createMany({
      data: [
        ...weekdayRules,
        { dayOfWeek: 6, startMinutes: 10 * 60, endMinutes: 14 * 60, capacity: 2 },
      ],
    });
    console.log("Seeded weekly availability.");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
