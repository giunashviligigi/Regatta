"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import type { ChampionshipFull, Participant, ColumnVisibility, EventWithParticipants } from "@/lib/types";
import { columnLabels, defaultColumns } from "@/lib/types";

interface ParticipantForm {
  place: string;
  first_name: string;
  last_name: string;
  team: string;
  boat_number: string;
  lane: string;
  time_result: string;
  notes: string;
}

const emptyParticipant: ParticipantForm = {
  place: "",
  first_name: "",
  last_name: "",
  team: "",
  boat_number: "",
  lane: "",
  time_result: "",
  notes: "",
};

const colKeys: (keyof ColumnVisibility)[] = [
  "place",
  "first_name",
  "last_name",
  "team",
  "boat_number",
  "lane",
  "time_result",
  "notes",
];

export default function AdminChampionshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ChampionshipFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventTime, setEditEventTime] = useState("");
  const [addingParticipantTo, setAddingParticipantTo] = useState<number | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null);
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(emptyParticipant);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [replaceOnImport, setReplaceOnImport] = useState(false);

  const cols = data?.visible_columns ?? defaultColumns;

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/championships/${id}/full`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function toggleColumn(key: keyof ColumnVisibility) {
    const updated = { ...cols, [key]: !cols[key] };
    await fetch(`/api/championships/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_columns: updated }),
    });
    fetchData();
  }

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("replace", replaceOnImport ? "true" : "false");

      const res = await fetch(`/api/championships/${id}/import-excel`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setImportMessage({
          type: "error",
          text: result.error || "Import failed",
        });
        return;
      }

      setImportMessage({
        type: "success",
        text: `Imported ${result.eventsCreated} events and ${result.participantsCreated} participants (teams, times, and places when present in the file).`,
      });
      fetchData();
    } catch {
      setImportMessage({ type: "error", text: "Something went wrong during import." });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEventName.trim()) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championship_id: Number(id),
        name: newEventName,
        start_time: newEventTime,
      }),
    });
    setNewEventName("");
    setNewEventTime("");
    fetchData();
  }

  async function saveEvent(eventId: number) {
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editEventName, start_time: editEventTime }),
    });
    setEditingEventId(null);
    fetchData();
  }

  async function deleteEvent(eventId: number) {
    if (!confirm("Delete this event and all its participants?")) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    fetchData();
  }

  async function stopEventLive(eventId: number) {
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_live_override: false }),
    });
    fetchData();
  }

  async function resetEventLive(eventId: number) {
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_live_override: null }),
    });
    fetchData();
  }

  async function forceEventLive(eventId: number) {
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_live_override: true }),
    });
    fetchData();
  }

  async function addParticipant(e: React.FormEvent, eventId: number) {
    e.preventDefault();
    await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        place: participantForm.place ? Number(participantForm.place) : null,
        first_name: participantForm.first_name,
        last_name: participantForm.last_name,
        team: participantForm.team,
        boat_number: participantForm.boat_number,
        lane: participantForm.lane ? Number(participantForm.lane) : null,
        time_result: participantForm.time_result,
        notes: participantForm.notes,
      }),
    });
    setAddingParticipantTo(null);
    setParticipantForm(emptyParticipant);
    fetchData();
  }

  function startEditParticipant(p: Participant) {
    setEditingParticipant(p.id);
    setParticipantForm({
      place: p.place?.toString() || "",
      first_name: p.first_name,
      last_name: p.last_name,
      team: p.team || "",
      boat_number: p.boat_number || "",
      lane: p.lane?.toString() || "",
      time_result: p.time_result || "",
      notes: p.notes || "",
    });
  }

  async function saveParticipant(participantId: number) {
    await fetch(`/api/participants/${participantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: participantForm.place ? Number(participantForm.place) : null,
        first_name: participantForm.first_name,
        last_name: participantForm.last_name,
        team: participantForm.team,
        boat_number: participantForm.boat_number,
        lane: participantForm.lane ? Number(participantForm.lane) : null,
        time_result: participantForm.time_result,
        notes: participantForm.notes,
      }),
    });
    setEditingParticipant(null);
    setParticipantForm(emptyParticipant);
    fetchData();
  }

  async function deleteParticipant(participantId: number) {
    if (!confirm("Remove this participant?")) return;
    await fetch(`/api/participants/${participantId}`, { method: "DELETE" });
    fetchData();
  }

  function updateForm(key: keyof ParticipantForm, value: string) {
    setParticipantForm((f) => ({ ...f, [key]: value }));
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        Championship not found
      </div>
    );

  function renderEditCell(key: keyof ColumnVisibility) {
    if (!cols[key]) return null;
    const formKey = key as keyof ParticipantForm;
    const isNumber = key === "place" || key === "lane";
    const widths: Record<string, string> = {
      place: "w-16", first_name: "w-full", last_name: "w-full", team: "w-full",
      boat_number: "w-20", lane: "w-16", time_result: "w-24", notes: "w-full",
    };
    const placeholders: Record<string, string> = {
      place: "#", first_name: "First name", last_name: "Last name", team: "Team",
      boat_number: "Boat #", lane: "Lane", time_result: "0:54.32", notes: "Notes",
    };
    return (
      <td key={key} className="px-3 py-2">
        <input
          type={isNumber ? "number" : "text"}
          value={participantForm[formKey]}
          onChange={(e) => updateForm(formKey, e.target.value)}
          className={`${widths[key]} rounded border border-gray-300 px-2 py-1 text-sm`}
          placeholder={placeholders[key]}
          min={isNumber ? "1" : undefined}
        />
      </td>
    );
  }

  function renderDisplayCell(key: keyof ColumnVisibility, p: Participant) {
    if (!cols[key]) return null;
    const values: Record<keyof ColumnVisibility, string | number> = {
      place: p.place ?? "-", first_name: p.first_name || "-", last_name: p.last_name || "-",
      team: p.team || "-", boat_number: p.boat_number || "-", lane: p.lane ?? "-",
      time_result: p.time_result || "-", notes: p.notes || "-",
    };
    const isPlace = key === "place";
    const isTime = key === "time_result";
    return (
      <td
        key={key}
        className={`px-3 py-2 ${isPlace ? "font-medium" : ""} ${isTime ? "font-mono text-gray-700" : "text-gray-600"}`}
      >
        {values[key]}
      </td>
    );
  }

  function renderEventLiveControls(event: EventWithParticipants) {
    if (event.is_live) {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
          <button
            onClick={() => stopEventLive(event.id)}
            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Stop
          </button>
        </div>
      );
    }

    if (event.is_live_override === false) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Stopped</span>
          <button
            onClick={() => resetEventLive(event.id)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            Reset to Auto
          </button>
        </div>
      );
    }

    if (data!.is_live && event.start_time) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Scheduled</span>
          <button
            onClick={() => forceEventLive(event.id)}
            className="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
          >
            Force Live
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">
              &larr; Back
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
                {data.is_live && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {data.date} &middot; {data.location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/championships/${id}/export-excel`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Export Excel
            </a>
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                showColumnSettings
                  ? "bg-primary-100 text-primary-700"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Columns
              </span>
            </button>
            <Link
              href={`/championship/${id}`}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View Public Page
            </Link>
          </div>
        </div>
      </header>

      {showColumnSettings && (
        <div className="border-b border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Show/hide columns for this championship:
            </p>
            <div className="flex flex-wrap gap-2">
              {colKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleColumn(key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    cols[key]
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-400 line-through"
                  }`}
                >
                  {columnLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-xl border border-dashed border-primary-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-gray-800">Import from Excel</h3>
          <p className="mb-4 text-sm text-gray-500">
            Upload a start list Excel file with Race No, event name, schedule time,
            lanes, team names, and optionally Time and Place rows. Use
            &quot;Replace existing events&quot; to re-import after you fill in results.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="cursor-pointer rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">
              {importing ? "Importing..." : "Choose Excel file"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={handleExcelImport}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={replaceOnImport}
                onChange={(e) => setReplaceOnImport(e.target.checked)}
                className="rounded border-gray-300"
              />
              Replace existing events (deletes current events first)
            </label>
          </div>
          {importMessage && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                importMessage.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {importMessage.text}
            </div>
          )}
        </div>

        <form onSubmit={addEvent} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="New event name (e.g. Premier Open 2000m Final 1)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
          />
          <input
            type="time"
            value={newEventTime}
            onChange={(e) => setNewEventTime(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            title="Start time"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            + Add Event
          </button>
        </form>

        {data.events.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">No events yet. Add your first event above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.events.map((event) => (
              <div
                key={event.id}
                className={`overflow-hidden rounded-xl bg-white shadow-sm ${
                  event.is_live ? "ring-2 ring-red-400" : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-3">
                  {editingEventId === event.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editEventName}
                        onChange={(e) => setEditEventName(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <input
                        type="time"
                        value={editEventTime}
                        onChange={(e) => setEditEventTime(e.target.value)}
                        className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => saveEvent(event.id)}
                        className="rounded-lg bg-primary-700 px-3 py-1.5 text-sm text-white hover:bg-primary-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingEventId(null)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        {event.start_time && (
                          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono font-medium text-gray-600">
                            {event.start_time}
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-800">{event.name}</h3>
                        {renderEventLiveControls(event)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingEventId(event.id);
                            setEditEventName(event.name);
                            setEditEventTime(event.start_time || "");
                          }}
                          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                        {colKeys.map(
                          (key) =>
                            cols[key] && (
                              <th key={key} className="px-3 py-2 font-medium">
                                {columnLabels[key]}
                              </th>
                            )
                        )}
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.participants.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50">
                          {editingParticipant === p.id ? (
                            <>
                              {colKeys.map((key) => renderEditCell(key))}
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button onClick={() => saveParticipant(p.id)} className="rounded bg-primary-700 px-2 py-1 text-xs text-white hover:bg-primary-800">Save</button>
                                  <button onClick={() => { setEditingParticipant(null); setParticipantForm(emptyParticipant); }} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              {colKeys.map((key) => renderDisplayCell(key, p))}
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button onClick={() => startEditParticipant(p)} className="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50">Edit</button>
                                  <button onClick={() => deleteParticipant(p.id)} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {addingParticipantTo === event.id && (
                        <tr className="border-b border-gray-50 bg-blue-50/30">
                          {colKeys.map((key) => renderEditCell(key))}
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={(e) => addParticipant(e, event.id)} className="rounded bg-primary-700 px-2 py-1 text-xs text-white hover:bg-primary-800">Add</button>
                              <button onClick={() => { setAddingParticipantTo(null); setParticipantForm(emptyParticipant); }} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {addingParticipantTo !== event.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <button
                      onClick={() => {
                        setAddingParticipantTo(event.id);
                        setParticipantForm(emptyParticipant);
                        setEditingParticipant(null);
                      }}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      + Add Participant
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
