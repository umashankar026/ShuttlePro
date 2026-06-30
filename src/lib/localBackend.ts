// ============================================================
//  ShuttlePro · LocalStorage Backend
//  Replaces Supabase with localStorage for offline development.
// ============================================================

import type { Profile, Tournament, Team, Player, Group, Court, Match, Standing, Notification } from "./supabase";

// ── Helpers ────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`sp_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`sp_${key}`, JSON.stringify(data));
}

// ── In-memory callback store for onAuthChange ──────────────
type AuthCallback = (session: any) => void;
const authListeners: AuthCallback[] = [];

function notifyAuthListeners(user: any): void {
  const session = user ? { user, access_token: "local-token" } : null;
  authListeners.forEach((cb) => cb(session));
}

// ── Auth ───────────────────────────────────────────────────
export const localAuth = {
  async signIn(email: string, password: string) {
    const users = load<Array<{ email: string; password: string; profile: Profile }>>("users", []);
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error("Invalid email or password");
    save("current_user", found);
    notifyAuthListeners(found.profile);
    return { user: found.profile, session: { user: found.profile } };
  },

  async signUp(email: string, password: string) {
    const users = load<Array<{ email: string; password: string; profile: Profile }>>("users", []);
    if (users.some((u) => u.email === email)) throw new Error("User already exists");
    const profile: Profile = {
      id: genId(),
      full_name: null,
      avatar_url: null,
      role: users.length === 0 ? "superadmin" : "spectator",
      created_at: new Date().toISOString(),
    };
    users.push({ email, password, profile });
    save("users", users);
    save("current_user", { email, password, profile });
    notifyAuthListeners(profile);
    return { user: profile };
  },

  async signOut() {
    localStorage.removeItem("sp_current_user");
    notifyAuthListeners(null);
  },

  async getSession() {
    const cu = load<{ email: string; profile: Profile } | null>("current_user", null);
    if (!cu) return null;
    return { user: cu.profile, access_token: "local-token" };
  },

  async getProfile(): Promise<Profile | null> {
    const cu = load<{ email: string; profile: Profile } | null>("current_user", null);
    return cu?.profile ?? null;
  },

  onAuthChange(callback: (session: any) => void) {
    authListeners.push(callback);
    const subscription = { unsubscribe: () => { const i = authListeners.indexOf(callback); if (i >= 0) authListeners.splice(i, 1); } };
    return { data: { subscription } };
  },
};

// ── Tournament ─────────────────────────────────────────────
function ensureDefaultTournament(): Tournament {
  let tournaments = load<Tournament[]>("tournaments", []);
  let t = tournaments.find((t) => t.name === "ShuttlePro Dashboard");
  if (!t) {
    t = {
      id: genId(),
      name: "ShuttlePro Dashboard",
      description: "Default ShuttlePro dashboard tournament",
      type: "doubles",
      status: "draft",
      venue: "Local Venue",
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
      banner_url: null,
      max_teams: 64,
      group_count: 0,
      courts_count: 0,
      created_by: null,
      created_at: new Date().toISOString(),
    };
    tournaments.push(t);
    save("tournaments", tournaments);
  }
  return t;
}

export const localTournamentApi = {
  async list(): Promise<Tournament[]> {
    return load<Tournament[]>("tournaments", []);
  },

  async get(id: string): Promise<Tournament> {
    const t = load<Tournament[]>("tournaments", []).find((t) => t.id === id);
    if (!t) throw new Error("Tournament not found");
    return t;
  },

  async create(payload: Partial<Tournament>): Promise<Tournament> {
    const t: Tournament = {
      id: genId(),
      name: payload.name ?? "New Tournament",
      description: payload.description ?? null,
      type: payload.type ?? "doubles",
      status: payload.status ?? "draft",
      venue: payload.venue ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      banner_url: null,
      max_teams: payload.max_teams ?? 16,
      group_count: payload.group_count ?? 0,
      courts_count: payload.courts_count ?? 0,
      created_by: payload.created_by ?? null,
      created_at: new Date().toISOString(),
    };
    const ts = load<Tournament[]>("tournaments", []);
    ts.push(t);
    save("tournaments", ts);
    return t;
  },

  async update(id: string, payload: Partial<Tournament>): Promise<Tournament> {
    const ts = load<Tournament[]>("tournaments", []);
    const idx = ts.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error("Tournament not found");
    ts[idx] = { ...ts[idx], ...payload };
    save("tournaments", ts);
    return ts[idx];
  },

  async getOrCreateDefault(): Promise<Tournament> {
    return ensureDefaultTournament();
  },

  async setStatus(id: string, status: Tournament["status"]) {
    return localTournamentApi.update(id, { status });
  },
};

