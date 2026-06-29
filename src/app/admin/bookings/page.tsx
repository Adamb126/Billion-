import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatMoney } from "@/lib/money";
import { formatDate, formatTime, todayDateStr } from "@/lib/time";
import { cancelBooking, markBookingPaid } from "../actions";
import { BookingNav } from "../BookingNav";
import { ManualBookingForm } from "./ManualBookingForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const [upcoming, services, paidTodayAgg] = await Promise.all([
    prisma.booking.findMany({
      where: {
        studioId: studio.id,
        startTime: { gte: startOfToday },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { service: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.service.findMany({
      where: { studioId: studio.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.booking.aggregate({
      _sum: { amountCents: true },
      where: {
        studioId: studio.id,
        paymentStatus: "PAID",
        startTime: {
          gte: startOfToday,
          lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Group bookings by day for an at-a-glance calendar feel.
  const byDay = new Map<string, typeof upcoming>();
  for (const b of upcoming) {
    const key = b.startTime.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(b);
  }

  const paidToday = paidTodayAgg._sum.amountCents ?? 0;
  const confirmedCount = upcoming.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="space-y-8">
      <BookingNav active="bookings" studioSlug={studio.slug} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-slate-600">Your upcoming sessions.</p>
        </div>
        <div className="flex gap-6">
          <Stat label="Upcoming (confirmed)" value={String(confirmedCount)} />
          <Stat
            label="Paid today"
            value={formatMoney(paidToday, studio.currency)}
          />
        </div>
      </div>

      <ManualBookingForm services={services} todayStr={todayDateStr()} />

      {byDay.size === 0 ? (
        <div className="card text-slate-500">
          No upcoming bookings yet. When clients book, they&apos;ll appear here.
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, bookings]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {formatDate(new Date(day + "T00:00:00Z"))}
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                          {formatTime(b.startTime)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {b.clientName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {b.service.name}
                            {b.clientPhone ? ` · ${b.clientPhone}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {b.paymentStatus === "PAID" ? (
                            <span className="badge bg-green-100 text-green-700">
                              Paid · {formatMoney(b.amountCents, b.currency)}
                            </span>
                          ) : (
                            <span className="badge bg-amber-100 text-amber-700">
                              Unpaid
                            </span>
                          )}
                          {b.status === "PENDING" && (
                            <span className="badge ml-1 bg-slate-100 text-slate-500">
                              Awaiting payment
                            </span>
                          )}
                          {b.createdByOwner && (
                            <span className="badge ml-1 bg-slate-100 text-slate-500">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {b.paymentStatus !== "PAID" && (
                              <form action={markBookingPaid}>
                                <input type="hidden" name="id" value={b.id} />
                                <button
                                  type="submit"
                                  className="text-xs font-medium text-brand hover:text-brand-dark"
                                >
                                  Mark paid
                                </button>
                              </form>
                            )}
                            <form action={cancelBooking}>
                              <input type="hidden" name="id" value={b.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-slate-400 hover:text-red-600"
                              >
                                Cancel
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
