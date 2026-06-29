import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudioBySlug, studioStripeEnabled } from "@/lib/studio";
import { formatMoney } from "@/lib/money";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookServicePage({
  params,
}: {
  params: Promise<{ studioSlug: string; serviceId: string }>;
}) {
  const { studioSlug, serviceId } = await params;
  const studio = await getStudioBySlug(studioSlug);
  if (!studio) notFound();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, studioId: studio.id },
  });
  if (!service || !service.active) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/${studio.slug}`}
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← All sessions
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-900">{service.name}</h1>
        <p className="mt-1 text-slate-600">
          {service.durationMinutes} min ·{" "}
          {formatMoney(service.priceCents, studio.currency)}
        </p>
        {!studioStripeEnabled(studio) && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Demo mode: payment is simulated (no real card charge).
          </p>
        )}
      </header>

      <BookingForm
        studioSlug={studio.slug}
        serviceId={service.id}
        priceLabel={formatMoney(service.priceCents, studio.currency)}
      />
    </main>
  );
}