// ── Team + Player ──────────────────────────────────────────
export const localTeamApi = {
  async list(tournamentId: string): Promise<Team[]> {
    const teams = load<Team[]>("teams", []).filter((t) => t.tournament_id === tournamentId && t.is_active);
    const players = load<Player[]>("players", []);
    return teams.map((t) => ({ ...t, players: players.filter((p) => p.team_id === t.id) }));
  },

  async get(id: string): Promise<Team> {
    const teams = load<Team[]>("teams", []);
    const team = teams.find((t) => t.id === id);
    if (!team) throw new Error("Team not found");
    const players = load<Player[]>("players", []).filter((p) => p.team_id === id);
    return { ...team, players };
  },

  async create(tournamentId: string, name: string, playerNames: string[], logo = "🏸", color = "#00ff88"): Promise<Team> {
    const team: Team = {
      id: genId(),
      tournament_id: tournamentId,
      name,
      logo_emoji: logo,
      color,
      seed: null,
      is_active: true,
    };
    const teams = load<Team[]>("teams", []);
    teams.push(team);
    save("teams", teams);

    if (playerNames.length > 0) {
      const players = load<Player[]>("players", []);
      playerNames.forEach((full_name, i) => {
        players.push({ id: genId(), team_id: team.id, tournament_id: tournamentId, full_name, jersey_number: null, avatar_url: null, is_captain: i === 0 });
      });
      save("players", players);
    }

    return localTeamApi.get(team.id);
  },

  async update(id: string, payload: Partial<Team>, playerNames: string[]): Promise<Team> {
    const teams = load<Team[]>("teams", []);
    const idx = teams.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error("Team not found");
    teams[idx] = { ...teams[idx], ...payload };
    save("teams", teams);

    let players = load<Player[]>("players", []);
    players = players.filter((p) => p.team_id !== id);
    playerNames.forEach((full_name, i) => {
      players.push({ id: genId(), team_id: id, tournament_id: teams[idx].tournament_id, full_name, jersey_number: null, avatar_url: null, is_captain: i === 0 });
    });
    save("players", players);

    return localTeamApi.get(id);
  },

  async remove(id: string) {
    const teams = load<Team[]>("teams", []);
    const idx = teams.findIndex((t) => t.id === id);
    if (idx >= 0) { teams[idx].is_active = false; save("teams", teams); }
  },

  async bulkImport(tournamentId: string, rows: Array<{ name: string; player1: string; player2: string }>) {
    return Promise.all(rows.map((r) => localTeamApi.create(tournamentId, r.name, [r.player1, r.player2])));
  },
};

