import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {env.studioName}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Book your recovery session
        </h1>
        <p className="mt-2 text-slate-600">
          Choose a session below, pick a time, and pay to confirm your spot.
        </p>
      </header>

      {services.length === 0 ? (
        <div className="card text-center text-slate-600">
          No sessions are available to book right now. Please check back soon.
        </div>
      ) : (
        <ul className="space-y-4">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={`/book/${service.id}`}
                className="card flex items-center justify-between gap-4 transition hover:border-brand hover:shadow-md"
              >
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {service.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {service.durationMinutes} min
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-brand">
                    {formatMoney(service.priceCents)}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-brand">
                    Book →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 text-center text-xs text-slate-400">
        <Link href="/admin" className="hover:text-slate-600">
          Studio owner login
        </Link>
      </footer>
    </main>
  );
}
