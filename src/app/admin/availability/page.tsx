import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { DAY_NAMES, minutesToHHMM } from "@/lib/time";
import { createAvailabilityRule, deleteAvailabilityRule } from "../actions";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const rules = await prisma.availabilityRule.findMany({
    where: { studioId: studio.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
        <p className="mt-1 text-slate-600">
          The days and hours you&apos;re open, and how many people can book the
          same slot (your capacity).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add a rule */}
        <div className="lg:col-span-1">
          <form action={createAvailabilityRule} className="card space-y-4">
            <h2 className="font-semibold text-slate-900">Add open hours</h2>
            <div>
              <label className="label" htmlFor="dayOfWeek">
                Day
              </label>
              <select id="dayOfWeek" name="dayOfWeek" className="input" required>
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="start">
                  Opens
                </label>
                <input
                  id="start"
                  name="start"
                  type="time"
                  className="input"
                  defaultValue="09:00"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="end">
                  Closes
                </label>
                <input
                  id="end"
                  name="end"
                  type="time"
                  className="input"
                  defaultValue="18:00"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="capacity">
                Capacity per slot
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                className="input"
                defaultValue={1}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Add hours
            </button>
          </form>
        </div>

        {/* List of rules grouped by day */}
        <div className="space-y-3 lg:col-span-2">
          {rules.length === 0 ? (
            <div className="card text-slate-500">
              No open hours yet. Add your weekly hours so clients can book.
            </div>
          ) : (
            DAY_NAMES.map((name, day) => {
              const dayRules = rules.filter((r) => r.dayOfWeek === day);
              if (dayRules.length === 0) return null;
              return (
                <div key={day} className="card">
                  <h3 className="mb-2 font-semibold text-slate-900">{name}</h3>
                  <ul className="space-y-2">
                    {dayRules.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-700">
                          {minutesToHHMM(rule.startMinutes)} –{" "}
                          {minutesToHHMM(rule.endMinutes)}
                          <span className="ml-2 text-slate-400">
                            · capacity {rule.capacity}
                          </span>
                        </span>
                        <form action={deleteAvailabilityRule}>
                          <input type="hidden" name="id" value={rule.id} />
                          <button
                            type="submit"
                            className="text-slate-400 hover:text-red-600"
                            aria-label="Delete"
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
