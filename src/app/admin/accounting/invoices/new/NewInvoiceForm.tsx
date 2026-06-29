"use client";

import { useActionState, useState } from "react";
import { createInvoice, type InvoiceFormState } from "../../actions";
import { VAT_RATES } from "@/lib/invoices";

type Row = {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
};

let nextKey = 1;
function blankRow(): Row {
  return {
    key: nextKey++,
    description: "",
    quantity: "1",
    unitPrice: "",
    vatRate: "0",
  };
}

export function NewInvoiceForm({
  currencySymbol,
  today,
}: {
  currencySymbol: string;
  today: string;
}) {
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [state, formAction, pending] = useActionState<
    InvoiceFormState,
    FormData
  >(createInvoice, undefined);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  // Live total preview (mirrors src/lib/invoices.ts maths).
  const totals = rows.reduce(
    (acc, r) => {
      const qty = Number(r.quantity) || 0;
      const unit = Math.round((Number(r.unitPrice) || 0) * 100);
      const net = Math.round(qty * unit);
      const vat = Math.round((net * (Number(r.vatRate) || 0)) / 100);
      acc.net += net;
      acc.vat += vat;
      return acc;
    },
    { net: 0, vat: 0 },
  );
  const fmt = (cents: number) => `${currencySymbol}${(cents / 100).toFixed(2)}`;

  return (
    <form action={formAction} className="space-y-6">
      {/* Customer + dates */}
      <div className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="customerName">
            Customer name
          </label>
          <input id="customerName" name="customerName" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="customerEmail">
            Customer email
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="customerAddress">
            Customer address
          </label>
          <textarea
            id="customerAddress"
            name="customerAddress"
            className="input"
            rows={2}
          />
        </div>
        <div>
          <label className="label" htmlFor="issueDate">
            Issue date
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            className="input"
            defaultValue={today}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="dueDate">
            Due date (optional)
          </label>
          <input id="dueDate" name="dueDate" type="date" className="input" />
        </div>
      </div>

      {/* Line items */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Line items</h2>
          <button type="button" onClick={addRow} className="btn-secondary">
            + Add line
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 p-2"
            >
              <div className="col-span-12 sm:col-span-5">
                <label className="label text-xs">Description</label>
                <input
                  name="description"
                  className="input"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.key, { description: e.target.value })
                  }
                  placeholder="e.g. 10-session cold plunge package"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className="label text-xs">Qty</label>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="any"
                  className="input"
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(row.key, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="label text-xs">Unit price</label>
                <input
                  name="unitPrice"
                  inputMode="decimal"
                  className="input"
                  value={row.unitPrice}
                  onChange={(e) =>
                    updateRow(row.key, { unitPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className="label text-xs">VAT %</label>
                <input
                  name="vatRate"
                  list="vat-rates"
                  inputMode="decimal"
                  className="input"
                  value={row.vatRate}
                  onChange={(e) =>
                    updateRow(row.key, { vatRate: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="px-2 py-2 text-slate-400 hover:text-red-600"
                  aria-label={`Remove line ${i + 1}`}
                  disabled={rows.length === 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="vat-rates">
          {VAT_RATES.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>

        {/* Totals preview */}
        <div className="ml-auto w-full max-w-xs space-y-1 pt-2 text-sm">
          <Row label="Subtotal" value={fmt(totals.net)} />
          <Row label="VAT" value={fmt(totals.vat)} />
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold">
            <span>Total</span>
            <span>{fmt(totals.net + totals.vat)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input"
          rows={2}
          placeholder="Payment terms, bank details, thank-you note…"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save invoice"}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
