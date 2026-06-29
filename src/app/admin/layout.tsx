import Link from "next/link";
import { getCurrentStudio } from "@/lib/studio";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studio = await getCurrentStudio();

  // The login page renders without the back-office chrome.
  if (!studio) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-brand">{studio.name}</span>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/admin">Bookings</NavLink>
              <NavLink href="/admin/services">Services</NavLink>
              <NavLink href="/admin/availability">Availability</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/${studio.slug}`}
              target="_blank"
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              View booking page ↗
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
