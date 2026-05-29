import { Fragment } from "react";
import type { ColumnKey, ColumnVisibility, EventWithParticipants, Participant } from "@/lib/types";
import { columnLabels } from "@/lib/types";

function PlaceBadge({ place }: { place: number | null }) {
  if (!place) return <span className="text-gray-400">-</span>;

  if (place === 1)
    return (
      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        1st
      </span>
    );
  if (place === 2)
    return (
      <span className="inline-flex items-center gap-1 font-bold text-gray-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        2nd
      </span>
    );
  if (place === 3)
    return (
      <span className="inline-flex items-center gap-1 font-bold text-amber-700">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        3rd
      </span>
    );

  return <span className="font-medium text-gray-600">{place}th</span>;
}

function columnHeaderLabel(key: ColumnKey, cols: ColumnVisibility) {
  if (key === "first_name" && cols.last_name && !cols.first_name) {
    return "Name";
  }
  return columnLabels[key];
}

function renderParticipantCell(key: ColumnKey, p: Participant) {
  switch (key) {
    case "place":
      return (
        <td className="px-6 py-3">
          <PlaceBadge place={p.place} />
        </td>
      );
    case "first_name":
      return (
        <td className="px-6 py-3 font-medium">{p.first_name || "-"}</td>
      );
    case "last_name":
      return (
        <td className="px-6 py-3 font-medium">{p.last_name || "-"}</td>
      );
    case "team":
      return <td className="px-6 py-3 text-gray-700">{p.team || "-"}</td>;
    case "boat_number":
      return <td className="px-6 py-3 text-gray-600">{p.boat_number || "-"}</td>;
    case "lane":
      return <td className="px-6 py-3 text-gray-600">{p.lane ?? "-"}</td>;
    case "time_result":
      return (
        <td className="px-6 py-3 font-mono text-gray-700">
          {p.time_result || "-"}
        </td>
      );
    case "notes":
      return (
        <td className="px-6 py-3 text-gray-500 italic">{p.notes || "-"}</td>
      );
  }
}

export default function RaceAccordion({
  event,
  tableColumns,
  cols,
}: {
  event: EventWithParticipants;
  tableColumns: ColumnKey[];
  cols: ColumnVisibility;
}) {
  return (
    <details
      open={event.is_live}
      className={`race-accordion group overflow-hidden rounded-xl bg-white shadow-sm ${
        event.is_live ? "ring-2 ring-red-400" : ""
      }`}
    >
      <summary className="cursor-pointer list-none bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100 print:cursor-default">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span
              className={`w-14 shrink-0 text-center font-mono text-sm font-semibold ${
                event.start_time ? "text-primary-700" : "text-gray-300"
              }`}
            >
              {event.start_time || "—"}
            </span>
            <h2 className="min-w-0 flex-1 text-base font-semibold text-gray-800 sm:text-lg">
              {event.name}
            </h2>
            {event.is_live ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white print:hidden">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </span>
            ) : null}
          </div>
          <svg
            className="race-accordion-chevron h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180 print:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </summary>

      <div className="race-accordion-panel border-t border-gray-100">
        {event.participants.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No results yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  {tableColumns.map((key) => (
                    <th key={key} className="px-6 py-3 font-medium">
                      {columnHeaderLabel(key, cols)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {event.participants.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                      p.place === 1
                        ? "bg-amber-50/50"
                        : idx % 2 === 1
                          ? "bg-gray-50/50"
                          : ""
                    }`}
                  >
                    {tableColumns.map((key) => (
                      <Fragment key={key}>
                        {renderParticipantCell(key, p)}
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {event.race_note ? (
          <div className="border-t border-gray-100 bg-amber-50/30 px-6 py-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Note
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {event.race_note}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
