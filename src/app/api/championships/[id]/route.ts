import { NextRequest, NextResponse } from "next/server";
import {
  getChampionship,
  updateChampionship,
  deleteChampionship,
} from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const championship = getChampionship(Number(id));
  if (!championship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(championship);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const championship = updateChampionship(Number(id), body);
  if (!championship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(championship);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteChampionship(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
