"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useTournament";
import { tournamentApi } from "@/lib/supabase";
import type { Tournament } from "@/lib/supabase";

export default function TournamentsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth/login");
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const data = await tournamentApi.list();
        setTournaments(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load tournaments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (authLoading || (!authLoading && !profile)) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-emerald-400 text-lg animate-pulse">Loading tournaments…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400/80">Tournament Hub</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">All Tournaments</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Select a tournament to manage matches, teams, standings, and live updates.</p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
            Loading tournaments…
          </div>
        ) : tournaments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
            <p>No tournaments yet. Create one in Supabase to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournament/${tournament.id}`}
                className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-emerald-400/40 hover:bg-slate-900"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300">
                      {tournament.name}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                      {tournament.type}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      tournament.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : tournament.status === "completed"
                          ? "bg-slate-700 text-slate-300"
                          : "bg-sky-500/20 text-sky-300"
                    }`}
                  >
                    {tournament.status}
                  </span>
                </div>

                {tournament.description ? (
                  <p className="mb-4 text-sm text-slate-400">{tournament.description}</p>
                ) : null}

                <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Venue</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{tournament.venue ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Teams</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{tournament.max_teams ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Groups</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{tournament.group_count ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Courts</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{tournament.courts_count ?? "—"}</p>
                  </div>
                </div>

                <button
                  className="mt-4 w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-sm font-semibold text-emerald-300 transition group-hover:border-emerald-400 group-hover:bg-emerald-500/20"
                >
                  View Tournament →
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
