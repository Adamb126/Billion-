import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStudioBySlug, getStripeForStudio } from "@/lib/studio";
import { confirmBookingPaid } from "@/lib/bookings";

// Stripe webhook for payment confirmation.
//
// MULTI-TENANT: each studio uses its own Stripe account, so each configures a
// webhook endpoint pointing at:  /api/stripe/webhook?studio=<their-slug>
// The `studio` query param tells us which studio's signing secret to verify
// the request against. (The success-page fallback also reconciles payments,
// so a missing webhook degrades gracefully.)
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const studioSlug = searchParams.get("studio");
  if (!studioSlug) {
    return NextResponse.json(
      { error: "Missing ?studio=<slug> on webhook URL" },
      { status: 400 },
    );
  }

  const studio = await getStudioBySlug(studioSlug);
  const stripe = studio ? getStripeForStudio(studio) : null;
  if (!studio || !stripe || !studio.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured for this studio" },
      { status: 400 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      studio.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId && session.payment_status === "paid") {
      // Ensure the booking really belongs to this studio before confirming.
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, studioId: studio.id },
        select: { id: true },
      });
      if (booking) {
        await confirmBookingPaid(booking.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
