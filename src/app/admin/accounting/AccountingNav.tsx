import Link from "next/link";

type Section = "overview" | "invoices";

// Sub-navigation for the Accounting module (Overview / Invoices) + back to hub.
export function AccountingNav({ active }: { active: Section }) {
  const tabs: { key: Section; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: "/admin/accounting" },
    { key: "invoices", label: "Invoices", href: "/admin/accounting/invoices" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div className="flex items-center gap-1">
        <Link
          href="/admin"
          className="mr-2 rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-slate-700"
        >
          ← Hub
        </Link>
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab.key === active
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
