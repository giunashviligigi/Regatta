import Link from "next/link";
import { notFound } from "next/navigation";
import { getChampionshipFull } from "@/lib/db";
import { visibleColumnsInOrder } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import LiveRefresh from "@/components/LiveRefresh";
import RaceAccordion from "@/components/RaceAccordion";

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
  const tableColumns = visibleColumnsInOrder(
    championship.column_order,
    cols
  );

  return (
    <div className="min-h-screen">
      {(championship.is_live || championship.events.some((e) => e.is_live)) && (
        <LiveRefresh />
      )}

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
          <div className="space-y-3">
            <div className="hidden px-6 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:flex">
              <span className="w-14 shrink-0 text-center">Time</span>
              <span className="flex-1">Race</span>
            </div>
            {championship.events.map((event) => (
              <RaceAccordion
                key={event.id}
                event={event}
                tableColumns={tableColumns}
                cols={cols}
              />
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
