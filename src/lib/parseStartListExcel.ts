import * as XLSX from "xlsx";

export interface ParsedRaceParticipant {
  lane: number | null;
  team: string;
  place: number | null;
  time_result: string;
}

export interface ParsedRace {
  raceNumber: number | null;
  name: string;
  start_time: string;
  participants: ParsedRaceParticipant[];
}

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const n = Number(cellStr(value));
  return Number.isNaN(n) ? null : n;
}

function extractTime(text: string): string {
  const match = text.match(/(\d{1,2}:\d{2})\s*$/);
  if (!match) return "";
  const [h, m] = match[1].split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function stripTimeFromName(text: string): string {
  return text.replace(/\s*\d{1,2}:\d{2}\s*$/, "").replace(/\s+/g, " ").trim();
}

function parseRaceNumber(label: string): number | null {
  const match = label.match(/Race\s*No\.?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isLaneRow(row: unknown[]): boolean {
  return /^lane$/i.test(cellStr(row[0]));
}

function isTeamNamesRow(row: unknown[]): boolean {
  return /^team\s*names?$/i.test(cellStr(row[0]));
}

function isTimeRow(row: unknown[]): boolean {
  return /^time$/i.test(cellStr(row[0]));
}

function isPlaceRow(row: unknown[]): boolean {
  return /^place$/i.test(cellStr(row[0]));
}

/** Format finish time from Excel (formatted string or serial number). */
function parseFinishTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") {
    const s = value.trim();
    return s;
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    const totalSeconds = Math.round(value * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return cellStr(value);
}

function parseLaneValue(laneRow: unknown[] | null, col: number): number | null {
  if (!laneRow) return col;
  const laneVal = laneRow[col];
  if (typeof laneVal === "number" && !Number.isNaN(laneVal)) return laneVal;
  const n = parseNumber(laneVal);
  return n ?? col;
}

/** Parse dragon-boat style start list sheets (Race No + Lane + Team + Time + Place). */
export function parseStartListExcel(buffer: ArrayBuffer): ParsedRace[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];

  // Formatted display values (times as "6:32", places as "1")
  const formattedRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  // Raw values for numeric fallbacks
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const races: ParsedRace[] = [];
  for (let i = 0; i < formattedRows.length; i++) {
    const col0 = cellStr(formattedRows[i][0]);
    if (!/^Race\s*No/i.test(col0)) continue;

    const raceNumber = parseRaceNumber(col0);
    const rawDescription = cellStr(formattedRows[i][1]);
    const start_time = extractTime(rawDescription);

    let name = stripTimeFromName(rawDescription);
    if (!name && raceNumber !== null) {
      name = `Race ${raceNumber}`;
    } else if (raceNumber !== null) {
      name = `Race ${raceNumber} – ${name}`;
    }

    let laneRow: unknown[] | null = null;
    let teamRow: unknown[] | null = null;
    let timeRow: unknown[] | null = null;
    let placeRow: unknown[] | null = null;
    let timeRowRaw: unknown[] | null = null;

    for (let j = i + 1; j < Math.min(i + 10, formattedRows.length); j++) {
      if (/^Race\s*No/i.test(cellStr(formattedRows[j][0]))) break;
      if (isLaneRow(formattedRows[j])) laneRow = formattedRows[j];
      if (isTeamNamesRow(formattedRows[j])) teamRow = formattedRows[j];
      if (isTimeRow(formattedRows[j])) {
        timeRow = formattedRows[j];
        timeRowRaw = rawRows[j];
      }
      if (isPlaceRow(formattedRows[j])) placeRow = formattedRows[j];
    }

    const participants: ParsedRaceParticipant[] = [];

    if (teamRow) {
      const maxCols = Math.max(
        teamRow.length,
        laneRow?.length ?? 0,
        timeRow?.length ?? 0,
        placeRow?.length ?? 0
      );

      for (let col = 1; col < maxCols; col++) {
        const team = cellStr(teamRow[col]);
        if (!team) continue;

        const lane = parseLaneValue(laneRow, col);

        let time_result = "";
        if (timeRow) {
          const formattedTime = timeRow[col];
          const rawTime = timeRowRaw?.[col];
          time_result = parseFinishTime(
            cellStr(formattedTime) ? formattedTime : rawTime
          );
        }

        let place: number | null = null;
        if (placeRow) {
          place = parseNumber(placeRow[col]);
        }

        participants.push({ lane, team, place, time_result });
      }
    }

    races.push({
      raceNumber,
      name,
      start_time,
      participants,
    });
  }

  return races;
}
