import Link from "next/link";
import { notFound } from "next/navigation";
import { getChampionshipFull } from "@/lib/db";
import { columnLabels, type ColumnVisibility } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import LiveRefresh from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

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

export default async function ChampionshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const championship = await getChampionshipFull(Number(id));

  if (!championship) {
    notFound();
  }

  const cols = championship.visible_columns;

  return (
    <div className="min-h-screen">
      {(championship.is_live || championship.events.some(e => e.is_live)) && <LiveRefresh />}

      <header className="bg-gradient-to-r from-primary-800 to-primary-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex items-start justify-between print:hidden">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-primary-300 hover:text-white transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Championships
            </Link>
            <PrintButton />
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold md:text-4xl">
              {championship.name}
            </h1>
            {championship.is_live && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white print:hidden">
                <span className="live-dot h-2 w-2 rounded-full bg-white" />
                LIVE
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-primary-200">
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(championship.date)}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {championship.location}
            </span>
          </div>
          {championship.is_live && (
            <p className="mt-3 text-xs text-primary-300 print:hidden">
              Results update automatically every 30 seconds
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {championship.events.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-500">
              No events recorded for this championship yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {championship.events.map((event) => (
              <div
                key={event.id}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    {event.start_time && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono font-medium text-gray-500">
                        {event.start_time}
                      </span>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800">
                      {event.name}
                    </h2>
                    {event.is_live && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white print:hidden">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {event.participants.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    No results yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                          {colKeys.map(
                            (key) =>
                              cols[key] && (
                                <th key={key} className="px-6 py-3 font-medium">
                                  {key === "first_name" && cols.last_name && !cols.first_name
                                    ? "Name"
                                    : columnLabels[key]}
                                </th>
                              )
                          )}
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
                            {cols.place && (
                              <td className="px-6 py-3">
                                <PlaceBadge place={p.place} />
                              </td>
                            )}
                            {cols.first_name && (
                              <td className="px-6 py-3 font-medium">
                                {p.first_name || "-"}
                              </td>
                            )}
                            {cols.last_name && (
                              <td className="px-6 py-3 font-medium">
                                {p.last_name || "-"}
                              </td>
                            )}
                            {cols.team && (
                              <td className="px-6 py-3 text-gray-700">
                                {p.team || "-"}
                              </td>
                            )}
                            {cols.boat_number && (
                              <td className="px-6 py-3 text-gray-600">
                                {p.boat_number || "-"}
                              </td>
                            )}
                            {cols.lane && (
                              <td className="px-6 py-3 text-gray-600">
                                {p.lane ?? "-"}
                              </td>
                            )}
                            {cols.time_result && (
                              <td className="px-6 py-3 font-mono text-gray-700">
                                {p.time_result || "-"}
                              </td>
                            )}
                            {cols.notes && (
                              <td className="px-6 py-3 text-gray-500 italic">
                                {p.notes || "-"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        Rowing Championships &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
