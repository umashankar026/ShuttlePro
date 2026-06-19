// ============================================================
//  ShuttlePro · Supabase Client, Types & Hooks
//  File: src/lib/supabase.ts
//  Install: npm install @supabase/supabase-js
// ============================================================

import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// ── ENV (add to .env.local) ───────────────────────────────
// NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// SUPABASE_SERVICE_ROLE_KEY=your-service-key  ← server only

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── TYPES ─────────────────────────────────────────────────
export type MatchStatus   = "upcoming" | "live" | "completed" | "cancelled";
export type MatchStage    = "group" | "semifinal" | "final" | "third_place";
export type TournamentStatus = "draft" | "active" | "completed" | "cancelled";
export type UserRole      = "superadmin" | "admin" | "scorer" | "spectator";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  type: "singles" | "doubles" | "mixed_doubles";
  status: TournamentStatus;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  max_teams: number;
  group_count: number;
  courts_count: number;
  created_by: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  logo_emoji: string;
  color: string;
  seed: number | null;
  is_active: boolean;
  players?: Player[];
}

export interface Player {
  id: string;
  team_id: string;
  tournament_id: string;
  full_name: string;
  jersey_number: number | null;
  avatar_url: string | null;
  is_captain: boolean;
}

export interface Group {
  id: string;
  tournament_id: string;
  name: string;
  display_order: number;
  teams?: Team[];
}

export interface Court {
  id: string;
  tournament_id: string;
  name: string;
  is_active: boolean;
  display_order: number;
  current_match?: Match | null;
}

export interface Match {
  id: string;
  tournament_id: string;
  group_id: string | null;
  court_id: string | null;
  team1_id: string;
  team2_id: string;
  score1: number | null;
  score2: number | null;
  status: MatchStatus;
  stage: MatchStage;
  scheduled_time: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  winner_id: string | null;
  round_number: number;
  match_number: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  team1?: Team;
  team2?: Team;
  court?: Court;
  group?: Group;
}

export interface Standing {
  id: string;
  tournament_id: string;
  group_id: string | null;
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_diff: number;
  pts: number;
  updated_at: string;
  team?: Team;
}

export interface Notification {
  id: string;
  tournament_id: string | null;
  title: string;
  body: string;
  icon: string;
  type: string;
  is_read: boolean;
  sent_at: string;
}

// ============================================================
//  AUTH API
// ============================================================
export const auth = {
  /** Sign in as admin */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  /** Sign up new user */
  async signUp(email: string, password: string) {
    // create user via Supabase auth
    // NOTE: client-side signUp may require email confirmation depending on Supabase settings
    // This helper returns the data or throws an error for the caller to handle
    // Using the v2 API: signUp
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // If user created immediately, ensure a profiles row exists
    try {
      // data may contain user
      // @ts-ignore
      const user = data?.user;
      if (user && user.id) {
        const profile = {
          id: user.id,
          full_name: null,
          avatar_url: null,
          role: "spectator",
          created_at: new Date().toISOString(),
        };
        // upsert to avoid duplicate errors
        await supabase.from("profiles").upsert(profile, { onConflict: "id" });
      }
    } catch (e) {
      // non-fatal: ignore profile insert errors for client-side signup
      console.warn("profile upsert failed", e);
    }

    return data;
  },

  /** Sign out */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Get current session */
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Get current user profile with role */
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return data;
  },

  /** Subscribe to auth state changes */
  onAuthChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};

