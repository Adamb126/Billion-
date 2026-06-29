"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createManualBooking,
  type ManualBookingState,
} from "../actions";

type ServiceOption = { id: string; name: string };

export function ManualBookingForm({
  services,
  todayStr,
}: {
  services: ServiceOption[];
  todayStr: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ManualBookingState,
    FormData
  >(createManualBooking, undefined);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  if (services.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        Add a service first to take manual bookings.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Add a booking</h2>
        <button
          type="button"
          className="text-sm font-medium text-brand hover:text-brand-dark"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "+ Walk-in / phone booking"}
        </button>
      </div>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="m-service">
              Service
            </label>
            <select id="m-service" name="serviceId" className="input" required>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="m-date">
                Date
              </label>
              <input
                id="m-date"
                name="date"
                type="date"
                className="input"
                defaultValue={todayStr}
                min={todayStr}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="m-time">
                Time
              </label>
              <input
                id="m-time"
                name="time"
                type="time"
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="m-name">
              Client name
            </label>
            <input id="m-name" name="clientName" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="m-email">
                Email
              </label>
              <input
                id="m-email"
                name="clientEmail"
                type="email"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="m-phone">
                Phone
              </label>
              <input id="m-phone" name="clientPhone" type="tel" className="input" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="markPaid"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300"
            />
            Already paid
          </label>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state && "ok" in state && state.ok && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Booking added.
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Adding…" : "Add booking"}
          </button>
        </form>
      )}
    </div>
  );
}
