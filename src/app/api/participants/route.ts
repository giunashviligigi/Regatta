import { NextRequest, NextResponse } from "next/server";
import { createParticipant } from "@/lib/db";

export async function POST(request: NextRequest) {
  const data = await request.json();

  if (!data.event_id) {
    return NextResponse.json(
      { error: "event_id is required" },
      { status: 400 }
    );
  }

  const participant = await createParticipant({
    event_id: data.event_id,
    place: data.place ?? null,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    team: data.team || "",
    boat_number: data.boat_number || "",
    lane: data.lane ?? null,
    time_result: data.time_result || "",
    notes: data.notes || "",
  });

  return NextResponse.json(participant, { status: 201 });
}
