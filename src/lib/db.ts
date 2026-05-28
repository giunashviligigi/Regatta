import "server-only";
import { createClient } from "@supabase/supabase-js";
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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function mapChampionship(row: Record<string, unknown>): Championship {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    date: String(row.date ?? ""),
    location: String(row.location ?? ""),
    is_live: Boolean(row.is_live),
    visible_columns: {
      ...defaultColumns,
      ...((row.visible_columns as Partial<ColumnVisibility>) ?? {}),
    },
    created_at: String(row.created_at ?? ""),
  };
}

function mapEvent(row: Record<string, unknown>): Event {
  return {
    id: Number(row.id),
    championship_id: Number(row.championship_id),
    name: String(row.name ?? ""),
    start_time: String(row.start_time ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_live_override:
      row.is_live_override === null || row.is_live_override === undefined
        ? null
        : Boolean(row.is_live_override),
  };
}

function mapParticipant(row: Record<string, unknown>): Participant {
  return {
    id: Number(row.id),
    event_id: Number(row.event_id),
    place:
      row.place === null || row.place === undefined ? null : Number(row.place),
    first_name: String(row.first_name ?? ""),
    last_name: String(row.last_name ?? ""),
    team: String(row.team ?? ""),
    boat_number: String(row.boat_number ?? ""),
    lane: row.lane === null || row.lane === undefined ? null : Number(row.lane),
    time_result: String(row.time_result ?? ""),
    notes: String(row.notes ?? ""),
  };
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

export async function getAllChampionships(): Promise<Championship[]> {
  const { data, error } = await supabase
    .from("championships")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapChampionship);
}

export async function getChampionship(
  id: number
): Promise<Championship | undefined> {
  const { data, error } = await supabase
    .from("championships")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapChampionship(data) : undefined;
}

export async function getChampionshipFull(
  id: number
): Promise<ChampionshipFull | null> {
  const champ = await getChampionship(id);
  if (!champ) return null;

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("championship_id", id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (eventsError) throw eventsError;
  const events = (eventsData ?? []).map(mapEvent);

  const liveStatuses = computeEventLiveStatus(champ, events);
  const eventIds = events.map((e) => e.id);
  let participantsByEvent = new Map<number, Participant[]>();

  if (eventIds.length > 0) {
    const { data: participantRows, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .in("event_id", eventIds);
    if (participantsError) throw participantsError;
    const participants = (participantRows ?? []).map(mapParticipant).sort((a, b) => {
      if (a.place === null && b.place === null) return a.id - b.id;
      if (a.place === null) return 1;
      if (b.place === null) return -1;
      return a.place - b.place || a.id - b.id;
    });

    participantsByEvent = participants.reduce((acc, p) => {
      const list = acc.get(p.event_id) ?? [];
      list.push(p);
      acc.set(p.event_id, list);
      return acc;
    }, new Map<number, Participant[]>());
  }

  const eventsWithParticipants: EventWithParticipants[] = events.map(
    (event, idx) => {
      const participants = participantsByEvent.get(event.id) ?? [];
      return { ...event, participants, is_live: liveStatuses[idx] };
    }
  );

  return { ...champ, events: eventsWithParticipants };
}

export async function createChampionship(
  name: string,
  date: string,
  location: string,
  isLive: boolean = false,
  visibleColumns?: Partial<ColumnVisibility>
): Promise<Championship> {
  const { data, error } = await supabase
    .from("championships")
    .insert({
      name,
      date,
      location,
      is_live: isLive,
      visible_columns: { ...defaultColumns, ...(visibleColumns ?? {}) },
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapChampionship(data);
}

export async function updateChampionship(
  id: number,
  data: { name?: string; date?: string; location?: string; is_live?: boolean; visible_columns?: Partial<ColumnVisibility> }
): Promise<Championship | null> {
  const current = await getChampionship(id);
  if (!current) return null;
  const { data: updated, error } = await supabase
    .from("championships")
    .update({
      name: data.name ?? current.name,
      date: data.date ?? current.date,
      location: data.location ?? current.location,
      is_live: data.is_live ?? current.is_live,
      visible_columns: data.visible_columns
        ? { ...current.visible_columns, ...data.visible_columns }
        : current.visible_columns,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapChampionship(updated);
}

export async function deleteChampionship(id: number): Promise<boolean> {
  const { error, count } = await supabase
    .from("championships")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function duplicateChampionship(
  id: number
): Promise<Championship | null> {
  const source = await getChampionship(id);
  if (!source) return null;

  const newChamp = await createChampionship(
    `${source.name} (Copy)`,
    new Date().toISOString().split("T")[0],
    source.location,
    false,
    source.visible_columns
  );

  const sourceFull = await getChampionshipFull(id);
  if (!sourceFull) return newChamp;

  for (const srcEvent of sourceFull.events) {
    const newEvent = await createEvent(
      newChamp.id,
      srcEvent.name,
      srcEvent.sort_order,
      srcEvent.start_time
    );
    for (const srcP of srcEvent.participants) {
      await createParticipant({
        event_id: newEvent.id,
        place: null,
        first_name: srcP.first_name,
        last_name: srcP.last_name,
        team: srcP.team,
        boat_number: srcP.boat_number,
        lane: srcP.lane,
        time_result: "",
        notes: "",
      });
    }
  }
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

export async function getMedalStats(): Promise<MedalRow[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .in("place", [1, 2, 3]);
  if (error) throw error;
  const counts: Record<string, { gold: number; silver: number; bronze: number }> = {};

  for (const pRaw of data ?? []) {
    const p = mapParticipant(pRaw);
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

export async function createEvent(
  championshipId: number,
  name: string,
  sortOrder?: number,
  startTime: string = ""
): Promise<Event> {
  let nextSort = sortOrder;
  if (nextSort === undefined) {
    const { data: existing, error: orderErr } = await supabase
      .from("events")
      .select("sort_order")
      .eq("championship_id", championshipId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderErr) throw orderErr;
    nextSort = (existing?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      championship_id: championshipId,
      name,
      start_time: startTime,
      sort_order: nextSort,
      is_live_override: null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapEvent(data);
}

export async function updateEvent(
  id: number,
  data: { name?: string; sort_order?: number; start_time?: string; is_live_override?: boolean | null }
): Promise<Event | null> {
  const { data: current, error: currentErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (currentErr) throw currentErr;
  if (!current) return null;

  const { data: updated, error } = await supabase
    .from("events")
    .update({
      name: data.name ?? current.name,
      sort_order: data.sort_order ?? current.sort_order,
      start_time:
        data.start_time !== undefined ? data.start_time : current.start_time,
      is_live_override:
        data.is_live_override !== undefined
          ? data.is_live_override
          : current.is_live_override,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapEvent(updated);
}

export async function deleteEvent(id: number): Promise<boolean> {
  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function deleteAllEventsForChampionship(
  championshipId: number
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("championship_id", championshipId);
  if (error) throw error;
}

export async function importStartListRaces(
  championshipId: number,
  races: ParsedRace[],
  replaceExisting: boolean = false
): Promise<{ eventsCreated: number; participantsCreated: number }> {
  const champ = await getChampionship(championshipId);
  if (!champ) {
    return { eventsCreated: 0, participantsCreated: 0 };
  }

  if (replaceExisting) {
    await deleteAllEventsForChampionship(championshipId);
  }

  let eventsCreated = 0;
  let participantsCreated = 0;

  for (const [index, race] of races.entries()) {
    const event = await createEvent(
      championshipId,
      race.name,
      index,
      race.start_time
    );
    eventsCreated++;

    for (const p of race.participants) {
      await createParticipant({
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
  }

  return { eventsCreated, participantsCreated };
}

// --- Participants ---

export async function createParticipant(data: {
  event_id: number;
  place: number | null;
  first_name: string;
  last_name: string;
  team: string;
  boat_number: string;
  lane: number | null;
  time_result: string;
  notes: string;
}): Promise<Participant> {
  const { data: created, error } = await supabase
    .from("participants")
    .insert(data)
    .select("*")
    .single();
  if (error) throw error;
  return mapParticipant(created);
}

export async function updateParticipant(
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
): Promise<Participant | null> {
  const { data: updated, error } = await supabase
    .from("participants")
    .update(data)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return updated ? mapParticipant(updated) : null;
}

export async function deleteParticipant(id: number): Promise<boolean> {
  const { error, count } = await supabase
    .from("participants")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
