import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatMoney, currencySymbol } from "@/lib/money";
import { createService, toggleService } from "../actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const services = await prisma.service.findMany({
    where: { studioId: studio.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <p className="mt-1 text-slate-600">
          The sessions clients can book. Name, duration and price.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add a service */}
        <div className="lg:col-span-1">
          <form action={createService} className="card space-y-4">
            <h2 className="font-semibold text-slate-900">Add a service</h2>
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                className="input"
                placeholder="30-min Cold Plunge"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="durationMinutes">
                Duration (minutes)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                step={5}
                className="input"
                placeholder="30"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="price">
                Price ({currencySymbol(studio.currency)})
              </label>
              <input
                id="price"
                name="price"
                className="input"
                placeholder="25"
                inputMode="decimal"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Add service
            </button>
          </form>
        </div>

        {/* List of services */}
        <div className="space-y-3 lg:col-span-2">
          {services.length === 0 ? (
            <div className="card text-slate-500">
              No services yet. Add your first one to start taking bookings.
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="card flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {service.name}
                    </h3>
                    {service.active ? (
                      <span className="badge bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {service.durationMinutes} min ·{" "}
                    {formatMoney(service.priceCents, studio.currency)}
                  </p>
                </div>
                <form action={toggleService}>
                  <input type="hidden" name="id" value={service.id} />
                  <button type="submit" className="btn-secondary">
                    {service.active ? "Hide" : "Show"}
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
