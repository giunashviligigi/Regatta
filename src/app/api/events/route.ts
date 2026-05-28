import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { championship_id, name, sort_order, start_time } = await request.json();

  if (!championship_id || !name) {
    return NextResponse.json(
      { error: "championship_id and name are required" },
      { status: 400 }
    );
  }

  const event = await createEvent(
    championship_id,
    name,
    typeof sort_order === "number" ? sort_order : undefined,
    start_time || ""
  );
  return NextResponse.json(event, { status: 201 });
}
