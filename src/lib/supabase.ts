// ============================================================
//  ShuttlePro · Supabase Client, Types & Hooks
//  File: src/lib/supabase.ts
//  Note: Uses localStorage backend for offline development.
// ============================================================

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

// ── Import localStorage backend ──────────────────────────
import {
  localAuth,
  localTournamentApi,
  localTeamApi,
  localGroupApi,
  localCourtApi,
  localMatchApi,
  localStandingsApi,
  localNotifApi,
  localRealtime,
} from "./localBackend";

// ============================================================
//  AUTH API (localStorage)
// ============================================================
export const auth = localAuth;

// ============================================================
//  TOURNAMENT API (localStorage)
// ============================================================
export const tournamentApi = localTournamentApi;

// ============================================================
//  TEAM API (localStorage)
// ============================================================
export const teamApi = localTeamApi;

// ============================================================
//  GROUP API (localStorage)
// ============================================================
export const groupApi = localGroupApi;

// ============================================================
//  MATCH API (localStorage)
// ============================================================
export const matchApi = localMatchApi;

// ============================================================
//  STANDINGS API (localStorage)
// ============================================================
export const standingsApi = localStandingsApi;

// ============================================================
//  COURT API (localStorage)
// ============================================================
export const courtApi = localCourtApi;

// ============================================================
//  NOTIFICATION API (localStorage)
// ============================================================
export const notifApi = localNotifApi;

// ============================================================
//  REALTIME SUBSCRIPTIONS (localStorage — no-op)
// ============================================================
export const realtime = localRealtime;

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
