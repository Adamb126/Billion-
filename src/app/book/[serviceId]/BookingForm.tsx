"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createBooking, type BookingActionState } from "../actions";

type Slot = { startIso: string; label: string; spotsLeft: number };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function maxDateStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 60);
  return d.toISOString().slice(0, 10);
}

export function BookingForm({
  serviceId,
  priceLabel,
}: {
  serviceId: string;
  priceLabel: string;
}) {
  const [dateStr, setDateStr] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<
    BookingActionState,
    FormData
  >(createBooking, undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedIso(null);
    fetch(
      `/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${dateStr}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, dateStr]);

  return (
    <div className="space-y-6">
      {/* Step 1: pick a date */}
      <section className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Choose a date
        </h2>
        <input
          type="date"
          className="input"
          value={dateStr}
          min={todayStr()}
          max={maxDateStr()}
          onChange={(e) => setDateStr(e.target.value)}
        />
      </section>

      {/* Step 2: pick a time */}
      <section className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          2. Choose a time
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading available times…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">
            No times available on this day. Try another date.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = selectedIso === slot.startIso;
              return (
                <button
                  key={slot.startIso}
                  type="button"
                  onClick={() => setSelectedIso(slot.startIso)}
                  className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-brand"
                  }`}
                >
                  {slot.label}
                  {slot.spotsLeft <= 3 && (
                    <span
                      className={`block text-[10px] ${
                        selected ? "text-cyan-100" : "text-slate-400"
                      }`}
                    >
                      {slot.spotsLeft} left
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 3: details + pay */}
      <section className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          3. Your details
        </h2>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="startIso" value={selectedIso ?? ""} />

          <div>
            <label className="label" htmlFor="clientName">
              Full name
            </label>
            <input
              id="clientName"
              name="clientName"
              className="input"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label" htmlFor="clientEmail">
              Email
            </label>
            <input
              id="clientEmail"
              name="clientEmail"
              type="email"
              className="input"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" htmlFor="clientPhone">
              Phone
            </label>
            <input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              className="input"
              required
              autoComplete="tel"
            />
          </div>

          {!selectedIso && (
            <p className="text-sm text-slate-500">
              Pick a time above to continue.
            </p>
          )}
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!selectedIso || pending}
          >
            {pending ? "Processing…" : `Pay ${priceLabel} & confirm`}
          </button>
        </form>
      </section>
    </div>
  );
}
