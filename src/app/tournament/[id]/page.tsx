"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth,
  useTournament,
  useMatches,
  useStandings,
  useTeams,
  useGroups,
  useCourts,
  useNotifications,
} from "@/hooks/useTournament";

type TournamentPageProps = {
  params: {
    id: string;
  };
};

export default function TournamentPage({ params }: TournamentPageProps) {
  const router = useRouter();
  const tournamentId = params.id;
  const { profile, loading: authLoading, isAdmin, isScorer } = useAuth();

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth/login");
    }
  }, [profile, authLoading, router]);
  const { data: tournament, loading: tournamentLoading, error: tournamentError } = useTournament(tournamentId);
  const {
    matches,
    liveMatches,
    upcomingMatches,
    completedMatches,
    loading: matchesLoading,
    error: matchesError,
    startMatch,
    updateScore,
    completeMatch,
  } = useMatches(tournamentId);
  const { standings, byGroup, loading: standingsLoading } = useStandings(tournamentId);
  const { teams, loading: teamsLoading, error: teamsError, addTeam } = useTeams(tournamentId);
  const { groups, loading: groupsLoading, error: groupsError } = useGroups(tournamentId);
  const { data: courts, loading: courtsLoading, error: courtsError } = useCourts(tournamentId);
  const { notifications, unread, send, markRead } = useNotifications(tournamentId);

  const [teamName, setTeamName] = useState("");
  const [teamPlayers, setTeamPlayers] = useState("");
  const [notifText, setNotifText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (authLoading || (!authLoading && !profile)) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-emerald-400 text-lg animate-pulse">Loading tournament…</div>
      </main>
    );
  }

  const isLoading = tournamentLoading || matchesLoading || standingsLoading || teamsLoading || groupsLoading || courtsLoading;

  async function handleAddTeam() {
    setErrorMessage("");
    const trimmedTeamName = teamName.trim();
    if (!trimmedTeamName) {
      setErrorMessage("Enter a team name first.");
      return;
    }

    if (teams.some((team) => team.name.trim().toLowerCase() === trimmedTeamName.toLowerCase())) {
      setErrorMessage("A team with this name already exists in the tournament.");
      return;
    }

    const players = teamPlayers
      .split(",")
      .map((player) => player.trim())
      .filter(Boolean);

    try {
      await addTeam(trimmedTeamName, players);
      setTeamName("");
      setTeamPlayers("");
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Team creation failed.");
    }
  }

  async function handleSendNotification() {
    setErrorMessage("");
    if (!notifText.trim()) {
      setErrorMessage("Enter a notification message.");
      return;
    }

    try {
      await send("Live update", notifText.trim(), "🏸", "info");
      setNotifText("");
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Notification failed.");
    }
  }

  function handleScoreUpdate(matchId: string, currentScore: number | null, increment: number, teamIndex: 1 | 2 = 1) {
    const s = Math.max(0, (currentScore ?? 0) + increment);
    return updateScore(matchId, teamIndex === 1 ? s : 0, teamIndex === 2 ? s : 0);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-400/80">Tournament Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                {tournament?.name ?? "Loading tournament..."}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                {tournament?.description ?? "Manage matches, standings, teams, and live notifications for your Supabase-powered tournament."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                <p className="mt-2 text-xl font-semibold text-emerald-300">{tournament?.status ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live</p>
                <p className="mt-2 text-xl font-semibold text-orange-400">{liveMatches.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Unread</p>
                <p className="mt-2 text-xl font-semibold text-sky-400">{unread}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {tournamentError || matchesError || teamsError || groupsError || courtsError ? (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            {tournamentError ?? matchesError ?? teamsError ?? groupsError ?? courtsError}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Courts</p>
            <p className="mt-3 text-sm text-slate-200">{courts?.map((court) => court.name).join(", ") || "No courts configured"}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Groups</p>
            <p className="mt-3 text-sm text-slate-200">{groups.map((group) => `Group ${group.name}`).join(", ") || "No groups configured"}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Teams</p>
            <p className="mt-3 text-sm text-slate-200">{teams.map((team) => team.name).join(", ") || "No teams configured"}</p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Live Matches</h2>
                  <p className="text-sm text-slate-400">Updates in real time from Supabase Realtime.</p>
                </div>
                {isAdmin || isScorer ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                    {isAdmin ? "Admin" : "Scorer"}
                  </span>
                ) : null}
              </div>

              {isLoading ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">Loading match data…</div>
              ) : liveMatches.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">No live matches right now.</div>
              ) : (
                <div className="space-y-4">
                  {liveMatches.map((match) => (
                    <article key={match.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm shadow-slate-950/20">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{match.group?.name ?? "Live"} • {match.court?.name ?? "Court"}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {match.team1?.name ?? "Team 1"} vs {match.team2?.name ?? "Team 2"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-200">
                          <span className="font-semibold text-emerald-300">{match.score1 ?? 0}</span>
                          <span className="text-slate-500">-</span>
                          <span className="font-semibold text-emerald-300">{match.score2 ?? 0}</span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <button
                          type="button"
                          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                          onClick={() => updateScore(match.id, (match.score1 ?? 0) + 1, match.score2 ?? 0)}
                        >
                          +1 {match.team1?.name ?? "Team 1"}
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                          onClick={() => updateScore(match.id, match.score1 ?? 0, (match.score2 ?? 0) + 1)}
                        >
                          +1 {match.team2?.name ?? "Team 2"}
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                          onClick={() => completeMatch(match.id)}
                        >
                          Complete match
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Upcoming Matches</h2>
                  <p className="text-sm text-slate-400">Planned fixtures for this tournament.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{upcomingMatches.length}</span>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">No upcoming fixtures yet.</div>
              ) : (
                <div className="space-y-3">
                  {upcomingMatches.map((match) => (
                    <div key={match.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-slate-100">{match.team1?.name ?? "Team 1"} vs {match.team2?.name ?? "Team 2"}</p>
                        <p className="text-sm text-slate-500">{match.scheduled_date ?? "TBD"} • {match.scheduled_time ?? "TBD"}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-400">
                        <span className="rounded-full bg-slate-800 px-3 py-1">{match.group?.name ?? "Group"}</span>
                        <span className="rounded-full bg-slate-800 px-3 py-1">{match.court?.name ?? "Court"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Standings</h2>
                  <p className="text-sm text-slate-400">Real-time leaderboard for this tournament.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{standings.length}</span>
              </div>

              {standings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">Standings will appear once matches are completed.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byGroup).map(([groupKey, groupStandings]) => (
                    <div key={groupKey} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-500">{groupKey === "overall" ? "Overall" : `Group ${groupKey}`}</p>
                      <div className="grid gap-2 text-sm">
                        {groupStandings.map((standing) => (
                          <div key={standing.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-2xl bg-slate-900 px-3 py-2 text-slate-200">
                            <span>{standing.team?.name ?? "Team"}</span>
                            <span className="text-right text-slate-400">W {standing.wins}</span>
                            <span className="text-right text-slate-400">L {standing.losses}</span>
                            <span className="text-right text-emerald-300">{standing.pts} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Teams</h2>
                  <p className="text-sm text-slate-400">Active roster for this tournament.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{teams.length}</span>
              </div>

              {teams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">No teams have been added yet.</div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{team.name}</p>
                          <p className="mt-1 text-xs text-slate-500">Players: {team.players?.map((player) => player.full_name).join(", ") || "N/A"}</p>
                        </div>
                        <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Seed {team.seed ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-200">Add a team</p>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-500">Team name</label>
                <input
                  className="mb-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Example: Lightning Strikers"
                />
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-500">Players</label>
                <input
                  className="mb-4 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                  value={teamPlayers}
                  onChange={(event) => setTeamPlayers(event.target.value)}
                  placeholder="Comma-separated names"
                />
                <button
                  type="button"
                  className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  onClick={handleAddTeam}
                >
                  Add team
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Notifications</h2>
                  <p className="text-sm text-slate-400">Send live updates to tournament users.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{notifications.length}</span>
              </div>

              <div className="space-y-3">
                <textarea
                  className="min-h-[96px] w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                  value={notifText}
                  onChange={(event) => setNotifText(event.target.value)}
                  placeholder="Type a quick tournament update"
                />
                <button
                  type="button"
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  onClick={handleSendNotification}
                >
                  Send notification
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{notification.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
                        onClick={() => markRead(notification.id)}
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
