import Link from "next/link";
import { getAllChampionships } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function HomePage() {
  const championships = await getAllChampionships();

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-primary-800 to-primary-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            Rowing Championships
          </h1>
          <p className="text-lg text-primary-200">
            Official results and records
          </p>
          <Link
            href="/medals"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Medal Table
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {championships.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-500">
              No championships recorded yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {championships.map((c) => (
              <Link
                key={c.id}
                href={`/championship/${c.id}`}
                className="group relative rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
              >
                {c.is_live && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                    <span className="live-dot h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </span>
                )}
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-600">
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
                  {formatDate(c.date)}
                </div>
                <h2 className="mb-1 text-xl font-semibold group-hover:text-primary-700 transition-colors">
                  {c.name}
                </h2>
                <div className="flex items-center gap-1 text-sm text-gray-500">
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
                  {c.location}
                </div>
              </Link>
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