// ── Group ──────────────────────────────────────────────────
export const localGroupApi = {
  async list(tournamentId: string): Promise<Group[]> {
    const groups = load<Group[]>("groups", []).filter((g) => g.tournament_id === tournamentId);
    const groupTeams = load<Array<{ group_id: string; team_id: string }>>("group_teams", []);
    const teams = load<Team[]>("teams", []);
    const players = load<Player[]>("players", []);
    return groups.map((g) => ({
      ...g,
      teams: groupTeams
        .filter((gt) => gt.group_id === g.id)
        .map((gt) => {
          const team = teams.find((t) => t.id === gt.team_id);
          return team ? { ...team, players: players.filter((p) => p.team_id === team.id) } : null;
        })
        .filter(Boolean) as Team[],
    }));
  },

  async create(tournamentId: string, name: string, displayOrder: number): Promise<Group> {
    const g: Group = { id: genId(), tournament_id: tournamentId, name, display_order: displayOrder };
    const groups = load<Group[]>("groups", []);
    groups.push(g);
    save("groups", groups);
    return g;
  },

  async update(id: string, payload: Partial<Group>): Promise<Group> {
    const groups = load<Group[]>("groups", []);
    const idx = groups.findIndex((g) => g.id === id);
    if (idx < 0) throw new Error("Group not found");
    groups[idx] = { ...groups[idx], ...payload };
    save("groups", groups);
    return groups[idx];
  },

  async remove(id: string) {
    let groups = load<Group[]>("groups", []);
    groups = groups.filter((g) => g.id !== id);
    save("groups", groups);
    let groupTeams = load<Array<{ group_id: string; team_id: string }>>("group_teams", []);
    groupTeams = groupTeams.filter((gt) => gt.group_id !== id);
    save("group_teams", groupTeams);
  },

  async assignTeam(groupId: string, teamId: string) {
    const groupTeams = load<Array<{ group_id: string; team_id: string }>>("group_teams", []);
    groupTeams.push({ group_id: groupId, team_id: teamId });
    save("group_teams", groupTeams);
  },

  async generate(tournamentId: string) {
    const teams = await localTeamApi.list(tournamentId);
    const tournament = await localTournamentApi.get(tournamentId);
    const groupCount = tournament.group_count ?? 2;
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    // Clean existing
    const existing = load<Group[]>("groups", []).filter((g) => g.tournament_id === tournamentId);
    const existingIds = existing.map((g) => g.id);
    let groupTeams = load<Array<{ group_id: string; team_id: string }>>("group_teams", []);
    groupTeams = groupTeams.filter((gt) => !existingIds.includes(gt.group_id));
    save("group_teams", groupTeams);
    let groups = load<Group[]>("groups", []);
    groups = groups.filter((g) => g.tournament_id !== tournamentId);
    save("groups", groups);

    // Create new groups
    const groupNames = "ABCDEFGHIJ".slice(0, groupCount).split("");
    const groupIds: string[] = [];
    for (let i = 0; i < groupNames.length; i++) {
      const g = await localGroupApi.create(tournamentId, groupNames[i], i + 1);
      groupIds.push(g.id);
    }

    // Distribute teams round-robin
    const assignments = shuffled.map((team, idx) => ({ group_id: groupIds[idx % groupCount], team_id: team.id }));
    save("group_teams", [...load<Array<{ group_id: string; team_id: string }>>("group_teams", []), ...assignments]);
  },
};

// ── Court ──────────────────────────────────────────────────
export const localCourtApi = {
  async list(tournamentId: string): Promise<Court[]> {
    const courts = load<Court[]>("courts", []).filter((c) => c.tournament_id === tournamentId);
    const matches = load<Match[]>("matches", []);
    const teams = load<Team[]>("teams", []);
    return courts.map((court) => {
      const liveMatch = matches
        .filter((m) => m.court_id === court.id && (m.status === "live" || m.status === "upcoming"))
        .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""))[0];
      let current_match = null as any;
      if (liveMatch) {
        current_match = { ...liveMatch, team1: teams.find((t) => t.id === liveMatch.team1_id) ?? null, team2: teams.find((t) => t.id === liveMatch.team2_id) ?? null };
      }
      return { ...court, current_match };
    });
  },

  async create(tournamentId: string, name: string, displayOrder: number): Promise<Court> {
    const c: Court = { id: genId(), tournament_id: tournamentId, name, is_active: true, display_order: displayOrder };
    const courts = load<Court[]>("courts", []);
    courts.push(c);
    save("courts", courts);
    return c;
  },

  async update(id: string, payload: Partial<Court>): Promise<Court> {
    const courts = load<Court[]>("courts", []);
    const idx = courts.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Court not found");
    courts[idx] = { ...courts[idx], ...payload };
    save("courts", courts);
    return courts[idx];
  },

  async remove(id: string) {
    let courts = load<Court[]>("courts", []);
    courts = courts.filter((c) => c.id !== id);
    save("courts", courts);
  },
};

