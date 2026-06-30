"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";

function DashboardBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-center shadow-sm shadow-slate-950/20">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500 font-orbitron">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-emerald-300 font-orbitron">{value}</div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/90 p-10 text-center text-slate-500 shadow-sm shadow-slate-950/20">
      <p className="text-xl font-semibold text-slate-100">{title}</p>
      <p className="mt-3 text-sm leading-7">{description}</p>
    </div>
  );
}

export default function BadmintonDashboard() {
  const router = useRouter();
  const {
    tournament,
    courts,
    groups,
    teams,
    groupsByName,
    loading,
    error,
    createCourt,
    deleteCourt,
    createGroup,
    deleteGroup,
    createTeam,
    updateTeam,
    deleteTeam,
  } = useDashboard();

  const [courtName, setCourtName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]?.id ?? "");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [editingPlayer1, setEditingPlayer1] = useState("");
  const [editingPlayer2, setEditingPlayer2] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  const groupsWithTeams = useMemo(
    () => groups.map((group) => ({ ...group, teamCount: group.teams?.length ?? 0 })),
    [groups]
  );

  const handleCourtSubmit = async () => {
    if (!courtName.trim()) {
      setFormError("Court name is required.");
      return;
    }

    try {
      await createCourt(courtName.trim());
      setCourtName("");
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message ?? "Unable to add court.");
    }
  };

  const handleGroupSubmit = async () => {
    if (courts.length === 0) {
      setFormError("Create a court before adding a group.");
      return;
    }

    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      setFormError("Group name is required.");
      return;
    }

    const duplicateGroup = groups.some(
      (group) => group.name.trim().toLowerCase() === trimmedGroupName.toLowerCase()
    );
    if (duplicateGroup) {
      setFormError("A group with this name already exists in the tournament.");
      return;
    }

    try {
      await createGroup(trimmedGroupName);
      setGroupName("");
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message ?? "Unable to add group.");
    }
  };

  const handleTeamSubmit = async () => {
    setFormError(null);

    if (groups.length === 0) {
      setFormError("Create a group before adding teams.");
      return;
    }

    if (!selectedGroup) {
      setFormError("Select a group before creating a team.");
      return;
    }

    const trimmedTeamName = teamName.trim();
    if (!trimmedTeamName) {
      setFormError("Team name is required.");
      return;
    }

    const duplicateTeam = teams.some(
      (team) => team.name.trim().toLowerCase() === trimmedTeamName.toLowerCase()
    );
    if (duplicateTeam) {
      setFormError("A team with this name already exists in the tournament.");
      return;
    }

    const playerNames = [player1.trim(), player2.trim()].filter(Boolean);
    if (playerNames.length === 0) {
      setFormError("Add at least one player for the team.");
      return;
    }

    if (playerNames.length > 2) {
      setFormError("Teams can have a maximum of 2 players.");
      return;
    }

    try {
      await createTeam(selectedGroup, trimmedTeamName, playerNames);
      setTeamName("");
      setPlayer1("");
      setPlayer2("");
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message ?? "Unable to add team.");
    }
  };

  const handleStartEditTeam = (teamId: string) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;

    setEditingTeamId(teamId);
    setEditingTeamName(team.name);
    setEditingPlayer1(team.players?.[0]?.full_name ?? "");
    setEditingPlayer2(team.players?.[1]?.full_name ?? "");
    setFormError(null);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeamId) return;

    const playerNames = [editingPlayer1.trim(), editingPlayer2.trim()].filter(Boolean);
    if (!editingTeamName.trim()) {
      setFormError("Team name is required.");
      return;
    }

    const duplicateTeam = teams.some(
      (team) => team.id !== editingTeamId
        && team.name.trim().toLowerCase() === editingTeamName.trim().toLowerCase()
    );
    if (duplicateTeam) {
      setFormError("A team with this name already exists in the tournament.");
      return;
    }

    try {
      await updateTeam(editingTeamId, editingTeamName.trim(), playerNames);
      setEditingTeamId(null);
      setEditingTeamName("");
      setEditingPlayer1("");
      setEditingPlayer2("");
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message ?? "Unable to update team.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-rajdhani">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-400/80 font-orbitron">Your tournament home</p>
              <h1 className="mt-2 text-4xl font-black text-white font-orbitron">ShuttlePro Home</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                Create courts, groups, and teams in the database. Start from a clean state with no sample fixtures.
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DashboardBadge label="Courts" value={courts.length} />
                <DashboardBadge label="Groups" value={groups.length} />
                <DashboardBadge label="Teams" value={teams.length} />
                <DashboardBadge label="Matches" value={0} />
              </div>
              <button
                type="button"
                className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!tournament || courts.length === 0 || groups.length === 0 || teams.length < 2}
                onClick={() => tournament && router.push(`/tournament/${tournament.id}`)}
              >
                Start Match
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-16 text-center text-slate-500">Loading dashboard…</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white font-orbitron">Quick start</h2>
                    <p className="text-sm text-slate-400">Add courts first, then groups, then teams to build your tournament roster.</p>
                  </div>
                </div>

                {courts.length === 0 && groups.length === 0 && teams.length === 0 ? (
                  <EmptyState
                    title="Fresh start — no data yet"
                    description="Begin by adding a court and a group. Then create teams for each group with up to two players."
                  />
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                      <h3 className="text-lg font-semibold text-white font-orbitron">Courts</h3>
                      <p className="mt-2 text-sm text-slate-400">Courts are required before scheduling matches.</p>
                      {courts.length === 0 ? (
                        <div className="mt-8 text-slate-500">No courts yet.</div>
                      ) : (
                        <ul className="mt-6 space-y-3">
                          {courts.map((court) => (
                            <li key={court.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-semibold text-white">{court.name}</div>
                                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Court</div>
                                </div>
                                <button
                                  className="rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
                                  onClick={() => deleteCourt(court.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                      <h3 className="text-lg font-semibold text-white font-orbitron">Groups</h3>
                      <p className="mt-2 text-sm text-slate-400">Groups keep teams organized for round-robin play.</p>
                      {groupsWithTeams.length === 0 ? (
                        <div className="mt-8 text-slate-500">No groups yet.</div>
                      ) : (
                        <ul className="mt-6 space-y-3">
                          {groupsWithTeams.map((group) => (
                            <li key={group.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-semibold text-white">Group {group.name}</div>
                                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{group.teamCount} teams</div>
                                </div>
                                <button
                                  className="rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
                                  onClick={() => deleteGroup(group.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white font-orbitron">Teams</h2>
                    <p className="text-sm text-slate-400">Each team can have up to two players.</p>
                  </div>
                </div>

                {teams.length === 0 ? (
                  <EmptyState
                    title="No teams yet"
                    description="Create a group first, then add teams to that group with up to two players each."
                  />
                ) : (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-lg font-semibold text-white">{team.name}</div>
                            <div className="mt-2 text-sm text-slate-400">{team.players?.map((player) => player.full_name).join(" • ")}</div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              className="rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
                              onClick={() => handleStartEditTeam(team.id)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500/20"
                              onClick={() => deleteTeam(team.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white font-orbitron">Add a court</h2>
                  <p className="text-sm text-slate-400">Courts are the first requirement for match scheduling.</p>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                    value={courtName}
                    onChange={(event) => setCourtName(event.target.value)}
                    placeholder="Court name, e.g. Court A"
                  />
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition duration-200 hover:border-emerald-400 hover:bg-emerald-500/20"
                    onClick={handleCourtSubmit}
                  >
                    Add court
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white font-orbitron">Add a group</h2>
                  <p className="text-sm text-slate-400">Groups let you organize teams for competition.</p>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="Group name, e.g. A"
                    disabled={courts.length === 0}
                  />
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 font-rajdhani transition duration-200 hover:border-sky-400 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleGroupSubmit}
                    disabled={courts.length === 0}
                  >
                    Add group
                  </button>
                  {courts.length === 0 ? (
                    <p className="text-sm text-amber-300">Please create a court first so groups can be assigned to a tournament.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white font-orbitron">Create a team</h2>
                  <p className="text-sm text-slate-400">Each team can have up to two players.</p>
                </div>
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-500 font-orbitron">Group</label>
                  <select
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedGroup}
                    onChange={(event) => setSelectedGroup(event.target.value)}
                    disabled={groups.length === 0}
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>Group {group.name}</option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Team name"
                    disabled={groups.length === 0}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={player1}
                    onChange={(event) => setPlayer1(event.target.value)}
                    placeholder="Player 1 name"
                    disabled={groups.length === 0}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={player2}
                    onChange={(event) => setPlayer2(event.target.value)}
                    placeholder="Player 2 name (optional)"
                    disabled={groups.length === 0}
                  />
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition duration-200 hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleTeamSubmit}
                    disabled={groups.length === 0}
                  >
                    Create team
                  </button>
                  {groups.length === 0 ? (
                    <p className="text-sm text-amber-300">Please add at least one group before you can create teams.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white font-orbitron">Edit team</h2>
                  <p className="text-sm text-slate-400">Select a team to update its name and players.</p>
                </div>
                {editingTeamId ? (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      value={editingTeamName}
                      onChange={(event) => setEditingTeamName(event.target.value)}
                      placeholder="Team name"
                    />
                    <input
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      value={editingPlayer1}
                      onChange={(event) => setEditingPlayer1(event.target.value)}
                      placeholder="Player 1 name"
                    />
                    <input
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      value={editingPlayer2}
                      onChange={(event) => setEditingPlayer2(event.target.value)}
                      placeholder="Player 2 name"
                    />
                    <div className="flex gap-3 flex-wrap">
                      <button
                        className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 font-rajdhani transition duration-200 hover:border-sky-400 hover:bg-sky-500/20"
                        onClick={handleUpdateTeam}
                      >
                        Save changes
                      </button>
                      <button
                        className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300 transition duration-200 hover:border-slate-500"
                        onClick={() => setEditingTeamId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Choose a team from the list to edit its roster.</div>
                )}
              </section>

              {formError ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{formError}</div>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
