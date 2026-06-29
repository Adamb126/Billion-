// Shared booking operations used by both the client flow and the Stripe webhook.

import { prisma } from "./prisma";
import { sendBookingConfirmation } from "./email";

// Mark a booking as paid + confirmed and send the confirmation email.
// Idempotent: if the booking is already confirmed, it does nothing (so the
// Stripe webhook and the success-page fallback can't double-send).
export async function confirmBookingPaid(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });
  if (!booking) return;
  if (booking.status === "CONFIRMED" && booking.paymentStatus === "PAID") {
    return; // already handled
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED", paymentStatus: "PAID" },
  });

  await sendBookingConfirmation({
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    serviceName: booking.service.name,
    startTime: booking.startTime,
    amountCents: booking.amountCents,
    currency: booking.currency,
  });
}
