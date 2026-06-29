"use client";

import { setInvoiceStatus, deleteInvoice } from "../../actions";

// Status buttons + print + delete. Hidden when printing (.no-print) so they
// don't appear on the saved PDF.
export function InvoiceControls({
  id,
  status,
}: {
  id: string;
  status: "DRAFT" | "SENT" | "PAID";
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {status !== "SENT" && (
        <StatusButton id={id} to="SENT" label="Mark sent" />
      )}
      {status !== "PAID" && (
        <StatusButton id={id} to="PAID" label="Mark paid" />
      )}
      {status !== "DRAFT" && (
        <StatusButton id={id} to="DRAFT" label="Back to draft" />
      )}

      <button
        type="button"
        onClick={() => window.print()}
        className="btn-secondary"
      >
        Print / Save PDF
      </button>

      <form
        action={deleteInvoice}
        onSubmit={(e) => {
          if (!confirm("Delete this invoice? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger">
          Delete
        </button>
      </form>
    </div>
  );
}

function StatusButton({
  id,
  to,
  label,
}: {
  id: string;
  to: string;
  label: string;
}) {
  return (
    <form action={setInvoiceStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className="btn-secondary">
        {label}
      </button>
    </form>
  );
}
