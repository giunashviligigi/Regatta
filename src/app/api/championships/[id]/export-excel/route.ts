import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getChampionshipFull } from "@/lib/db";

function safeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const championship = await getChampionshipFull(Number(id));

  if (!championship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows: (string | number)[][] = [];
  rows.push([`CHAMPIONSHIP RESULTS – ${championship.name}`]);
  rows.push([`Date: ${championship.date}`, `Location: ${championship.location}`]);
  rows.push([]);

  championship.events.forEach((event, idx) => {
    const participants = [...event.participants].sort((a, b) => {
      if (a.lane === null && b.lane === null) return a.id - b.id;
      if (a.lane === null) return 1;
      if (b.lane === null) return -1;
      return a.lane - b.lane;
    });

    rows.push([
      `Race No ${idx + 1}`,
      `${event.name}${event.start_time ? ` ${event.start_time}` : ""}`,
    ]);
    rows.push(["Lane", ...participants.map((p) => p.lane ?? "")]);
    rows.push(["Team names", ...participants.map((p) => p.team || "")]);
    rows.push(["First name", ...participants.map((p) => p.first_name || "")]);
    rows.push(["Last name", ...participants.map((p) => p.last_name || "")]);
    rows.push(["Boat #", ...participants.map((p) => p.boat_number || "")]);
    rows.push(["Time", ...participants.map((p) => p.time_result || "")]);
    rows.push(["Place", ...participants.map((p) => p.place ?? "")]);
    rows.push(["Notes", ...participants.map((p) => p.notes || "")]);
    rows.push([]);
    rows.push([]);
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Results");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filenameBase = safeFileName(championship.name) || `championship-${id}`;
  const filename = `${filenameBase}-results.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
