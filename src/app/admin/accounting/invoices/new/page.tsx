import { redirect } from "next/navigation";
import { getCurrentStudio } from "@/lib/studio";
import { currencySymbol } from "@/lib/money";
import { todayDateStr } from "@/lib/time";
import { AccountingNav } from "../../AccountingNav";
import { NewInvoiceForm } from "./NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  return (
    <div className="space-y-8">
      <AccountingNav active="invoices" />
      <h1 className="text-2xl font-bold text-slate-900">New invoice</h1>
      <NewInvoiceForm
        currencySymbol={currencySymbol(studio.currency)}
        today={todayDateStr()}
      />
    </div>
  );
}
