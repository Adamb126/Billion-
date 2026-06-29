import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { formatDate, formatTime } from "@/lib/time";

// GET /admin/accounting/export
// One-click CSV of this studio's paid bookings, for the owner's accountant.
// Protected by the /admin middleware; scoped to the logged-in studio.
export async function GET() {
  const studio = await getCurrentStudio();
  if (!studio) {
    return new Response("Unauthorized", { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { studioId: studio.id, paymentStatus: "PAID" },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Paid date",
    "Session date",
    "Session time",
    "Client",
    "Email",
    "Phone",
    "Service",
    "Amount",
    "Currency",
    "Source",
  ];

  const rows = bookings.map((b) => [
    formatDate(b.createdAt),
    formatDate(b.startTime),
    formatTime(b.startTime),
    b.clientName,
    b.clientEmail,
    b.clientPhone,
    b.service.name,
    (b.amountCents / 100).toFixed(2),
    b.currency.toUpperCase(),
    b.createdByOwner ? "Manual" : "Online",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${studio.slug}-revenue-${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Quote a CSV cell, escaping embedded quotes, so commas/quotes/newlines are safe.
function csvCell(value: string): string {
  const v = String(value ?? "");
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
