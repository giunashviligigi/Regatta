import { NextRequest, NextResponse } from "next/server";
import { getAllChampionships, createChampionship } from "@/lib/db";

export async function GET() {
  const championships = getAllChampionships();
  return NextResponse.json(championships);
}

export async function POST(request: NextRequest) {
  const { name, date, location, is_live } = await request.json();

  if (!name || !date || !location) {
    return NextResponse.json(
      { error: "Name, date and location are required" },
      { status: 400 }
    );
  }

  const championship = createChampionship(name, date, location, is_live ?? false);
  return NextResponse.json(championship, { status: 201 });
}
