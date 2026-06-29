"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getStudioBySlug, getStripeForStudio } from "@/lib/studio";
import { slotIsAvailable } from "@/lib/slots";
import { confirmBookingPaid } from "@/lib/bookings";

const BookingInput = z.object({
  studioSlug: z.string().min(1),
  serviceId: z.string().min(1),
  startIso: z.string().datetime(),
  clientName: z.string().trim().min(1, "Name is required").max(120),
  clientEmail: z.string().trim().email("A valid email is required").max(200),
  clientPhone: z.string().trim().min(3, "Phone number is required").max(40),
});

export type BookingActionState = { error: string } | undefined;

// Create a pending booking and send the client to payment.
// On success this redirects (to Stripe Checkout, or straight to the success
// page in simulated-payment mode), so it only ever *returns* on error.
export async function createBooking(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = BookingInput.safeParse({
    studioSlug: formData.get("studioSlug"),
    serviceId: formData.get("serviceId"),
    startIso: formData.get("startIso"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    clientPhone: formData.get("clientPhone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid booking details" };
  }
  const data = parsed.data;

  const studio = await getStudioBySlug(data.studioSlug);
  if (!studio) {
    return { error: "Studio not found." };
  }

  // Scope the service lookup to this studio (defends against cross-tenant ids).
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, studioId: studio.id },
  });
  if (!service || !service.active) {
    return { error: "That session is no longer available." };
  }

  // Guard against double-booking a slot that filled up while the client typed.
  const available = await slotIsAvailable(studio.id, data.serviceId, data.startIso);
  if (!available) {
    return {
      error: "Sorry, that time was just taken. Please pick another slot.",
    };
  }

  const start = new Date(data.startIso);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  const booking = await prisma.booking.create({
    data: {
      studioId: studio.id,
      serviceId: service.id,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      startTime: start,
      endTime: end,
      amountCents: service.priceCents,
      currency: studio.currency,
      status: "PENDING",
      paymentStatus: "UNPAID",
    },
  });

  const stripe = getStripeForStudio(studio);
  const base = `${env.appUrl}/${studio.slug}`;

  // --- Simulated-payment mode (studio hasn't configured Stripe) -------------
  if (!stripe) {
    await confirmBookingPaid(booking.id);
    redirect(`${base}/booking/success?booking=${booking.id}&simulated=1`);
  }

  // --- Real Stripe Checkout (this studio's own Stripe account) --------------
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: studio.currency,
          unit_amount: service.priceCents,
          product_data: {
            name: service.name,
            description: `${service.durationMinutes} min session`,
          },
        },
      },
    ],
    customer_email: data.clientEmail,
    metadata: { bookingId: booking.id, studioId: studio.id },
    success_url: `${base}/booking/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/booking/cancelled?booking=${booking.id}`,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeSessionId: session.id },
  });

  redirect(session.url!);
}
