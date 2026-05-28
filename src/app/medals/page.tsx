import Link from "next/link";
import { getMedalStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MedalsPage() {
  const stats = await getMedalStats();

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-primary-800 to-primary-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
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
          <h1 className="text-3xl font-bold md:text-4xl">Medal Table</h1>
          <p className="mt-2 text-primary-200">
            Medal standings from 1st, 2nd, and 3rd place results — counted by
            athlete name or team name, depending on how each result was entered.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {stats.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-500">
              No medal results recorded yet. Enter 1st, 2nd, or 3rd place in race
              results to populate the medal table.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4 font-medium">Rank</th>
                    <th className="px-6 py-4 font-medium">
                      Athlete / Team
                    </th>
                    <th className="px-6 py-4 text-center font-medium">
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="h-4 w-4 text-amber-400"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                        Gold
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-medium">
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="h-4 w-4 text-gray-400"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                        Silver
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-medium">
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="h-4 w-4 text-amber-700"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                        Bronze
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row, idx) => (
                    <tr
                      key={row.name}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                        idx === 0
                          ? "bg-amber-50/40"
                          : idx === 1
                          ? "bg-gray-50/40"
                          : idx === 2
                          ? "bg-orange-50/30"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-3 font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-800">
                        {row.name}
                      </td>
                      <td className="px-6 py-3 text-center font-bold text-amber-500">
                        {row.gold || "-"}
                      </td>
                      <td className="px-6 py-3 text-center font-bold text-gray-400">
                        {row.silver || "-"}
                      </td>
                      <td className="px-6 py-3 text-center font-bold text-amber-700">
                        {row.bronze || "-"}
                      </td>
                      <td className="px-6 py-3 text-center font-bold text-gray-800">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        Rowing Championships &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
