import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { confirmBookingPaid } from "@/lib/bookings";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; session_id?: string }>;
}) {
  const { booking: bookingId, session_id } = await searchParams;

  let booking = bookingId
    ? await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true },
      })
    : null;

  // Fallback confirmation: if we came back from a real Stripe Checkout and the
  // webhook hasn't marked the booking paid yet, verify the session here so the
  // client still sees an accurate confirmation.
  if (
    booking &&
    booking.paymentStatus !== "PAID" &&
    session_id &&
    stripe
  ) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        await confirmBookingPaid(booking.id);
        booking = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { service: true },
        });
      }
    } catch {
      // ignore — webhook will reconcile
    }
  }

  const paid = booking?.paymentStatus === "PAID";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="card w-full">
        {paid ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✅
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Booking confirmed!
            </h1>
            <p className="mt-2 text-slate-600">
              We&apos;ve emailed your confirmation. See you soon.
            </p>
            {booking && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left text-sm">
                <Row label="Session" value={booking.service.name} />
                <Row label="When" value={formatDateTime(booking.startTime)} />
                <Row
                  label="Paid"
                  value={formatMoney(booking.amountCents, booking.currency)}
                />
                <Row label="Name" value={booking.clientName} />
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              Finishing up…
            </h1>
            <p className="mt-2 text-slate-600">
              Your payment is being confirmed. If you completed payment, your
              booking will appear shortly — check your email for confirmation.
            </p>
          </>
        )}

        <Link href="/" className="btn-secondary mt-6 inline-flex">
          Back to sessions
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-1.5 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
