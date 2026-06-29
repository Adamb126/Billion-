import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { confirmBookingPaid } from "@/lib/bookings";

// Stripe needs the raw request body to verify the webhook signature, so this
// route reads the body as text (Next App Router gives us the raw body here).
export async function POST(request: Request) {
  if (!stripe || !env.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
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
      env.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId && session.payment_status === "paid") {
      await confirmBookingPaid(bookingId);
    }
  }

  return NextResponse.json({ received: true });
}
