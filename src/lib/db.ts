import fs from "fs";
import path from "path";
import type {
  Championship,
  Event,
  Participant,
  EventWithParticipants,
  ChampionshipFull,
  MedalRow,
  ColumnVisibility,
} from "./types";
import { defaultColumns } from "./types";
import type { ParsedRace } from "./parseStartListExcel";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

interface DbSchema {
  nextId: {
    championship: number;
    event: number;
    participant: number;
  };
  championships: Championship[];
  events: Event[];
  participants: Participant[];
}

function defaultDb(): DbSchema {
  return {
    nextId: { championship: 1, event: 1, participant: 1 },
    championships: [],
    events: [],
    participants: [],
  };
}

function migrateChampionship(
  c: Record<string, unknown> & { id: number; name: string; date: string; location: string; created_at: string }
): Championship {
  return {
    id: c.id,
    name: c.name,
    date: c.date,
    location: c.location,
    created_at: c.created_at,
    is_live: (c.is_live as boolean) ?? false,
    visible_columns: { ...defaultColumns, ...((c.visible_columns as Partial<ColumnVisibility>) ?? {}) },
  };
}

function migrateEvent(e: Record<string, unknown> & { id: number; championship_id: number; name: string }): Event {
  return {
    id: e.id,
    championship_id: e.championship_id,
    name: e.name,
    start_time: (e.start_time as string) ?? "",
    sort_order: (e.sort_order as number) ?? 0,
    is_live_override: (e.is_live_override as boolean | null) ?? null,
  };
}

function migrateParticipant(p: Record<string, unknown> & { id: number; event_id: number }): Participant {
  return {
    id: p.id,
    event_id: p.event_id,
    place: (p.place as number | null) ?? null,
    first_name: (p.first_name as string) ?? "",
    last_name: (p.last_name as string) ?? "",
    team: (p.team as string) ?? "",
    boat_number: (p.boat_number as string) ?? "",
    lane: (p.lane as number | null) ?? null,
    time_result: (p.time_result as string) ?? "",
    notes: (p.notes as string) ?? "",
  };
}

function readDb(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return db;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as any;
  return {
    nextId: raw.nextId,
    championships: (raw.championships || []).map(migrateChampionship),
    events: (raw.events || []).map(migrateEvent),
    participants: (raw.participants || []).map(migrateParticipant),
  };
}

