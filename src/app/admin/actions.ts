"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  credentialsValid,
  createSession,
  destroySession,
  isAuthenticated,
} from "@/lib/auth";
import { parsePriceToCents } from "@/lib/money";
import { hhmmToMinutes, dateAndMinutesToUtc } from "@/lib/time";

async function requireOwner() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

// ---- Auth -------------------------------------------------------------------

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!credentialsValid(email, password)) {
    return { error: "Incorrect email or password." };
  }
  await createSession();
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
  await requireOwner();
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
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      priceCents,
    },
  });
  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function toggleService(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return;
  await prisma.service.update({
    where: { id },
    data: { active: !service.active },
  });
  revalidatePath("/admin/services");
  revalidatePath("/");
}

// ---- Availability -----------------------------------------------------------

export async function createAvailabilityRule(
  formData: FormData,
): Promise<void> {
  await requireOwner();
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
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  await prisma.availabilityRule.deleteMany({ where: { id } });
  revalidatePath("/admin/availability");
}

// ---- Bookings ---------------------------------------------------------------

export async function cancelBooking(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  await prisma.booking.updateMany({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin");
}

// Owner manually adds a booking (walk-in / phone). Marked confirmed + paid and
// flagged as owner-created. No client email is sent for manual bookings.
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
  await requireOwner();
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

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
  });
  if (!service) {
    return { error: "Select a valid service." };
  }

  const start = dateAndMinutesToUtc(parsed.data.date, minutes);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const paid = parsed.data.markPaid === "on";

  await prisma.booking.create({
    data: {
      serviceId: service.id,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      clientPhone: parsed.data.clientPhone,
      startTime: start,
      endTime: end,
      amountCents: service.priceCents,
      currency: env.currency,
      status: "CONFIRMED",
      paymentStatus: paid ? "PAID" : "UNPAID",
      createdByOwner: true,
    },
  });

  revalidatePath("/admin");
  return { ok: true };
}

// Owner marks an unpaid booking as paid (e.g. cash on arrival).
export async function markBookingPaid(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  await prisma.booking.updateMany({
    where: { id },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });
  revalidatePath("/admin");
}
