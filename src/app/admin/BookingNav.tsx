import Link from "next/link";

type Section = "bookings" | "services" | "availability";

// Sub-navigation shown inside the Booking module (Bookings / Services /
// Availability), plus a way back to the studio hub and out to the live page.
export function BookingNav({
  active,
  studioSlug,
}: {
  active: Section;
  studioSlug: string;
}) {
  const tabs: { key: Section; label: string; href: string }[] = [
    { key: "bookings", label: "Bookings", href: "/admin/bookings" },
    { key: "services", label: "Services", href: "/admin/services" },
    { key: "availability", label: "Availability", href: "/admin/availability" },
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
      <Link
        href={`/${studioSlug}`}
        target="_blank"
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        View booking page ↗
      </Link>
    </div>
  );
}
