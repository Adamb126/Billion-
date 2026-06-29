import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The app is multi-tenant: there's no single public booking page at the root.
// Each studio has its own booking URL at /<studio-slug>. This root page is just
// a simple landing; in production you'd point each studio's clients straight at
// their own URL.
export default async function RootPage() {
  // Only used to offer a convenient link in dev when a single studio exists.
  const studios = await prisma.studio.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="card w-full">
        <h1 className="text-2xl font-bold text-slate-900">Recovery Studio OS</h1>
        <p className="mt-2 text-slate-600">
          Each studio has its own booking page at{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
            /studio-name
          </code>
          .
        </p>

        {studios.length > 0 && (
          <div className="mt-6 space-y-2 text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Studios
            </p>
            {studios.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="block rounded-lg border border-slate-200 px-4 py-3 font-medium text-brand hover:border-brand"
              >
                {s.name} → /{s.slug}
              </Link>
            ))}
          </div>
        )}

        <Link href="/admin" className="btn-secondary mt-6 inline-flex">
          Studio owner login
        </Link>
      </div>
    </main>
  );
}
