"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Studio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  authenticateOwner,
  createSession,
  destroySession,
} from "@/lib/auth";
import { getCurrentStudio } from "@/lib/studio";
import { parsePriceToCents } from "@/lib/money";
import { hhmmToMinutes, dateAndMinutesToUtc } from "@/lib/time";

// Every back-office mutation runs through this, so all data access is scoped to
// the logged-in owner's own studio — never another studio's data.
async function requireStudio(): Promise<Studio> {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");
  return studio;
}

// ---- Auth -------------------------------------------------------------------

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const studio = await authenticateOwner(email, password);
  if (!studio) {
    return { error: "Incorrect email or password." };
  }
  await createSession(studio);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ---- Services ---------------------------------------------------------------

const ServiceInput = z.object({
  name: z.string().trim().min(1).max(120),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  price: z.string().min(1),
});

export async function createService(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const parsed = ServiceInput.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
  });
  if (!parsed.success) return;

  const priceCents = parsePriceToCents(parsed.data.price);
  if (priceCents === null) return;

  await prisma.service.create({
    data: {
      studioId: studio.id,
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      priceCents,
    },
  });
  revalidatePath("/admin/services");
  revalidatePath(`/${studio.slug}`);
}

export async function toggleService(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  // Scope by studioId so an owner can only toggle their own services.
  const service = await prisma.service.findFirst({
    where: { id, studioId: studio.id },
  });
  if (!service) return;
  await prisma.service.update({
    where: { id: service.id },
    data: { active: !service.active },
  });
  revalidatePath("/admin/services");
  revalidatePath(`/${studio.slug}`);
}

// ---- Availability -----------------------------------------------------------

export async function createAvailabilityRule(
  formData: FormData,
): Promise<void> {
  const studio = await requireStudio();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const start = hhmmToMinutes(String(formData.get("start") ?? ""));
  const end = hhmmToMinutes(String(formData.get("end") ?? ""));
  const capacity = Number(formData.get("capacity"));

  if (
    Number.isNaN(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    start === null ||
    end === null ||
    end <= start ||
    !Number.isFinite(capacity) ||
    capacity < 1
  ) {
    return;
  }

  await prisma.availabilityRule.create({
    data: {
      studioId: studio.id,
      dayOfWeek,
      startMinutes: start,
      endMinutes: end,
      capacity: Math.floor(capacity),
    },
  });
  revalidatePath("/admin/availability");
}

export async function deleteAvailabilityRule(
  formData: FormData,
): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  // deleteMany with studioId guard => can only delete own rules.
  await prisma.availabilityRule.deleteMany({
    where: { id, studioId: studio.id },
  });
  revalidatePath("/admin/availability");
}

// ---- Bookings ---------------------------------------------------------------

export async function cancelBooking(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  await prisma.booking.updateMany({
    where: { id, studioId: studio.id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/bookings");
}

// Owner manually adds a booking (walk-in / phone). Marked confirmed and flagged
// as owner-created. No client email is sent for manual bookings.
const ManualBookingInput = z.object({
  serviceId: z.string().min(1),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().max(200),
  clientPhone: z.string().trim().max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  markPaid: z.string().optional(),
});

export type ManualBookingState = { error: string } | { ok: true } | undefined;

export async function createManualBooking(
  _prev: ManualBookingState,
  formData: FormData,
): Promise<ManualBookingState> {
  const studio = await requireStudio();
  const parsed = ManualBookingInput.safeParse({
    serviceId: formData.get("serviceId"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    clientPhone: formData.get("clientPhone"),
    date: formData.get("date"),
    time: formData.get("time"),
    markPaid: formData.get("markPaid") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Please fill in the booking details correctly." };
  }

  const minutes = hhmmToMinutes(parsed.data.time);
  if (minutes === null) {
    return { error: "Please enter a valid time (HH:MM)." };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, studioId: studio.id },
  });
  if (!service) {
    return { error: "Select a valid service." };
  }

  const start = dateAndMinutesToUtc(parsed.data.date, minutes);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const paid = parsed.data.markPaid === "on";

  await prisma.booking.create({
    data: {
      studioId: studio.id,
      serviceId: service.id,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      clientPhone: parsed.data.clientPhone,
      startTime: start,
      endTime: end,
      amountCents: service.priceCents,
      currency: studio.currency,
      status: "CONFIRMED",
      paymentStatus: paid ? "PAID" : "UNPAID",
      createdByOwner: true,
    },
  });

  revalidatePath("/admin/bookings");
  return { ok: true };
}

// Owner marks an unpaid booking as paid (e.g. cash on arrival).
export async function markBookingPaid(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  await prisma.booking.updateMany({
    where: { id, studioId: studio.id },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });
  revalidatePath("/admin/bookings");
}
