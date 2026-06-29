import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

// GET /api/availability?serviceId=...&date=YYYY-MM-DD
// Returns the bookable slots for a service on a given day.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "serviceId and a valid date (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const slots = await getAvailableSlots(serviceId, date);
  return NextResponse.json({ slots });
}