// ── Match ──────────────────────────────────────────────────
function loadMatchWithJoins(m: Match): Match {
  const teams = load<Team[]>("teams", []);
  const players = load<Player[]>("players", []);
  const courts = load<Court[]>("courts", []);
  const groups = load<Group[]>("groups", []);
  const t1 = teams.find((t) => t.id === m.team1_id);
  const t2 = teams.find((t) => t.id === m.team2_id);
  return {
    ...m,
    team1: t1 ? { ...t1, players: players.filter((p) => p.team_id === t1.id) } : undefined,
    team2: t2 ? { ...t2, players: players.filter((p) => p.team_id === t2.id) } : undefined,
    court: courts.find((c) => c.id === m.court_id),
    group: groups.find((g) => g.id === m.group_id),
  };
}

function recalcStandings(tournamentId: string): void {
  const matches = load<Match[]>("matches", []).filter((m) => m.tournament_id === tournamentId && m.status === "completed");
  const teams = load<Team[]>("teams", []).filter((t) => t.tournament_id === tournamentId && t.is_active);
  const groupTeams = load<Array<{ group_id: string; team_id: string }>>("group_teams", []);

  const standingsMap = new Map<string, Standing>();

  for (const team of teams) {
    const gt = groupTeams.find((gt) => gt.team_id === team.id);
    const key = `${team.id}-${gt?.group_id ?? "overall"}`;
    standingsMap.set(key, {
      id: genId(),
      tournament_id: tournamentId,
      group_id: gt?.group_id ?? null,
      team_id: team.id,
      played: 0, wins: 0, losses: 0,
      points_for: 0, points_against: 0,
      point_diff: 0, pts: 0,
      updated_at: new Date().toISOString(),
    });
  }

  for (const match of matches) {
    const t1Key = `${match.team1_id}-${match.group_id ?? "overall"}`;
    const t2Key = `${match.team2_id}-${match.group_id ?? "overall"}`;
    const s1 = standingsMap.get(t1Key);
    const s2 = standingsMap.get(t2Key);
    if (!s1 || !s2) continue;
    s1.played++; s2.played++;
    s1.points_for += match.score1 ?? 0;
    s1.points_against += match.score2 ?? 0;
    s2.points_for += match.score2 ?? 0;
    s2.points_against += match.score1 ?? 0;
    if ((match.score1 ?? 0) > (match.score2 ?? 0)) { s1.wins++; s2.losses++; }
    else if ((match.score1 ?? 0) < (match.score2 ?? 0)) { s2.wins++; s1.losses++; }
    s1.point_diff = s1.points_for - s1.points_against;
    s2.point_diff = s2.points_for - s2.points_against;
    s1.pts = s1.wins * 2;
    s2.pts = s2.wins * 2;
  }

  save("standings", Array.from(standingsMap.values()));
}

