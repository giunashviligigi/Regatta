import { NextRequest, NextResponse } from "next/server";
import { updateParticipant, deleteParticipant } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await request.json();
  const participant = updateParticipant(Number(id), {
    place: data.place ?? null,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    team: data.team || "",
    boat_number: data.boat_number || "",
    lane: data.lane ?? null,
    time_result: data.time_result || "",
    notes: data.notes || "",
  });
  if (!participant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(participant);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteParticipant(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
