import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { AccountingNav } from "../AccountingNav";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
};

export default async function InvoicesPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  const invoices = await prisma.invoice.findMany({
    where: { studioId: studio.id },
    include: { lineItems: true },
    orderBy: { number: "desc" },
  });

  return (
    <div className="space-y-8">
      <AccountingNav active="invoices" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link href="/admin/accounting/invoices/new" className="btn-primary">
          + New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="card text-slate-500">
          No invoices yet. Create your first one to bill a customer.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const total = computeTotals(inv.lineItems).totalCents;
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accounting/invoices/${inv.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {formatInvoiceNumber(inv.number)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {inv.customerName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${STATUS_STYLES[inv.status] ?? ""}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(total, inv.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
