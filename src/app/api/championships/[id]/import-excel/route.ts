import { NextRequest, NextResponse } from "next/server";
import { getChampionship, importStartListRaces } from "@/lib/db";
import { parseStartListExcel } from "@/lib/parseStartListExcel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const championshipId = Number(id);

  if (!getChampionship(championshipId)) {
    return NextResponse.json({ error: "Championship not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const replaceExisting = formData.get("replace") === "true";

  const buffer = await file.arrayBuffer();
  const races = parseStartListExcel(buffer);

  if (races.length === 0) {
    return NextResponse.json(
      {
        error:
          "No races found in the file. Expected rows like “Race No 1” with lane and team names below.",
      },
      { status: 400 }
    );
  }

  const result = importStartListRaces(championshipId, races, replaceExisting);

  return NextResponse.json({
    success: true,
    racesFound: races.length,
    ...result,
  });
}
