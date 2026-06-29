// Slot generation: given a service, a date, the studio's availability rules and
// existing bookings, work out which start times are still bookable.

import { prisma } from "./prisma";
import { dateAndMinutesToUtc, dayOfWeekForDate, formatTime } from "./time";

export type Slot = {
  // ISO instant of the slot start (UTC representing studio wall clock).
  startIso: string;
  // "18:00" — what the client sees.
  label: string;
  // Remaining capacity for this slot.
  spotsLeft: number;
};

// Build the list of available slots for a service on a given YYYY-MM-DD date.
export async function getAvailableSlots(
  serviceId: string,
  dateStr: string,
): Promise<Slot[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return [];

  const dow = dayOfWeekForDate(dateStr);
  const rules = await prisma.availabilityRule.findMany({
    where: { dayOfWeek: dow },
    orderBy: { startMinutes: "asc" },
  });
  if (rules.length === 0) return [];

  // Count existing non-cancelled bookings on this day, keyed by start instant.
  // Capacity is "how many people can book the same slot" across the studio, so
  // we count every active booking that starts at the same time.
  const dayStart = dateAndMinutesToUtc(dateStr, 0);
  const dayEnd = dateAndMinutesToUtc(dateStr, 24 * 60);
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { startTime: true },
  });
  const bookedCount = new Map<number, number>();
  for (const b of bookings) {
    const key = b.startTime.getTime();
    bookedCount.set(key, (bookedCount.get(key) ?? 0) + 1);
  }

  const now = Date.now();
  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const rule of rules) {
    // Lay out back-to-back slots of the service's duration within the window.
    for (
      let start = rule.startMinutes;
      start + service.durationMinutes <= rule.endMinutes;
      start += service.durationMinutes
    ) {
      const startDate = dateAndMinutesToUtc(dateStr, start);
      const key = startDate.getTime();

      // Don't show the same start time twice if rules overlap.
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip slots in the past.
      if (key <= now) continue;

      const taken = bookedCount.get(key) ?? 0;
      const spotsLeft = rule.capacity - taken;
      if (spotsLeft <= 0) continue;

      slots.push({
        startIso: startDate.toISOString(),
        label: formatTime(startDate),
        spotsLeft,
      });
    }
  }

  slots.sort((a, b) => a.startIso.localeCompare(b.startIso));
  return slots;
}

// Re-check that a specific slot is still bookable (used at booking time to
// avoid races / double-booking). Returns true when there is still capacity.
export async function slotIsAvailable(
  serviceId: string,
  startIso: string,
): Promise<boolean> {
  const start = new Date(startIso);
  const dateStr = start.toISOString().slice(0, 10);
  const slots = await getAvailableSlots(serviceId, dateStr);
  return slots.some((s) => s.startIso === start.toISOString());
}
