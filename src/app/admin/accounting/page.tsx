import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { computeTotals } from "@/lib/invoices";
import { AccountingNav } from "./AccountingNav";

export const dynamic = "force-dynamic";

// Phase 3 (started simple): a revenue dashboard built from the payment data we
// already hold. We report; we don't replace the accountant's tools. Revenue is
// counted by when a booking was paid/recorded (its createdAt), which is the
// best proxy we have for "money received".
export default async function AccountingPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // Week starts Monday.
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const startOfWeek = new Date(
    startOfToday.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000,
  );
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const paidWhere = { studioId: studio.id, paymentStatus: "PAID" as const };

  // Period takings + all-time + by-service breakdown + recent payments.
  const [today, week, month, allTime, byServiceRaw, services, recent] =
    await Promise.all([
      sumPaid(paidWhere, startOfToday),
      sumPaid(paidWhere, startOfWeek),
      sumPaid(paidWhere, startOfMonth),
      sumPaid(paidWhere),
      prisma.booking.groupBy({
        by: ["serviceId"],
        where: paidWhere,
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.service.findMany({
        where: { studioId: studio.id },
        select: { id: true, name: true },
      }),
      prisma.booking.findMany({
        where: paidWhere,
        include: { service: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  // Outstanding = unpaid invoices (DRAFT + SENT), totalled from their lines.
  const openInvoices = await prisma.invoice.findMany({
    where: { studioId: studio.id, status: { in: ["DRAFT", "SENT"] } },
    include: { lineItems: true },
  });
  const outstandingCents = openInvoices.reduce(
    (sum, inv) => sum + computeTotals(inv.lineItems).totalCents,
    0,
  );

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const byService = byServiceRaw
    .map((row) => ({
      name: serviceName.get(row.serviceId) ?? "Unknown",
      count: row._count._all,
      revenue: row._sum.amountCents ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const cur = studio.currency;

  return (
    <div className="space-y-8">
      <AccountingNav active="overview" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <a href="/admin/accounting/export" className="btn-secondary">
          Download CSV
        </a>
      </div>

      <p className="text-sm text-slate-500">
        Revenue from paid bookings. Figures are counted on the date each booking
        was paid.
      </p>

      {/* Takings */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" amount={formatMoney(today.sum, cur)} sub={`${today.count} paid`} />
        <StatCard label="This week" amount={formatMoney(week.sum, cur)} sub={`${week.count} paid`} />
        <StatCard label="This month" amount={formatMoney(month.sum, cur)} sub={`${month.count} paid`} />
        <StatCard label="All time" amount={formatMoney(allTime.sum, cur)} sub={`${allTime.count} paid`} />
      </div>

      {/* Outstanding invoices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Outstanding invoices"
          amount={formatMoney(outstandingCents, cur)}
          sub={`${openInvoices.length} unpaid`}
        />
      </div>

      {/* By service */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Revenue by service
        </h2>
        {byService.length === 0 ? (
          <div className="card text-slate-500">No paid bookings yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Paid bookings</th>
                  <th className="px-4 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byService.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(row.revenue, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent payments */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent payments
        </h2>
        {recent.length === 0 ? (
          <div className="card text-slate-500">No payments yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {recent.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {b.clientName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {b.service.name}
                        {b.createdByOwner ? " · manual" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(b.amountCents, b.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Sum + count of paid bookings, optionally from `since` (by paid/created date).
async function sumPaid(
  where: { studioId: string; paymentStatus: "PAID" },
  since?: Date,
): Promise<{ sum: number; count: number }> {
  const agg = await prisma.booking.aggregate({
    _sum: { amountCents: true },
    _count: { _all: true },
    where: since ? { ...where, createdAt: { gte: since } } : where,
  });
  return { sum: agg._sum.amountCents ?? 0, count: agg._count._all };
}

function StatCard({
  label,
  amount,
  sub,
}: {
  label: string;
  amount: string;
  sub: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{amount}</div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}
