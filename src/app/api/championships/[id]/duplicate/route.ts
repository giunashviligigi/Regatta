import { NextRequest, NextResponse } from "next/server";
import { duplicateChampionship } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const championship = duplicateChampionship(Number(id));
  if (!championship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(championship, { status: 201 });
}