// ============================================================
//  TOURNAMENT API
// ============================================================
export const tournamentApi = {
  /** Fetch all tournaments */
  async list(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Fetch single tournament */
  async get(id: string): Promise<Tournament> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Create tournament */
  async create(payload: Partial<Tournament>): Promise<Tournament> {
    const { data, error } = await supabase
      .from("tournaments")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update tournament */
  async update(id: string, payload: Partial<Tournament>): Promise<Tournament> {
    const { data, error } = await supabase
      .from("tournaments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Set tournament status */
  async setStatus(id: string, status: TournamentStatus) {
    return tournamentApi.update(id, { status });
  },
};

// ============================================================
//  TEAM API
// ============================================================
export const teamApi = {
  /** Get all teams for a tournament (with players) */
  async list(tournamentId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from("teams")
      .select(`*, players(*)`)
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  /** Create team + players in one go */
  async create(tournamentId: string, name: string, playerNames: string[], logo = "🏸", color = "#00ff88"): Promise<Team> {
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ tournament_id: tournamentId, name, logo_emoji: logo, color })
      .select()
      .single();
    if (error) throw error;

    if (playerNames.length > 0) {
      const players = playerNames.map((full_name, i) => ({
        team_id: team.id,
        tournament_id: tournamentId,
        full_name,
        is_captain: i === 0,
      }));
      await supabase.from("players").insert(players);
    }
    return team;
  },

  /** Delete team */
  async remove(id: string) {
    const { error } = await supabase.from("teams").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  },

  /** Bulk import teams from CSV array */
  async bulkImport(tournamentId: string, rows: Array<{ name: string; player1: string; player2: string }>) {
    const results = await Promise.all(
      rows.map((r) => teamApi.create(tournamentId, r.name, [r.player1, r.player2]))
    );
    return results;
  },
};

// ============================================================
//  GROUP API
// ============================================================
export const groupApi = {
  /** Get groups with teams for a tournament */
  async list(tournamentId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from("groups")
      .select(`*, group_teams(team_id, teams(*))`)
      .eq("tournament_id", tournamentId)
      .order("display_order");
    if (error) throw error;

    // Flatten group_teams into teams array
    return (data ?? []).map((g: any) => ({
      ...g,
      teams: g.group_teams?.map((gt: any) => gt.teams) ?? [],
    }));
  },

  /** Auto-generate balanced groups from all teams */
  async generate(tournamentId: string): Promise<void> {
    const teams = await teamApi.list(tournamentId);
    const tournament = await tournamentApi.get(tournamentId);
    const groupCount = tournament.group_count ?? 2;

    // Shuffle teams
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    // Delete existing group assignments
    const { data: existingGroups } = await supabase
      .from("groups")
      .select("id")
      .eq("tournament_id", tournamentId);

    if (existingGroups?.length) {
      await supabase.from("group_teams").delete()
        .in("group_id", existingGroups.map((g: any) => g.id));
      await supabase.from("groups").delete().eq("tournament_id", tournamentId);
    }

    // Create new groups
    const groupNames = "ABCDEFGHIJ".slice(0, groupCount).split("");
    const groupIds: string[] = [];

    for (let i = 0; i < groupNames.length; i++) {
      const { data } = await supabase
        .from("groups")
        .insert({ tournament_id: tournamentId, name: groupNames[i], display_order: i + 1 })
        .select()
        .single();
      groupIds.push(data.id);
    }

    // Distribute teams round-robin across groups
    const assignments = shuffled.map((team, idx) => ({
      group_id: groupIds[idx % groupCount],
      team_id: team.id,
    }));

    await supabase.from("group_teams").insert(assignments);
  },
};

// ============================================================
//  MATCH API
// ============================================================
export const matchApi = {
  /** Fetch all matches for a tournament with joins */
  async list(tournamentId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        court:courts(*),
        group:groups(*)
      `)
      .eq("tournament_id", tournamentId)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Fetch single match */
  async get(id: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        court:courts(*),
        group:groups(*)
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Start a match */
  async start(id: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .update({ status: "live", score1: 0, score2: 0, started_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update score (auto-triggers standings recalc in DB) */
  async updateScore(id: string, score1: number, score2: number): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .update({ score1, score2, status: "live" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Complete a match (triggers standings trigger) */
  async complete(id: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .update({ status: "completed" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Assign match to a court */
  async assignCourt(matchId: string, courtId: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .update({ court_id: courtId })
      .eq("id", matchId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Reschedule a match */
  async reschedule(matchId: string, date: string, time: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .update({ scheduled_date: date, scheduled_time: time })
      .eq("id", matchId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Auto-generate round-robin fixtures for a group */
  async generateGroupFixtures(tournamentId: string, groupId: string, teamIds: string[], courtIds: string[]): Promise<void> {
    const times = ["09:00", "09:45", "10:30", "11:15", "12:00", "12:45", "13:30", "14:15"];
    const fixtures: Partial<Match>[] = [];
    let ti = 0;

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        fixtures.push({
          tournament_id: tournamentId,
          group_id: groupId,
          team1_id: teamIds[i],
          team2_id: teamIds[j],
          court_id: courtIds[fixtures.length % courtIds.length],
          stage: "group",
          status: "upcoming",
          scheduled_date: new Date().toISOString().split("T")[0],
          scheduled_time: times[ti++ % times.length],
          round_number: 1,
          match_number: fixtures.length + 1,
        });
      }
    }

    const { error } = await supabase.from("matches").insert(fixtures);
    if (error) throw error;
  },

  /** Generate semi-final fixtures from group toppers */
  async generateSemifinals(tournamentId: string, courtIds: string[]): Promise<void> {
    const standings = await standingsApi.list(tournamentId);

    // Group by group_id, sort by pts then point_diff
    const byGroup: Record<string, Standing[]> = {};
    for (const s of standings) {
      if (!s.group_id) continue;
      if (!byGroup[s.group_id]) byGroup[s.group_id] = [];
      byGroup[s.group_id].push(s);
    }

    const groups = Object.values(byGroup);
    if (groups.length < 2) throw new Error("Need at least 2 groups");

    const toppers  = groups.map((g) => g.sort((a, b) => b.pts - a.pts || b.point_diff - a.point_diff)[0]);
    const runners  = groups.map((g) => g.sort((a, b) => b.pts - a.pts || b.point_diff - a.point_diff)[1]);

    const semis = [
      { team1_id: toppers[0].team_id, team2_id: runners[1].team_id, match_number: 1, scheduled_time: "15:00" },
      { team1_id: toppers[1].team_id, team2_id: runners[0].team_id, match_number: 2, scheduled_time: "16:00" },
    ];

    const fixtures = semis.map((s, i) => ({
      tournament_id: tournamentId,
      team1_id: s.team1_id,
      team2_id: s.team2_id,
      court_id: courtIds[i % courtIds.length],
      stage: "semifinal" as MatchStage,
      status: "upcoming" as MatchStatus,
      scheduled_date: new Date().toISOString().split("T")[0],
      scheduled_time: s.scheduled_time,
      match_number: s.match_number,
    }));

    const { error } = await supabase.from("matches").insert(fixtures);
    if (error) throw error;
  },

  /** Generate the final from semifinal winners */
  async generateFinal(tournamentId: string, courtId: string): Promise<void> {
    const { data: semis } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("stage", "semifinal")
      .eq("status", "completed");

    if (!semis || semis.length < 2) throw new Error("Semifinals not complete");

    const finalists = semis.map((s: any) =>
      (s.score1 ?? 0) >= (s.score2 ?? 0) ? s.team1_id : s.team2_id
    );

    const { error } = await supabase.from("matches").insert({
      tournament_id: tournamentId,
      team1_id: finalists[0],
      team2_id: finalists[1],
      court_id: courtId,
      stage: "final",
      status: "upcoming",
      scheduled_date: new Date().toISOString().split("T")[0],
      scheduled_time: "17:00",
      match_number: 1,
    });
    if (error) throw error;
  },
};

// ============================================================
//  STANDINGS API
// ============================================================
export const standingsApi = {
  /** Get standings for tournament (with team details) */
  async list(tournamentId: string): Promise<Standing[]> {
    const { data, error } = await supabase
      .from("standings")
      .select(`*, team:teams(*)`)
      .eq("tournament_id", tournamentId)
      .order("pts", { ascending: false })
      .order("point_diff", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Get standings for a specific group */
  async listByGroup(tournamentId: string, groupId: string): Promise<Standing[]> {
    const { data, error } = await supabase
      .from("standings")
      .select(`*, team:teams(*)`)
      .eq("tournament_id", tournamentId)
      .eq("group_id", groupId)
      .order("pts", { ascending: false })
      .order("point_diff", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ============================================================
//  COURT API
// ============================================================
export const courtApi = {
  /** List courts with live match info */
  async list(tournamentId: string): Promise<Court[]> {
    const { data: courts, error } = await supabase
      .from("courts")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("display_order");
    if (error) throw error;

    // Enrich with current match
    const enriched = await Promise.all(
      (courts ?? []).map(async (court) => {
        const { data: liveMatch } = await supabase
          .from("matches")
          .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
          .eq("court_id", court.id)
          .in("status", ["live", "upcoming"])
          .order("scheduled_time", { ascending: true })
          .limit(1)
          .maybeSingle();
        return { ...court, current_match: liveMatch };
      })
    );
    return enriched;
  },
};

// ============================================================
//  NOTIFICATION API
// ============================================================
export const notifApi = {
  /** List notifications for tournament */
  async list(tournamentId: string, limit = 20): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sent_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  /** Send a notification (admin only) */
  async send(tournamentId: string, title: string, body: string, icon = "🏸", type = "info"): Promise<Notification> {
    const { data, error } = await supabase
      .from("notifications")
      .insert({ tournament_id: tournamentId, title, body, icon, type })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Mark as read */
  async markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  },

  /** Quick helpers */
  matchStarting: (tid: string, t1: string, t2: string, court: string) =>
    notifApi.send(tid, "Match Starting!", `${t1} vs ${t2} on ${court}`, "⚡", "alert"),

  matchResult: (tid: string, winner: string, score: string) =>
    notifApi.send(tid, "Match Complete", `${winner} wins! ${score}`, "✅", "result"),

  semifinalReady: (tid: string) =>
    notifApi.send(tid, "Semi-Finals Announced!", "Check the bracket for your fixture.", "🏆", "info"),

  finalReady: (tid: string) =>
    notifApi.send(tid, "🔴 THE FINAL IS SET!", "The championship match is about to begin!", "🌟", "alert"),

  champion: (tid: string, winner: string) =>
    notifApi.send(tid, "🏆 CHAMPIONS!", `${winner} wins the tournament! Congratulations!`, "🥇", "result"),
};

// ============================================================
//  REALTIME SUBSCRIPTIONS
// ============================================================
export const realtime = {
  /**
   * Subscribe to live match score updates
   * Fires callback whenever any match in the tournament changes
   */
  onMatchUpdate(tournamentId: string, callback: (match: Match) => void): RealtimeChannel {
    return supabase
      .channel(`matches:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload) => {
          // Re-fetch with joins for full data
          if (payload.new && (payload.new as any).id) {
            const match = await matchApi.get((payload.new as any).id);
            callback(match);
          }
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to standings changes
   */
  onStandingsUpdate(tournamentId: string, callback: (standings: Standing[]) => void): RealtimeChannel {
    return supabase
      .channel(`standings:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async () => {
          const standings = await standingsApi.list(tournamentId);
          callback(standings);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to new notifications
   */
  onNotification(tournamentId: string, callback: (notif: Notification) => void): RealtimeChannel {
    return supabase
      .channel(`notifications:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => callback(payload.new as Notification)
      )
      .subscribe();
  },

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: RealtimeChannel) {
    await supabase.removeChannel(channel);
  },
};

// ============================================================
//  WHATSAPP SHARING HELPERS
// ============================================================
export const whatsapp = {
  shareMatch(match: Match): void {
    const t1 = match.team1?.name ?? "Team 1";
    const t2 = match.team2?.name ?? "Team 2";
    const score = match.score1 !== null ? `${match.score1} - ${match.score2}` : "vs";
    const court = match.court?.name ?? "TBD";
    const time  = match.scheduled_time ?? "";
    const msg = `🏸 *Match Update*\n${t1} ${score} ${t2}\n📍 ${court} | 🕐 ${time}\n\n_ShuttlePro Tournament Platform_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  },

  shareStandings(group: string, standings: Standing[]): void {
    const rows = standings
      .map((s, i) => `${i + 1}. ${s.team?.name} — ${s.pts}pts (${s.wins}W/${s.losses}L)`)
      .join("\n");
    const msg = `🏸 *Group ${group} Standings*\n\n${rows}\n\n_ShuttlePro Tournament Platform_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  },

  shareWinner(team: Team): void {
    const msg = `🏆 *CHAMPIONS!*\n\n${team.logo_emoji} *${team.name}* wins the tournament!\n\n_ShuttlePro Tournament Platform_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  },
};
