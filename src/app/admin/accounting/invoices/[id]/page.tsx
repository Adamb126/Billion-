import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/time";
import {
  computeTotals,
  formatInvoiceNumber,
  lineNetCents,
} from "@/lib/invoices";
import { AccountingNav } from "../../AccountingNav";
import { InvoiceControls } from "./InvoiceControls";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
};

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const invoice = await prisma.invoice.findFirst({
    where: { id, studioId: studio.id },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();

  const totals = computeTotals(invoice.lineItems);
  const cur = invoice.currency;

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <AccountingNav active="invoices" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/accounting/invoices"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← All invoices
          </Link>
          <InvoiceControls id={invoice.id} status={invoice.status} />
        </div>
      </div>

      {/* The printable invoice document */}
      <div className="card mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{studio.name}</h1>
            {studio.invoiceAddress && (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                {studio.invoiceAddress}
              </p>
            )}
            {studio.invoiceTaxId && (
              <p className="mt-1 text-sm text-slate-500">
                VAT/Tax no: {studio.invoiceTaxId}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand">INVOICE</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatInvoiceNumber(invoice.number)}
            </p>
            <span
              className={`badge mt-2 ${STATUS_STYLES[invoice.status] ?? ""}`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Bill to
            </p>
            <p className="font-semibold text-slate-900">
              {invoice.customerName}
            </p>
            {invoice.customerEmail && (
              <p className="text-slate-500">{invoice.customerEmail}</p>
            )}
            {invoice.customerAddress && (
              <p className="whitespace-pre-line text-slate-500">
                {invoice.customerAddress}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-slate-500">
              <span className="text-slate-400">Issued:</span>{" "}
              {formatDate(invoice.issueDate)}
            </p>
            {invoice.dueDate && (
              <p className="text-slate-500">
                <span className="text-slate-400">Due:</span>{" "}
                {formatDate(invoice.dueDate)}
              </p>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit</th>
              <th className="py-2 text-right font-medium">VAT</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-900">{item.description}</td>
                <td className="py-2 text-right text-slate-600">
                  {item.quantity}
                </td>
                <td className="py-2 text-right text-slate-600">
                  {formatMoney(item.unitPriceCents, cur)}
                </td>
                <td className="py-2 text-right text-slate-600">
                  {item.vatRate}%
                </td>
                <td className="py-2 text-right font-medium text-slate-900">
                  {formatMoney(lineNetCents(item), cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={formatMoney(totals.subtotalCents, cur)} />
            {totals.vatByRate.map((v) => (
              <Row
                key={v.rate}
                label={`VAT @ ${v.rate}%`}
                value={formatMoney(v.vatCents, cur)}
              />
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(totals.totalCents, cur)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
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
