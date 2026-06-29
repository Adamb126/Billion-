import { NextResponse } from "next/server";
import { getStudioBySlug } from "@/lib/studio";
import { getAvailableSlots } from "@/lib/slots";

// GET /api/availability?studio=<slug>&serviceId=...&date=YYYY-MM-DD
// Returns the bookable slots for a service on a given day, scoped to the studio.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studioSlug = searchParams.get("studio");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!studioSlug || !serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "studio, serviceId and a valid date (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const studio = await getStudioBySlug(studioSlug);
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }

  const slots = await getAvailableSlots(studio.id, serviceId, date);
  return NextResponse.json({ slots });
}