function writeDb(db: DbSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Auto-live computation ---

function toEventDateTime(champ: Championship, e: Event): Date | null {
  const date = (champ.date || "").trim();
  const time = (e.start_time || "").trim();
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}:00`);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function computeEventLiveStatus(champ: Championship, events: Event[]): boolean[] {
  if (!champ.is_live) return events.map(() => false);

  const now = new Date();

  // Chronological schedule (across multiple days) for auto-live windowing
  const schedule = events
    .map((e) => ({ e, dt: toEventDateTime(champ, e) }))
    .filter((x): x is { e: Event; dt: Date } => Boolean(x.dt))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  return events.map((event, idx) => {
    if (event.is_live_override === false) return false;
    if (event.is_live_override === true) return true;

    const eventStart = toEventDateTime(champ, event);
    if (!eventStart) return false;

    const pos = schedule.findIndex((x) => x.e.id === event.id);
    const next = pos >= 0 ? schedule[pos + 1] : undefined;
    const eventEnd = next?.dt ?? null;

    return now >= eventStart && (!eventEnd || now < eventEnd);
  });
}

// --- Championships ---

export function getAllChampionships(): Championship[] {
  const db = readDb();
  return [...db.championships].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );
}

export function getChampionship(id: number): Championship | undefined {
  const db = readDb();
  return db.championships.find((c) => c.id === id);
}

export function getChampionshipFull(id: number): ChampionshipFull | null {
  const db = readDb();
  const champ = db.championships.find((c) => c.id === id);
  if (!champ) return null;

  const events = db.events
    .filter((e) => e.championship_id === id)
    .sort((a, b) => {
      // IMPORTANT: Keep the same order as imported/entered (top-to-bottom in Excel).
      // `sort_order` is set on import (0..N) and when manually adding events.
      return a.sort_order - b.sort_order || a.id - b.id;
    });

  const liveStatuses = computeEventLiveStatus(champ, events);

  const eventsWithParticipants: EventWithParticipants[] = events.map(
    (event, idx) => {
      const participants = db.participants
        .filter((p) => p.event_id === event.id)
        .sort((a, b) => {
          if (a.place === null && b.place === null) return a.id - b.id;
          if (a.place === null) return 1;
          if (b.place === null) return -1;
          return a.place - b.place;
        });
      return { ...event, participants, is_live: liveStatuses[idx] };
    }
  );

  return { ...champ, events: eventsWithParticipants };
}

export function createChampionship(
  name: string,
  date: string,
  location: string,
  isLive: boolean = false,
  visibleColumns?: Partial<ColumnVisibility>
): Championship {
  const db = readDb();
  const championship: Championship = {
    id: db.nextId.championship++,
    name,
    date,
    location,
    is_live: isLive,
    visible_columns: { ...defaultColumns, ...(visibleColumns ?? {}) },
    created_at: new Date().toISOString(),
  };
  db.championships.push(championship);
  writeDb(db);
  return championship;
}

export function updateChampionship(
  id: number,
  data: { name?: string; date?: string; location?: string; is_live?: boolean; visible_columns?: Partial<ColumnVisibility> }
): Championship | null {
  const db = readDb();
  const idx = db.championships.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const c = db.championships[idx];
  db.championships[idx] = {
    ...c,
    name: data.name ?? c.name,
    date: data.date ?? c.date,
    location: data.location ?? c.location,
    is_live: data.is_live ?? c.is_live,
    visible_columns: data.visible_columns
      ? { ...c.visible_columns, ...data.visible_columns }
      : c.visible_columns,
  };
  writeDb(db);
  return db.championships[idx];
}

export function deleteChampionship(id: number): boolean {
  const db = readDb();
  const idx = db.championships.findIndex((c) => c.id === id);
  if (idx === -1) return false;

  const eventIds = db.events
    .filter((e) => e.championship_id === id)
    .map((e) => e.id);
  db.participants = db.participants.filter(
    (p) => !eventIds.includes(p.event_id)
  );
  db.events = db.events.filter((e) => e.championship_id !== id);
  db.championships.splice(idx, 1);
  writeDb(db);
  return true;
}

export function duplicateChampionship(id: number): Championship | null {
  const db = readDb();
  const source = db.championships.find((c) => c.id === id);
  if (!source) return null;

  const newChamp: Championship = {
    id: db.nextId.championship++,
    name: `${source.name} (Copy)`,
    date: new Date().toISOString().split("T")[0],
    location: source.location,
    is_live: false,
    visible_columns: { ...source.visible_columns },
    created_at: new Date().toISOString(),
  };
  db.championships.push(newChamp);

  const sourceEvents = db.events.filter((e) => e.championship_id === id);
  for (const srcEvent of sourceEvents) {
    const newEvent: Event = {
      id: db.nextId.event++,
      championship_id: newChamp.id,
      name: srcEvent.name,
      start_time: srcEvent.start_time,
      sort_order: srcEvent.sort_order,
      is_live_override: null,
    };
    db.events.push(newEvent);

    const srcParticipants = db.participants.filter(
      (p) => p.event_id === srcEvent.id
    );
    for (const srcP of srcParticipants) {
      const newP: Participant = {
        id: db.nextId.participant++,
        event_id: newEvent.id,
        place: null,
        first_name: srcP.first_name,
        last_name: srcP.last_name,
        team: srcP.team,
        boat_number: srcP.boat_number,
        lane: srcP.lane,
        time_result: "",
        notes: "",
      };
      db.participants.push(newP);
    }
  }

  writeDb(db);
  return newChamp;
}

// --- Medal Statistics ---

/** Medal table label: solo athletes by name, team boats by team name. */
function medalEntryName(p: Participant): string {
  const first = (p.first_name || "").trim();
  const last = (p.last_name || "").trim();
  const personName = [first, last].filter(Boolean).join(" ");

  if (personName) return personName;
  return (p.team || "").trim();
}

export function getMedalStats(): MedalRow[] {
  const db = readDb();
  const counts: Record<string, { gold: number; silver: number; bronze: number }> = {};

  for (const p of db.participants) {
    if (p.place !== 1 && p.place !== 2 && p.place !== 3) continue;
    const name = medalEntryName(p);
    if (!name) continue;
    if (!counts[name]) counts[name] = { gold: 0, silver: 0, bronze: 0 };
    if (p.place === 1) counts[name].gold++;
    else if (p.place === 2) counts[name].silver++;
    else if (p.place === 3) counts[name].bronze++;
  }

  return Object.entries(counts)
    .map(([name, m]) => ({
      name,
      gold: m.gold,
      silver: m.silver,
      bronze: m.bronze,
      total: m.gold + m.silver + m.bronze,
    }))
    .sort(
      (a, b) =>
        b.total - a.total || b.gold - a.gold || b.silver - a.silver
    );
}

// --- Events ---

export function createEvent(
  championshipId: number,
  name: string,
  sortOrder?: number,
  startTime: string = ""
): Event {
  const db = readDb();
  const nextSort =
    sortOrder ??
    (Math.max(
      -1,
      ...db.events
        .filter((e) => e.championship_id === championshipId)
        .map((e) => e.sort_order)
    ) + 1);
  const event: Event = {
    id: db.nextId.event++,
    championship_id: championshipId,
    name,
    start_time: startTime,
    sort_order: nextSort,
    is_live_override: null,
  };
  db.events.push(event);
  writeDb(db);
  return event;
}

export function updateEvent(
  id: number,
  data: { name?: string; sort_order?: number; start_time?: string; is_live_override?: boolean | null }
): Event | null {
  const db = readDb();
  const idx = db.events.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const e = db.events[idx];
  db.events[idx] = {
    ...e,
    name: data.name ?? e.name,
    sort_order: data.sort_order ?? e.sort_order,
    start_time: data.start_time !== undefined ? data.start_time : e.start_time,
    is_live_override: data.is_live_override !== undefined ? data.is_live_override : e.is_live_override,
  };
  writeDb(db);
  return db.events[idx];
}

export function deleteEvent(id: number): boolean {
  const db = readDb();
  const idx = db.events.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  db.participants = db.participants.filter((p) => p.event_id !== id);
  db.events.splice(idx, 1);
  writeDb(db);
  return true;
}

export function deleteAllEventsForChampionship(championshipId: number): void {
  const db = readDb();
  const eventIds = db.events
    .filter((e) => e.championship_id === championshipId)
    .map((e) => e.id);
  db.participants = db.participants.filter((p) => !eventIds.includes(p.event_id));
  db.events = db.events.filter((e) => e.championship_id !== championshipId);
  writeDb(db);
}

export function importStartListRaces(
  championshipId: number,
  races: ParsedRace[],
  replaceExisting: boolean = false
): { eventsCreated: number; participantsCreated: number } {
  const db = readDb();
  const champ = db.championships.find((c) => c.id === championshipId);
  if (!champ) {
    return { eventsCreated: 0, participantsCreated: 0 };
  }

  if (replaceExisting) {
    const eventIds = db.events
      .filter((e) => e.championship_id === championshipId)
      .map((e) => e.id);
    db.participants = db.participants.filter((p) => !eventIds.includes(p.event_id));
    db.events = db.events.filter((e) => e.championship_id !== championshipId);
  }

  let eventsCreated = 0;
  let participantsCreated = 0;

  races.forEach((race, index) => {
    const event: Event = {
      id: db.nextId.event++,
      championship_id: championshipId,
      name: race.name,
      start_time: race.start_time,
      sort_order: index,
      is_live_override: null,
    };
    db.events.push(event);
    eventsCreated++;

    for (const p of race.participants) {
      db.participants.push({
        id: db.nextId.participant++,
        event_id: event.id,
        place: p.place,
        first_name: "",
        last_name: "",
        team: p.team,
        boat_number: "",
        lane: p.lane,
        time_result: p.time_result || "",
        notes: "",
      });
      participantsCreated++;
    }
  });

  writeDb(db);
  return { eventsCreated, participantsCreated };
}

// --- Participants ---

export function createParticipant(data: {
  event_id: number;
  place: number | null;
  first_name: string;
  last_name: string;
  team: string;
  boat_number: string;
  lane: number | null;
  time_result: string;
  notes: string;
}): Participant {
  const db = readDb();
  const participant: Participant = {
    id: db.nextId.participant++,
    ...data,
  };
  db.participants.push(participant);
  writeDb(db);
  return participant;
}

export function updateParticipant(
  id: number,
  data: {
    place: number | null;
    first_name: string;
    last_name: string;
    team: string;
    boat_number: string;
    lane: number | null;
    time_result: string;
    notes: string;
  }
): Participant | null {
  const db = readDb();
  const idx = db.participants.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.participants[idx] = { ...db.participants[idx], ...data };
  writeDb(db);
  return db.participants[idx];
}

export function deleteParticipant(id: number): boolean {
  const db = readDb();
  const idx = db.participants.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.participants.splice(idx, 1);
  writeDb(db);
  return true;
}
