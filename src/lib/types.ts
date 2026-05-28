export interface ColumnVisibility {
  place: boolean;
  first_name: boolean;
  last_name: boolean;
  team: boolean;
  boat_number: boolean;
  lane: boolean;
  time_result: boolean;
  notes: boolean;
}

export const defaultColumns: ColumnVisibility = {
  place: true,
  first_name: true,
  last_name: true,
  team: true,
  boat_number: true,
  lane: true,
  time_result: true,
  notes: true,
};

export const columnLabels: Record<keyof ColumnVisibility, string> = {
  place: "Place",
  first_name: "First Name",
  last_name: "Last Name",
  team: "Team",
  boat_number: "Boat #",
  lane: "Lane",
  time_result: "Time",
  notes: "Notes",
};

export interface Championship {
  id: number;
  name: string;
  date: string;
  location: string;
  is_live: boolean;
  visible_columns: ColumnVisibility;
  created_at: string;
}

export interface MedalRow {
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export interface Event {
  id: number;
  championship_id: number;
  name: string;
  start_time: string;
  sort_order: number;
  is_live_override: boolean | null;
}

export interface EventWithParticipants extends Event {
  participants: Participant[];
  is_live: boolean;
}

export interface Participant {
  id: number;
  event_id: number;
  place: number | null;
  first_name: string;
  last_name: string;
  team: string;
  boat_number: string;
  lane: number | null;
  time_result: string;
  notes: string;
}

export interface ChampionshipFull extends Championship {
  events: EventWithParticipants[];
}

export interface SiteSettings {
  images_link: string;
}
