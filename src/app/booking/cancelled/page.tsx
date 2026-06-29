import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// When a client abandons Stripe Checkout, clean up the un-paid pending booking
// so it doesn't hold a slot.
export default async function CancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking: bookingId } = await searchParams;

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (booking && booking.paymentStatus !== "PAID") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="card w-full">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment cancelled
        </h1>
        <p className="mt-2 text-slate-600">
          No payment was taken and your slot was released. You can start again
          whenever you&apos;re ready.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back to sessions
        </Link>
      </div>
    </main>
  );
}
