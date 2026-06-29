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
          {/* Studio name links back to the hub. */}
          <Link href="/admin" className="font-bold text-brand">
            {studio.name}
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
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