export const localMatchApi = {
  async list(tournamentId: string): Promise<Match[]> {
    const matches = load<Match[]>("matches", []).filter((m) => m.tournament_id === tournamentId);
    return matches.sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "") || (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? "")).map(loadMatchWithJoins);
  },

  async get(id: string): Promise<Match> {
    const match = load<Match[]>("matches", []).find((m) => m.id === id);
    if (!match) throw new Error("Match not found");
    return loadMatchWithJoins(match);
  },

  async start(id: string): Promise<Match> {
    const matches = load<Match[]>("matches", []);
    const idx = matches.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Match not found");
    matches[idx] = { ...matches[idx], status: "live", score1: 0, score2: 0, started_at: new Date().toISOString() };
    save("matches", matches);
    return loadMatchWithJoins(matches[idx]);
  },

  async updateScore(id: string, score1: number, score2: number): Promise<Match> {
    const matches = load<Match[]>("matches", []);
    const idx = matches.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Match not found");
    matches[idx] = { ...matches[idx], score1, score2, status: "live" };
    save("matches", matches);
    return loadMatchWithJoins(matches[idx]);
  },

  async complete(id: string): Promise<Match> {
    const matches = load<Match[]>("matches", []);
    const idx = matches.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Match not found");
    matches[idx] = { ...matches[idx], status: "completed", completed_at: new Date().toISOString(), winner_id: (matches[idx].score1 ?? 0) >= (matches[idx].score2 ?? 0) ? matches[idx].team1_id : matches[idx].team2_id };
    save("matches", matches);
    recalcStandings(matches[idx].tournament_id);
    return loadMatchWithJoins(matches[idx]);
  },

  async assignCourt(matchId: string, courtId: string): Promise<Match> {
    const matches = load<Match[]>("matches", []);
    const idx = matches.findIndex((m) => m.id === matchId);
    if (idx < 0) throw new Error("Match not found");
    matches[idx] = { ...matches[idx], court_id: courtId };
    save("matches", matches);
    return loadMatchWithJoins(matches[idx]);
  },

  async reschedule(matchId: string, date: string, time: string): Promise<Match> {
    const matches = load<Match[]>("matches", []);
    const idx = matches.findIndex((m) => m.id === matchId);
    if (idx < 0) throw new Error("Match not found");
    matches[idx] = { ...matches[idx], scheduled_date: date, scheduled_time: time };
    save("matches", matches);
    return loadMatchWithJoins(matches[idx]);
  },

  async generateGroupFixtures(tournamentId: string, groupId: string, teamIds: string[], courtIds: string[]): Promise<void> {
    const times = ["09:00", "09:45", "10:30", "11:15", "12:00", "12:45", "13:30", "14:15"];
    const matches = load<Match[]>("matches", []);
    let ti = 0;
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        matches.push({
          id: genId(),
          tournament_id: tournamentId,
          group_id: groupId,
          court_id: courtIds[matches.length % courtIds.length],
          team1_id: teamIds[i],
          team2_id: teamIds[j],
          score1: null, score2: null,
          status: "upcoming",
          stage: "group",
          scheduled_date: new Date().toISOString().split("T")[0],
          scheduled_time: times[ti++ % times.length],
          started_at: null, completed_at: null, winner_id: null,
          round_number: 1,
          match_number: matches.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    save("matches", matches);
  },

  async generateSemifinals(tournamentId: string, courtIds: string[]) {
    const standings = await localStandingsApi.list(tournamentId);
    const byGroup: Record<string, Standing[]> = {};
    for (const s of standings) {
      if (!s.group_id) continue;
      if (!byGroup[s.group_id]) byGroup[s.group_id] = [];
      byGroup[s.group_id].push(s);
    }
    const groups = Object.values(byGroup);
    if (groups.length < 2) throw new Error("Need at least 2 groups");
    const toppers = groups.map((g) => g.sort((a, b) => b.pts - a.pts || b.point_diff - a.point_diff)[0]);
    const runners = groups.map((g) => g.sort((a, b) => b.pts - a.pts || b.point_diff - a.point_diff)[1]);
    const semis = [
      { team1_id: toppers[0].team_id, team2_id: runners[1].team_id, match_number: 1, scheduled_time: "15:00" },
      { team1_id: toppers[1].team_id, team2_id: runners[0].team_id, match_number: 2, scheduled_time: "16:00" },
    ];
    const matches = load<Match[]>("matches", []);
    semis.forEach((s, i) => {
      matches.push({
        id: genId(),
        tournament_id: tournamentId,
        group_id: null, court_id: courtIds[i % courtIds.length],
        team1_id: s.team1_id, team2_id: s.team2_id,
        score1: null, score2: null,
        status: "upcoming", stage: "semifinal",
        scheduled_date: new Date().toISOString().split("T")[0],
        scheduled_time: s.scheduled_time,
        started_at: null, completed_at: null, winner_id: null,
        round_number: 1, match_number: s.match_number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
    save("matches", matches);
  },

  async generateFinal(tournamentId: string, courtId: string) {
    const matches = load<Match[]>("matches", []);
    const semis = matches.filter((m) => m.tournament_id === tournamentId && m.stage === "semifinal" && m.status === "completed");
    if (semis.length < 2) throw new Error("Semifinals not complete");
    const finalists = semis.map((s) => (s.score1 ?? 0) >= (s.score2 ?? 0) ? s.team1_id : s.team2_id);
    matches.push({
      id: genId(),
      tournament_id: tournamentId,
      group_id: null, court_id: courtId,
      team1_id: finalists[0], team2_id: finalists[1],
      score1: null, score2: null,
      status: "upcoming", stage: "final",
      scheduled_date: new Date().toISOString().split("T")[0],
      scheduled_time: "17:00",
      started_at: null, completed_at: null, winner_id: null,
      round_number: 1, match_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    save("matches", matches);
  },
};

// ── Standings ──────────────────────────────────────────────
export const localStandingsApi = {
  async list(tournamentId: string): Promise<Standing[]> {
    const standings = load<Standing[]>("standings", []).filter((s) => s.tournament_id === tournamentId);
    const teams = load<Team[]>("teams", []);
    return standings
      .map((s) => ({ ...s, team: teams.find((t) => t.id === s.team_id) }))
      .sort((a, b) => b.pts - a.pts || b.point_diff - a.point_diff);
  },

  async listByGroup(tournamentId: string, groupId: string): Promise<Standing[]> {
    const all = await localStandingsApi.list(tournamentId);
    return all.filter((s) => s.group_id === groupId);
  },
};

// ── Notifications ──────────────────────────────────────────
export const localNotifApi = {
  async list(tournamentId: string, limit = 20): Promise<Notification[]> {
    return load<Notification[]>("notifications", [])
      .filter((n) => n.tournament_id === tournamentId)
      .sort((a, b) => b.sent_at.localeCompare(a.sent_at))
      .slice(0, limit);
  },

  async send(tournamentId: string, title: string, body: string, icon = "🏸", type = "info"): Promise<Notification> {
    const n: Notification = { id: genId(), tournament_id: tournamentId, title, body, icon, type, is_read: false, sent_at: new Date().toISOString() };
    const notifs = load<Notification[]>("notifications", []);
    notifs.push(n);
    save("notifications", notifs);
    return n;
  },

  async markRead(id: string) {
    const notifs = load<Notification[]>("notifications", []);
    const idx = notifs.findIndex((n) => n.id === id);
    if (idx >= 0) { notifs[idx].is_read = true; save("notifications", notifs); }
  },

  matchStarting: (tid: string, t1: string, t2: string, court: string) =>
    localNotifApi.send(tid, "Match Starting!", `${t1} vs ${t2} on ${court}`, "⚡", "alert"),

  matchResult: (tid: string, winner: string, score: string) =>
    localNotifApi.send(tid, "Match Complete", `${winner} wins! ${score}`, "✅", "result"),

  semifinalReady: (tid: string) =>
    localNotifApi.send(tid, "Semi-Finals Announced!", "Check the bracket for your fixture.", "🏆", "info"),

  finalReady: (tid: string) =>
    localNotifApi.send(tid, "🔴 THE FINAL IS SET!", "The championship match is about to begin!", "🌟", "alert"),

  champion: (tid: string, winner: string) =>
    localNotifApi.send(tid, "🏆 CHAMPIONS!", `${winner} wins the tournament! Congratulations!`, "🥇", "result"),
};

// ── Realtime (no-op stubs for local backend) ───────────────
export const localRealtime = {
  onMatchUpdate(_tournamentId: string, _callback: (match: Match) => void): { unsubscribe: () => void } {
    return { unsubscribe: () => {} };
  },
  onStandingsUpdate(_tournamentId: string, _callback: (standings: Standing[]) => void): { unsubscribe: () => void } {
    return { unsubscribe: () => {} };
  },
  onNotification(_tournamentId: string, _callback: (notif: Notification) => void): { unsubscribe: () => void } {
    return { unsubscribe: () => {} };
  },
  async unsubscribe(_channel: any) {},
};
