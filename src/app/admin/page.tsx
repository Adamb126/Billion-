import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudio } from "@/lib/studio";

export const dynamic = "force-dynamic";

// The studio owner's home screen: a simple hub with one tile per module.
// Booking is live; Vault (Phase 2) and Accounting (Phase 3) are placeholders.
export default async function AdminHubPage() {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900">{studio.name}</h1>
        <p className="mt-2 text-slate-600">What would you like to manage?</p>
      </div>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
        <ModuleTile
          title="Booking"
          description="Calendar, services, availability and payments."
          href="/admin/bookings"
        />
        <ModuleTile
          title="Vault"
          description="Client waivers and document storage."
          comingSoon
        />
        <ModuleTile
          title="Accounting"
          description="Revenue reporting and accounting sync."
          comingSoon
        />
      </div>
    </main>
  );
}

function ModuleTile({
  title,
  description,
  href,
  comingSoon = false,
}: {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}) {
  const inner = (
    <>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <span
        className={`mt-4 inline-block text-sm font-semibold ${
          comingSoon ? "text-slate-400" : "text-brand"
        }`}
      >
        {comingSoon ? "Under development" : "Open →"}
      </span>
    </>
  );

  // Active module: a real link. Placeholder: a non-clickable, dimmed tile.
  if (comingSoon || !href) {
    return (
      <div
        aria-disabled
        className="flex aspect-square cursor-not-allowed flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center opacity-70"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex aspect-square flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
    >
      {inner}
    </Link>
  );
}
