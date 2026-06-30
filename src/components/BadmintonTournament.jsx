import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
// Palette: #0a0a0f (void), #111118 (surface), #1a1a2e (card), #16213e (elevated)
// Accent: #00ff88 (neon green), #00cc6a (green dark), #ff6b35 (orange alert)
// Type: "Orbitron" display, "Rajdhani" body, "JetBrains Mono" data
// Signature: animated shuttle trail on live scores
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INITIAL_TEAMS = [
  { id: 1, name: "Storm Eagles", players: ["Arjun K", "Manu R"], logo: "🦅", color: "#ff6b35" },
  { id: 2, name: "Thunder Hawks", players: ["Vikram S", "Rahul M"], logo: "🦅", color: "#00ff88" },
  { id: 3, name: "Neon Vipers", players: ["Suresh P", "Kiran T"], logo: "🐍", color: "#a855f7" },
  { id: 4, name: "Iron Smash", players: ["Dev A", "Ravi B"], logo: "⚡", color: "#3b82f6" },
  { id: 5, name: "Blaze Rackets", players: ["Sam J", "Alex W"], logo: "🔥", color: "#ef4444" },
  { id: 6, name: "Cosmic Aces", players: ["Leo P", "Max K"], logo: "🌟", color: "#f59e0b" },
  { id: 7, name: "Shadow Nets", players: ["Rony D", "Shiv M"], logo: "🕶️", color: "#6366f1" },
  { id: 8, name: "Gold Smashers", players: ["Tian C", "Wei L"], logo: "🥇", color: "#eab308" },
];

const COURTS = ["Court A", "Court B", "Court C"];

// Stable numeric ID generator to avoid duplicate React keys
// Use deterministic start to avoid SSR/client hydration differences
let NEXT_ID = 1;
function uniqueId() { return NEXT_ID++; }

function generateGroups(teams) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groupSize = Math.ceil(shuffled.length / 2);
  return {
    A: shuffled.slice(0, groupSize),
    B: shuffled.slice(groupSize),
  };
}

function generateRoundRobin(groupTeams, group, courtList) {
  const matches = [];
  const times = ["9:00 AM", "9:45 AM", "10:30 AM", "11:15 AM", "12:00 PM", "1:00 PM", "1:45 PM", "2:30 PM"];
  let ti = 0;
  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      matches.push({
        id: uniqueId(),
        team1: groupTeams[i],
        team2: groupTeams[j],
        score1: null,
        score2: null,
        status: "upcoming",
        group,
        court: courtList[matches.length % courtList.length],
        time: times[ti++ % times.length],
        stage: "group",
      });
    }
  }
  return matches;
}

function calcStandings(teams, matches) {
  const map = {};
  teams.forEach((t) => {
    map[t.id] = { team: t, W: 0, L: 0, PF: 0, PA: 0, PD: 0, pts: 0 };
  });
  matches.forEach((m) => {
    if (m.status !== "completed") return;
    const s1 = m.score1 ?? 0, s2 = m.score2 ?? 0;
    if (map[m.team1.id]) {
      map[m.team1.id].PF += s1; map[m.team1.id].PA += s2; map[m.team1.id].PD += s1 - s2;
      if (s1 > s2) { map[m.team1.id].W++; map[m.team1.id].pts += 2; } else { map[m.team1.id].L++; }
    }
    if (map[m.team2.id]) {
      map[m.team2.id].PF += s2; map[m.team2.id].PA += s1; map[m.team2.id].PD += s2 - s1;
      if (s2 > s1) { map[m.team2.id].W++; map[m.team2.id].pts += 2; } else { map[m.team2.id].L++; }
    }
  });
  return Object.values(map).sort((a, b) => b.pts - a.pts || b.PD - a.PD);
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = {
  shuttle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L8 8l-6 2 6 2 4 6 4-6 6-2-6-2z" />
    </svg>
  ),
  trophy: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4" />
      <path d="M4 5h16v4a8 8 0 0 1-8 8 8 8 0 0 1-8-8V5z" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  ),
  users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  court: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="18" rx="1" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2M12 2v2M12 20v2" />
    </svg>
  ),
  play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  share: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  x: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
${FONTS}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0f; color: #e2e8f0; font-family: 'Rajdhani', sans-serif; }

.app { min-height: 100vh; display: flex; flex-direction: column; background: #0a0a0f; }

/* NAV */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px;
  background: rgba(17,17,24,0.95); border-bottom: 1px solid rgba(0,255,136,0.15);
  position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.nav-brand { display: flex; align-items: center; gap: 10px; }
.nav-logo { font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; color: #00ff88;
  letter-spacing: 2px; text-transform: uppercase; }
.nav-sub { font-size: 11px; color: rgba(0,255,136,0.5); letter-spacing: 3px; font-weight: 500; }
.nav-tabs { display: flex; gap: 2px; }
.nav-tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: none;
  background: transparent; color: #94a3b8; cursor: pointer; font-family: 'Rajdhani', sans-serif;
  font-size: 14px; font-weight: 600; letter-spacing: 0.5px; transition: all 0.2s; }
.nav-tab:hover { background: rgba(0,255,136,0.08); color: #00ff88; }
.nav-tab.active { background: rgba(0,255,136,0.12); color: #00ff88; }
.nav-tab svg { opacity: 0.8; }
.live-pill { display: flex; align-items: center; gap: 6px; background: rgba(255,107,53,0.15);
  border: 1px solid rgba(255,107,53,0.4); border-radius: 20px; padding: 4px 10px; font-size: 11px;
  color: #ff6b35; font-weight: 700; letter-spacing: 1px; font-family: 'Orbitron', sans-serif; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff6b35; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* HERO */
.hero { padding: 48px 24px 36px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,136,0.07) 0%, transparent 70%); }
.hero-label { font-size: 11px; letter-spacing: 4px; color: #00ff88; font-weight: 600;
  text-transform: uppercase; margin-bottom: 10px; font-family: 'Orbitron', sans-serif; }
.hero-title { font-family: 'Orbitron', sans-serif; font-size: clamp(28px,5vw,52px); font-weight: 900;
  color: #fff; line-height: 1.1; margin-bottom: 8px; }
.hero-title span { color: #00ff88; }
.hero-sub { color: #64748b; font-size: 16px; font-weight: 400; margin-bottom: 28px; }
.hero-stats { display: flex; gap: 32px; flex-wrap: wrap; }
.hero-stat { text-align: center; }
.hero-stat-val { font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 700; color: #00ff88; }
.hero-stat-lbl { font-size: 11px; color: #475569; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }

/* CONTENT */
.content { padding: 0 24px 48px; max-width: 1280px; margin: 0 auto; width: 100%; }

/* SECTION */
.section-title { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #00ff88;
  letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ''; flex: 1; height: 1px; background: rgba(0,255,136,0.15); }

/* CARDS */
.card { background: rgba(26,26,46,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
  padding: 20px; backdrop-filter: blur(8px); transition: border-color 0.2s; }
.card:hover { border-color: rgba(0,255,136,0.2); }
.card-grid { display: grid; gap: 16px; }
.card-grid-2 { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
.card-grid-3 { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }

/* MATCH CARD */
.match-card { background: rgba(17,17,24,0.9); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
  padding: 20px; position: relative; overflow: hidden; transition: all 0.25s; cursor: pointer; }
.match-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #00ff88, transparent); opacity: 0; transition: opacity 0.2s; }
.match-card:hover::before { opacity: 1; }
.match-card:hover { border-color: rgba(0,255,136,0.25); transform: translateY(-1px); }
.match-card.live { border-color: rgba(255,107,53,0.3); }
.match-card.live::before { opacity: 1; background: linear-gradient(90deg, transparent, #ff6b35, transparent); }
.match-card.completed { border-color: rgba(100,116,139,0.3); opacity: 0.8; }
.match-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.match-stage { font-size: 10px; letter-spacing: 2px; color: #475569; font-weight: 600; text-transform: uppercase; font-family: 'Orbitron', sans-serif; }
.match-court { font-size: 11px; color: #00ff88; font-weight: 500; background: rgba(0,255,136,0.08); 
  padding: 2px 8px; border-radius: 4px; }
.match-teams { display: flex; align-items: center; gap: 12px; }
.team-info { flex: 1; }
.team-name { font-size: 15px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.3px; }
.team-players { font-size: 12px; color: #475569; margin-top: 2px; }
.score-block { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 64px; }
.score-display { font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 700; color: #fff; text-align: center; letter-spacing: 1px; }
.score-sep { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
.vs-badge { font-family: 'Orbitron', sans-serif; font-size: 10px; color: #334155; font-weight: 700; }
.match-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px;
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.05); }
.match-time { font-size: 12px; color: #475569; display: flex; align-items: center; gap: 6px; }
.status-badge { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; padding: 3px 10px; border-radius: 20px; font-family: 'Orbitron', sans-serif; }
.status-live { background: rgba(255,107,53,0.15); color: #ff6b35; border: 1px solid rgba(255,107,53,0.3); animation: pulse 1.5s infinite; }
.status-upcoming { background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }
.status-done { background: rgba(100,116,139,0.1); color: #64748b; border: 1px solid rgba(100,116,139,0.2); }
.status-semifinal { background: rgba(168,85,247,0.12); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
.status-final { background: rgba(234,179,8,0.12); color: #facc15; border: 1px solid rgba(234,179,8,0.3); }

/* STANDINGS TABLE */
.standings-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.standings-table th { padding: 10px 12px; text-align: left; font-family: 'Orbitron', sans-serif;
  font-size: 9px; letter-spacing: 2px; color: #475569; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.07); }
.standings-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.standings-table tr:hover td { background: rgba(0,255,136,0.03); }
.rank-cell { font-family: 'Orbitron', sans-serif; font-size: 11px; color: #475569; width: 32px; }
.rank-1 { color: #facc15; }
.rank-2 { color: #94a3b8; }
.rank-q { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 8px; }
.team-cell { display: flex; align-items: center; gap: 10px; }
.team-emoji { font-size: 18px; }
.team-cell-name { font-weight: 600; color: #e2e8f0; font-size: 14px; }
.team-cell-subs { font-size: 11px; color: #475569; }
.stat-cell { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #94a3b8; text-align: center; }
.pts-cell { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #00ff88; text-align: center; }
.pd-pos { color: #00ff88; }
.pd-neg { color: #ef4444; }

/* COURT STATUS */
.courts-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
.court-chip { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.court-live { background: rgba(255,107,53,0.1); border-color: rgba(255,107,53,0.4); color: #ff6b35; }
.court-upcoming { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
.court-free { background: rgba(0,255,136,0.06); border-color: rgba(0,255,136,0.2); color: #00ff88; }
.court-dot { width: 8px; height: 8px; border-radius: 50%; }

/* BRACKET */
.bracket-container { display: flex; gap: 32px; overflow-x: auto; padding-bottom: 12px; }
.bracket-col { display: flex; flex-direction: column; gap: 16px; min-width: 220px; }
.bracket-label { font-family: 'Orbitron', sans-serif; font-size: 10px; letter-spacing: 2px; color: #475569;
  text-align: center; margin-bottom: 8px; text-transform: uppercase; }
.bracket-match { background: rgba(17,17,24,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
.bracket-team { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
  font-size: 13px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; }
.bracket-team:last-child { border-bottom: none; }
.bracket-team.winner { background: rgba(0,255,136,0.08); color: #00ff88; }
.bracket-team.tbd { color: #334155; font-style: italic; }
.bracket-score { font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; }

/* ADMIN PANEL */
.admin-grid { display: grid; grid-template-columns: 240px 1fr; gap: 24px; }
.admin-sidebar { background: rgba(17,17,24,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; height: fit-content; }
.admin-menu-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer;
  font-size: 14px; font-weight: 600; color: #64748b; transition: all 0.2s; margin-bottom: 4px; }
.admin-menu-item:hover { background: rgba(0,255,136,0.06); color: #e2e8f0; }
.admin-menu-item.active { background: rgba(0,255,136,0.1); color: #00ff88; }
.admin-content { }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; border: none;
  cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; transition: all 0.2s; }
.btn-primary { background: #00ff88; color: #0a0a0f; }
.btn-primary:hover { background: #00cc6a; transform: translateY(-1px); }
.btn-secondary { background: rgba(0,255,136,0.1); color: #00ff88; border: 1px solid rgba(0,255,136,0.3); }
.btn-secondary:hover { background: rgba(0,255,136,0.18); }
.btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
.btn-danger:hover { background: rgba(239,68,68,0.2); }
.btn-orange { background: rgba(255,107,53,0.12); color: #ff6b35; border: 1px solid rgba(255,107,53,0.3); }
.btn-orange:hover { background: rgba(255,107,53,0.2); }
.btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
.btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

.input-group { margin-bottom: 16px; }
.input-label { display: block; font-size: 11px; letter-spacing: 1.5px; color: #475569; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; font-family: 'Orbitron', sans-serif; }
.input { width: 100%; padding: 10px 14px; background: rgba(17,17,24,0.9); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0; font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 500; transition: border-color 0.2s; outline: none; }
.input:focus { border-color: rgba(0,255,136,0.4); }
.input::placeholder { color: #334155; }

/* TEAM CARDS */
.team-card { background: rgba(17,17,24,0.9); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px;
  display: flex; align-items: center; gap: 16px; transition: all 0.2s; cursor: pointer; }
.team-card:hover { border-color: rgba(0,255,136,0.25); transform: translateY(-1px); }
.team-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center;
  justify-content: center; font-size: 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.team-info-block { flex: 1; }
.team-card-name { font-size: 16px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
.team-card-players { font-size: 13px; color: #475569; }
.team-card-badge { display: flex; align-items: center; gap: 6px; }

/* NOTIFICATIONS */
.notif-list { display: flex; flex-direction: column; gap: 10px; }
.notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px; background: rgba(17,17,24,0.9);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
.notif-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.notif-text { flex: 1; }
.notif-title { font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
.notif-time { font-size: 11px; color: #475569; }

/* WINNER SCREEN */
.winner-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 200; display: flex; align-items: center; justify-content: center; }
.winner-card { background: linear-gradient(135deg, rgba(26,26,46,0.98), rgba(17,17,24,0.98));
  border: 1px solid rgba(234,179,8,0.4); border-radius: 24px; padding: 48px; text-align: center; max-width: 480px; width: 90%; position: relative; overflow: hidden; }
.winner-card::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(234,179,8,0.08), transparent 70%); }
.winner-trophy { font-size: 64px; margin-bottom: 16px; animation: bounce 1s ease-in-out infinite; }
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
.winner-label { font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 3px; color: #facc15; margin-bottom: 12px; }
.winner-name { font-family: 'Orbitron', sans-serif; font-size: 32px; font-weight: 900; color: #fff; margin-bottom: 8px; }
.winner-sub { font-size: 15px; color: #64748b; margin-bottom: 32px; }
.confetti { position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #ff6b35, #00ff88, #facc15, #a855f7, #3b82f6); }

/* SCORE ENTRY */
.score-entry { display: flex; align-items: center; gap: 12px; }
.score-input { width: 56px; padding: 8px; text-align: center; background: rgba(17,17,24,0.9);
  border: 1px solid rgba(0,255,136,0.3); border-radius: 8px; color: #00ff88;
  font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 700; outline: none; }

/* SHUTTLE ANIMATION */
.shuttle-trail { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); opacity: 0.06; font-size: 32px;
  animation: shuttleFly 3s ease-in-out infinite; pointer-events: none; }
@keyframes shuttleFly { 0%,100%{transform:translateY(-50%) rotate(-20deg)} 50%{transform:translateY(calc(-50% - 6px)) rotate(10deg)} }

/* SEARCH */
.search-bar { position: relative; margin-bottom: 20px; }
.search-input { width: 100%; padding: 12px 16px 12px 44px; background: rgba(17,17,24,0.9);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #e2e8f0;
  font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: rgba(0,255,136,0.35); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #475569; font-size: 16px; }

/* TABS */
.tabs { display: flex; gap: 4px; background: rgba(17,17,24,0.9); border-radius: 12px; padding: 4px; margin-bottom: 20px; width: fit-content; }
.tab { padding: 8px 18px; border-radius: 9px; border: none; background: transparent;
  color: #475569; cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.tab.active { background: rgba(0,255,136,0.12); color: #00ff88; }
.tab:hover:not(.active) { color: #94a3b8; }

/* WHATSAPP */
.wa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(37,211,102,0.12);
  border: 1px solid rgba(37,211,102,0.3); border-radius: 8px; color: #25d166; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; }
.wa-btn:hover { background: rgba(37,211,102,0.2); }

/* TOOLTIP */
.group-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;
  letter-spacing: 1px; font-family: 'Orbitron', sans-serif; }
.group-a { background: rgba(0,255,136,0.1); color: #00ff88; border: 1px solid rgba(0,255,136,0.2); }
.group-b { background: rgba(168,85,247,0.1); color: #c084fc; border: 1px solid rgba(168,85,247,0.2); }

/* MISC */
.divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mb-24 { margin-bottom: 24px; }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.gap-16 { gap: 16px; }
.flex { display: flex; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-muted { color: #475569; font-size: 13px; }
.text-green { color: #00ff88; }
.text-orange { color: #ff6b35; }
.text-gold { color: #facc15; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

@media (max-width: 768px) {
  .nav-tabs { display: none; }
  .admin-grid { grid-template-columns: 1fr; }
  .admin-sidebar { display: none; }
  .hero-stats { gap: 20px; }
  .bracket-container { flex-direction: column; }
}

.mobile-nav { display: none; }
@media (max-width: 768px) {
  .mobile-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(17,17,24,0.97);
    border-top: 1px solid rgba(0,255,136,0.1); padding: 8px 0 16px; z-index: 100; justify-content: space-around; }
  .mobile-nav-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 12px;
    background: transparent; border: none; color: #475569; cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; transition: color 0.2s; }
  .mobile-nav-btn.active { color: #00ff88; }
  .content { padding-bottom: 80px; }
}
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [groups, setGroups] = useState({
    A: INITIAL_TEAMS.slice(0, 4),
    B: INITIAL_TEAMS.slice(4),
  });
  const [matches, setMatches] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Tournament brackets have been generated!", time: "2 min ago", icon: "🏸", type: "info" },
    { id: 2, text: "Storm Eagles vs Thunder Hawks starts in 10 mins", time: "5 min ago", icon: "⚡", type: "alert" },
    { id: 3, text: "Court B is now free", time: "8 min ago", icon: "🏟️", type: "court" },
  ]);
  const [winner, setWinner] = useState(null);
  const [tournamentPhase, setTournamentPhase] = useState("group"); // group | semifinal | final | done
  const [adminSection, setAdminSection] = useState("matches");
  const [searchQ, setSearchQ] = useState("");
  const [scoreModal, setScoreModal] = useState(null); // match object
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [addTeamForm, setAddTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newP1, setNewP1] = useState("");
  const [newP2, setNewP2] = useState("");
  const [liveTimer, setLiveTimer] = useState(0);

  // Generate initial matches on mount
  useEffect(() => {
    const gA = generateRoundRobin(groups.A, "A", COURTS);
    const gB = generateRoundRobin(groups.B, "B", COURTS);
    setMatches([...gA, ...gB]);
  }, []);

  // Live timer for active match
  useEffect(() => {
    const hasLive = matches.some((m) => m.status === "live");
    if (!hasLive) return;
    const t = setInterval(() => setLiveTimer((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [matches]);

  const liveMatches = matches.filter((m) => m.status === "live");
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const completedMatches = matches.filter((m) => m.status === "completed");
  const standingsA = calcStandings(groups.A, matches.filter((m) => m.group === "A"));
  const standingsB = calcStandings(groups.B, matches.filter((m) => m.group === "B"));
  const semifinalMatches = matches.filter((m) => m.stage === "semifinal");
  const finalMatch = matches.find((m) => m.stage === "final");

  function startMatch(id) {
    setMatches((prev) => {
      const match = prev.find((m) => m.id === id);
      if (match) {
        addNotif(`Match is now LIVE on ${match.court}! 🔴`, "⚡");
      }
      return prev.map((m) => m.id === id ? { ...m, status: "live", score1: 0, score2: 0 } : m);
    });
  }

  function openScoreModal(match) {
    setScoreModal(match);
    setS1(String(match.score1 ?? ""));
    setS2(String(match.score2 ?? ""));
  }

  function saveScore() {
    if (!scoreModal) return;
    const ns1 = parseInt(s1, 10) || 0;
    const ns2 = parseInt(s2, 10) || 0;
    setMatches((prev) => prev.map((m) => m.id === scoreModal.id
      ? { ...m, score1: ns1, score2: ns2, status: "live" } : m));
    setScoreModal(null);
  }

  function completeMatch(id) {
    setMatches((prev) => {
      const match = prev.find((x) => x.id === id);
      if (!match) return prev;
      const winnerTeam = (match.score1 ?? 0) >= (match.score2 ?? 0) ? match.team1 : match.team2;
      addNotif(`${winnerTeam?.name ?? "Team"} wins! ${match.score1 ?? 0}-${match.score2 ?? 0} ✅`, "🏆");

      if (match.stage === "final" && winnerTeam) {
        setWinner(winnerTeam);
        setTournamentPhase("done");
        addNotif(`🎉 ${winnerTeam.name} are the CHAMPIONS!`, "🥇");
      }

      return prev.map((x) => x.id === id ? { ...x, status: "completed" } : x);
    });
  }

  function generateSemifinals() {
    const topA = standingsA[0]?.team;
    const runnerA = standingsA[1]?.team;
    const topB = standingsB[0]?.team;
    const runnerB = standingsB[1]?.team;
    if (!topA || !runnerA || !topB || !runnerB) return;
    const sf1Id = uniqueId();
    const sf2Id = uniqueId();
    const sf1 = { id: sf1Id, team1: topA, team2: runnerB, score1: null, score2: null, status: "upcoming", group: "SF", court: "Court A", time: "3:00 PM", stage: "semifinal" };
    const sf2 = { id: sf2Id, team1: topB, team2: runnerA, score1: null, score2: null, status: "upcoming", group: "SF", court: "Court B", time: "4:00 PM", stage: "semifinal" };
    setMatches((prev) => [...prev, sf1, sf2]);
    setTournamentPhase("semifinal");
    addNotif("🏸 Semi-final fixtures have been announced!", "📢");
  }

  function generateFinal() {
    const sfs = matches.filter((m) => m.stage === "semifinal" && m.status === "completed");
    if (sfs.length < 2) return;
    const f1 = sfs[0].score1 >= sfs[0].score2 ? sfs[0].team1 : sfs[0].team2;
    const f2 = sfs[1].score1 >= sfs[1].score2 ? sfs[1].team1 : sfs[1].team2;
    const fin = { id: uniqueId(), team1: f1, team2: f2, score1: null, score2: null, status: "upcoming", group: "FINAL", court: "Main Court", time: "5:00 PM", stage: "final" };
    setMatches((prev) => [...prev, fin]);
    setTournamentPhase("final");
    addNotif("🏆 THE FINAL is set! Get ready!", "🌟");
  }

  function addNotif(text, icon = "🏸") {
    setNotifications((prev) => [{ id: uniqueId(), text, time: "Just now", icon }, ...prev.slice(0, 9)]);
  }

  function addTeam() {
    if (!newTeamName.trim()) return;
    const emojis = ["🦅", "⚡", "🔥", "🌟", "🐍", "💫", "🎯", "🛡️"];
    const colors = ["#00ff88", "#ff6b35", "#a855f7", "#3b82f6", "#ef4444", "#f59e0b", "#6366f1", "#eab308"];
    const nt = { id: uniqueId(), name: newTeamName, players: [newP1 || "Player 1", newP2 || "Player 2"],
      logo: emojis[teams.length % emojis.length], color: colors[teams.length % colors.length] };
    const newTeams = [...teams, nt];
    setTeams(newTeams);
    setGroups(generateGroups(newTeams));
    setAddTeamForm(false); setNewTeamName(""); setNewP1(""); setNewP2("");
    addNotif(`${nt.name} has joined the tournament! 🏸`, "👥");
  }

  function shareWhatsApp(text) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const courtStatus = COURTS.map((c) => {
    const live = liveMatches.find((m) => m.court === c);
    const up = upcomingMatches.find((m) => m.court === c);
    return { court: c, status: live ? "live" : up ? "upcoming" : "free", match: live || up || null };
  });

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.players.some((p) => p.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const TABS = [
    { id: "dashboard", label: "Home", icon: "🏠" },
    { id: "matches", label: "Matches", icon: "🏸" },
    { id: "standings", label: "Standings", icon: "📊" },
    { id: "bracket", label: "Bracket", icon: "🏆" },
    { id: "teams", label: "Teams", icon: "👥" },
    { id: "admin", label: "Admin", icon: "⚙️" },
  ];

  function formatTimer(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-brand">
            <div>
              <div className="nav-logo">🏸 ShuttlePro</div>
              <div className="nav-sub">Tournament Platform</div>
            </div>
          </div>
          <div className="nav-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div className="row">
            {liveMatches.length > 0 && (
              <div className="live-pill">
                <div className="live-dot" />
                {liveMatches.length} LIVE
              </div>
            )}
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-label">GameNova Invitational 2026</div>
          <div className="hero-title">Badminton <span>Championship</span></div>
          <div className="hero-sub">Premium tournament management & live scoring</div>
          <div className="hero-stats">
            <div className="hero-stat"><div className="hero-stat-val">{teams.length}</div><div className="hero-stat-lbl">Teams</div></div>
            <div className="hero-stat"><div className="hero-stat-val">{matches.length}</div><div className="hero-stat-lbl">Fixtures</div></div>
            <div className="hero-stat"><div className="hero-stat-val">{liveMatches.length}</div><div className="hero-stat-lbl">Live Now</div></div>
            <div className="hero-stat"><div className="hero-stat-val">{completedMatches.length}</div><div className="hero-stat-lbl">Completed</div></div>
            <div className="hero-stat"><div className="hero-stat-val">{COURTS.length}</div><div className="hero-stat-lbl">Courts</div></div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content">
          {/* COURT STATUS BAR */}
          <div className="courts-row">
            {courtStatus.map((cs) => (
              <div key={cs.court} className={`court-chip court-${cs.status}`}>
                <div className={`court-dot`} style={{ background: cs.status === "live" ? "#ff6b35" : cs.status === "upcoming" ? "#60a5fa" : "#00ff88" }} />
                <span>{cs.court}</span>
                <span style={{ opacity: 0.6, fontSize: "11px" }}>
                  {cs.status === "live" ? "● LIVE" : cs.status === "upcoming" ? "Next" : "Free"}
                </span>
              </div>
            ))}
          </div>

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div>
              {liveMatches.length > 0 && (
                <>
                  <div className="section-title">🔴 Live Matches</div>
                  <div className="card-grid card-grid-2 mb-24">
                    {liveMatches.map((m, i) => <MatchCard key={`${m.id}-${i}`} match={m} onScore={() => openScoreModal(m)} onComplete={() => completeMatch(m.id)} onShare={() => shareWhatsApp(`🏸 LIVE NOW\n${m.team1.name} ${m.score1}-${m.score2} ${m.team2.name}\n${m.court} | ShuttlePro`)} liveTimer={liveTimer} />)}
                  </div>
                </>
              )}
              <div className="section-title">⚡ Upcoming Matches</div>
              <div className="card-grid card-grid-2 mb-24">
                {upcomingMatches.slice(0, 4).map((m, i) => <MatchCard key={`${m.id}-${i}`} match={m} onStart={() => startMatch(m.id)} onShare={() => shareWhatsApp(`🏸 Upcoming Match\n${m.team1.name} vs ${m.team2.name}\n${m.court} | ${m.time}`)} />)}
                {upcomingMatches.length === 0 && <div className="text-muted" style={{ padding: "20px 0" }}>No upcoming matches. Generate semifinals to continue.</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <div className="section-title">Group A Standings</div>
                  <div className="card"><StandingsTable standings={standingsA} /></div>
                </div>
                <div>
                  <div className="section-title">Group B Standings</div>
                  <div className="card"><StandingsTable standings={standingsB} /></div>
                </div>
              </div>
              <div className="divider" />
              <div className="section-title">🔔 Notifications</div>
              <div className="notif-list">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="notif-item">
                    <div className="notif-icon" style={{ background: "rgba(0,255,136,0.06)" }}>{n.icon}</div>
                    <div className="notif-text">
                      <div className="notif-title">{n.text}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MATCHES TAB */}
          {tab === "matches" && (
            <div>
              <div className="tabs">
                {["all", "live", "upcoming", "completed"].map((s) => (
                  <button key={s} className={`tab ${adminSection === s || (s === "all" && !["live", "upcoming", "completed"].includes(adminSection)) ? "" : ""}`}
                    style={{ textTransform: "capitalize" }}
                    onClick={() => setAdminSection(s)}>
                    {s} {s === "live" && liveMatches.length > 0 ? `(${liveMatches.length})` : ""}
                  </button>
                ))}
              </div>
              <div className="card-grid card-grid-2">
                {matches
                  .filter((m) => {
                    if (adminSection === "live") return m.status === "live";
                    if (adminSection === "upcoming") return m.status === "upcoming";
                    if (adminSection === "completed") return m.status === "completed";
                    return true;
                  })
                  .map((m, i) => (
                    <MatchCard key={`${m.id}-${i}`} match={m}
                      onStart={() => startMatch(m.id)}
                      onScore={() => openScoreModal(m)}
                      onComplete={() => completeMatch(m.id)}
                      onShare={() => shareWhatsApp(`🏸 Match Update\n${m.team1.name} ${m.score1 ?? "-"} vs ${m.score2 ?? "-"} ${m.team2.name}\n${m.court} | ${m.time}`)}
                      liveTimer={m.status === "live" ? liveTimer : 0}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* STANDINGS TAB */}
          {tab === "standings" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {[{ label: "Group A", data: standingsA }, { label: "Group B", data: standingsB }].map(({ label, data }) => (
                  <div key={label}>
                    <div className="section-title">{label}</div>
                    <div className="card">
                      <StandingsTable standings={data} showQualification />
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="section-title">🏆 MVP Leaderboard</div>
              <div className="card">
                <table className="standings-table">
                  <thead><tr>
                    <th>#</th><th>Team</th><th>PTS</th><th>PF</th><th>PA</th><th>PD</th><th>W</th><th>L</th>
                  </tr></thead>
                  <tbody>
                    {[...standingsA, ...standingsB].sort((a, b) => b.pts - a.pts || b.PD - a.PD).map((s, i) => (
                      <tr key={s.team.id}>
                        <td className={`rank-cell ${i === 0 ? "rank-1" : i === 1 ? "rank-2" : ""}`}>{i + 1}</td>
                        <td><div className="team-cell"><span className="team-emoji">{s.team.logo}</span><div><div className="team-cell-name">{s.team.name}</div><div className="team-cell-subs">{s.team.players.join(" & ")}</div></div></div></td>
                        <td className="pts-cell">{s.pts}</td>
                        <td className="stat-cell">{s.PF}</td>
                        <td className="stat-cell">{s.PA}</td>
                        <td className={`stat-cell ${s.PD > 0 ? "pd-pos" : s.PD < 0 ? "pd-neg" : ""}`}>{s.PD > 0 ? "+" : ""}{s.PD}</td>
                        <td className="stat-cell" style={{ color: "#00ff88" }}>{s.W}</td>
                        <td className="stat-cell" style={{ color: "#ef4444" }}>{s.L}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BRACKET TAB */}
          {tab === "bracket" && (
            <div>
              <div className="section-title">🏆 Tournament Bracket</div>
              <div className="bracket-container">
                {/* Group Stage */}
                <div className="bracket-col">
                  <div className="bracket-label">Group Stage</div>
                  {["A", "B"].map((g) => {
                    const st = g === "A" ? standingsA : standingsB;
                    return st.slice(0, 2).map((s, i) => (
                      <div key={s.team.id} className="bracket-match">
                        <div className={`bracket-team ${i === 0 ? "winner" : ""}`}>
                          <span>{s.team.logo} {s.team.name}</span>
                          <span className="bracket-score" style={{ color: i === 0 ? "#00ff88" : "#94a3b8" }}>{s.pts}pts</span>
                        </div>
                      </div>
                    ));
                  })}
                </div>
                {/* Semis */}
                <div className="bracket-col">
                  <div className="bracket-label">Semi Finals</div>
                  {semifinalMatches.length > 0 ? semifinalMatches.map((m) => (
                    <BracketMatch key={m.id} match={m} />
                  )) : (
                    <div style={{ padding: "24px", textAlign: "center", color: "#334155", fontSize: "13px" }}>
                      Complete group stage to unlock
                    </div>
                  )}
                </div>
                {/* Final */}
                <div className="bracket-col">
                  <div className="bracket-label">Final</div>
                  {finalMatch ? <BracketMatch match={finalMatch} /> : (
                    <div style={{ padding: "24px", textAlign: "center", color: "#334155", fontSize: "13px" }}>
                      Pending semi-finals
                    </div>
                  )}
                </div>
                {/* Winner */}
                <div className="bracket-col">
                  <div className="bracket-label">Champion</div>
                  {winner ? (
                    <div className="bracket-match" style={{ border: "1px solid rgba(234,179,8,0.4)", background: "rgba(234,179,8,0.05)" }}>
                      <div className="bracket-team winner" style={{ color: "#facc15", justifyContent: "center", gap: "10px" }}>
                        <span>🏆</span><span>{winner.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "24px", textAlign: "center", color: "#334155", fontSize: "13px" }}>
                      TBD
                    </div>
                  )}
                </div>
              </div>
              {/* Phase controls */}
              <div className="divider" />
              <div className="row">
                <span className="text-muted">Phase:</span>
                <span style={{ color: "#00ff88", fontFamily: "Orbitron, sans-serif", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>{tournamentPhase}</span>
                {tournamentPhase === "group" && (
                  <button className="btn btn-secondary btn-sm" onClick={generateSemifinals}>Generate Semis →</button>
                )}
                {tournamentPhase === "semifinal" && semifinalMatches.every(m => m.status === "completed") && (
                  <button className="btn btn-secondary btn-sm" onClick={generateFinal}>Generate Final →</button>
                )}
              </div>
            </div>
          )}

          {/* TEAMS TAB */}
          {tab === "teams" && (
            <div>
              <div className="flex justify-between items-center mb-16">
                <div className="section-title" style={{ margin: 0 }}>Teams ({teams.length})</div>
                <button className="btn btn-primary btn-sm" onClick={() => setAddTeamForm(true)}>
                  <Icon.plus /> Add Team
                </button>
              </div>
              {addTeamForm && (
                <div className="card mb-24">
                  <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "12px", color: "#00ff88", marginBottom: "16px", letterSpacing: "2px" }}>NEW TEAM</div>
                  <div className="input-group">
                    <label className="input-label">Team Name</label>
                    <input className="input" placeholder="e.g. Thunder Ravens" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="input-group">
                      <label className="input-label">Player 1</label>
                      <input className="input" placeholder="Name" value={newP1} onChange={(e) => setNewP1(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Player 2</label>
                      <input className="input" placeholder="Name" value={newP2} onChange={(e) => setNewP2(e.target.value)} />
                    </div>
                  </div>
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={addTeam}>Add Team</button>
                    <button className="btn btn-secondary" onClick={() => setAddTeamForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search teams or players..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
              </div>
              <div className="card-grid card-grid-2">
                {filteredTeams.map((t) => {
                  const inA = groups.A.some((g) => g.id === t.id);
                  const standing = (inA ? standingsA : standingsB).find((s) => s.team.id === t.id);
                  return (
                    <div key={t.id} className="team-card">
                      <div className="team-icon">{t.logo}</div>
                      <div className="team-info-block">
                        <div className="team-card-name">{t.name}</div>
                        <div className="team-card-players">{t.players.join(" & ")}</div>
                        <div className="team-card-badge mt-8">
                          <span className={`group-tag group-${inA ? "a" : "b"}`}>Group {inA ? "A" : "B"}</span>
                          {standing && <span style={{ fontSize: "12px", color: "#00ff88", marginLeft: "8px" }}>{standing.pts}pts • {standing.W}W-{standing.L}L</span>}
                        </div>
                      </div>
                      <button className="wa-btn" onClick={() => shareWhatsApp(`🏸 ${t.name}\n👥 ${t.players.join(" & ")}\nGroup ${inA ? "A" : "B"} | ShuttlePro`)}>
                        <span>📤</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADMIN TAB */}
          {tab === "admin" && (
            <div className="admin-grid">
              <div className="admin-sidebar">
                <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "10px", letterSpacing: "2px", color: "#334155", marginBottom: "12px" }}>ADMIN PANEL</div>
                {[
                  { id: "matches", label: "Match Control", icon: "🏸" },
                  { id: "teams", label: "Team Mgmt", icon: "👥" },
                  { id: "courts", label: "Courts", icon: "🏟️" },
                  { id: "notifs", label: "Notifications", icon: "🔔" },
                  { id: "phase", label: "Phase Control", icon: "⚡" },
                ].map((item) => (
                  <div key={item.id} className={`admin-menu-item ${adminSection === item.id ? "active" : ""}`} onClick={() => setAdminSection(item.id)}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
              <div className="admin-content">
                {adminSection === "matches" && (
                  <div>
                    <div className="section-title">Match Control</div>
                    {matches.filter(m => m.status !== "completed").map((m, i) => (
                      <div key={`${m.id}-${i}`} className="card mb-16" style={{ position: "relative" }}>
                        <div className="shuttle-trail">🏸</div>
                        <div className="flex justify-between items-center mb-8">
                          <span className={`group-tag group-${m.group === "A" ? "a" : "b"}`}>{m.group} • {m.stage}</span>
                          <span className={`status-badge status-${m.status === "live" ? "live" : "upcoming"}`}>{m.status.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-16 mb-16">
                          <div style={{ flex: 1, fontWeight: 700, fontSize: "15px" }}>{m.team1.logo} {m.team1.name}</div>
                          <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "18px", color: "#00ff88" }}>
                            {m.score1 ?? "-"} : {m.score2 ?? "-"}
                          </div>
                          <div style={{ flex: 1, fontWeight: 700, fontSize: "15px", textAlign: "right" }}>{m.team2.name} {m.team2.logo}</div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>{m.court} • {m.time}</div>
                        <div className="btn-row">
                          {m.status === "upcoming" && <button className="btn btn-secondary btn-sm" onClick={() => startMatch(m.id)}><Icon.play /> Start</button>}
                          {m.status === "live" && <button className="btn btn-orange btn-sm" onClick={() => openScoreModal(m)}>📝 Enter Score</button>}
                          {m.status === "live" && <button className="btn btn-danger btn-sm" onClick={() => completeMatch(m.id)}>✅ Complete</button>}
                          <button className="wa-btn" onClick={() => shareWhatsApp(`🏸 ${m.team1.name} vs ${m.team2.name}\n${m.court} | ${m.time}`)}>📱 Share</button>
                        </div>
                      </div>
                    ))}
                    {matches.filter(m => m.status !== "completed").length === 0 && (
                      <div className="card" style={{ textAlign: "center", color: "#475569", padding: "48px" }}>All matches complete! 🏆</div>
                    )}
                  </div>
                )}
                {adminSection === "courts" && (
                  <div>
                    <div className="section-title">Court Management</div>
                    {COURTS.map((c) => {
                      const cs = courtStatus.find((x) => x.court === c);
                      return (
                        <div key={c} className="card mb-16">
                          <div className="flex justify-between items-center">
                            <div>
                              <div style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>{c}</div>
                              {cs?.match && <div style={{ fontSize: "13px", color: "#64748b" }}>{cs.match.team1.name} vs {cs.match.team2.name}</div>}
                              {!cs?.match && <div style={{ fontSize: "13px", color: "#334155" }}>No match scheduled</div>}
                            </div>
                            <span className={`status-badge status-${cs?.status === "live" ? "live" : cs?.status === "upcoming" ? "upcoming" : "done"}`}>
                              {cs?.status === "live" ? "LIVE" : cs?.status === "upcoming" ? "NEXT" : "FREE"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {adminSection === "notifs" && (
                  <div>
                    <div className="section-title">Notification Center</div>
                    <div className="btn-row mb-24">
                      <button className="btn btn-secondary btn-sm" onClick={() => addNotif("🏸 Match starting in 10 minutes on Court A!", "⏰")}>Send Match Alert</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => addNotif("📢 Semi-finals draw is live!", "🏆")}>Semi-final Alert</button>
                      <button className="btn btn-orange btn-sm" onClick={() => addNotif("🔴 FINAL MATCH IS ABOUT TO BEGIN!", "🚨")}>Final Alert</button>
                    </div>
                    <div className="notif-list">
                      {notifications.map((n) => (
                        <div key={n.id} className="notif-item">
                          <div className="notif-icon" style={{ background: "rgba(0,255,136,0.06)" }}>{n.icon}</div>
                          <div className="notif-text">
                            <div className="notif-title">{n.text}</div>
                            <div className="notif-time">{n.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {adminSection === "phase" && (
                  <div>
                    <div className="section-title">Phase Control</div>
                    <div className="card mb-16">
                      <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>CURRENT PHASE</div>
                      <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "24px", color: "#00ff88", textTransform: "uppercase", marginBottom: "16px" }}>{tournamentPhase}</div>
                      <div className="btn-row">
                        <button className="btn btn-secondary" onClick={generateSemifinals} disabled={tournamentPhase !== "group"}>
                          → Generate Semi-Finals
                        </button>
                        <button className="btn btn-secondary" onClick={generateFinal}
                          disabled={tournamentPhase !== "semifinal" || !semifinalMatches.every(m => m.status === "completed")}>
                          → Generate Final
                        </button>
                      </div>
                    </div>
                    <div className="card">
                      <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "11px", color: "#475569", letterSpacing: "2px", marginBottom: "12px" }}>QUALIFICATION STATUS</div>
                      <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.8" }}>
                        <div>✅ Group A Topper: <span style={{ color: "#00ff88" }}>{standingsA[0]?.team.name ?? "TBD"}</span></div>
                        <div>✅ Group A Runner-Up: <span style={{ color: "#60a5fa" }}>{standingsA[1]?.team.name ?? "TBD"}</span></div>
                        <div>✅ Group B Topper: <span style={{ color: "#00ff88" }}>{standingsB[0]?.team.name ?? "TBD"}</span></div>
                        <div>✅ Group B Runner-Up: <span style={{ color: "#60a5fa" }}>{standingsB[1]?.team.name ?? "TBD"}</span></div>
                      </div>
                    </div>
                  </div>
                )}
                {adminSection === "teams" && (
                  <div>
                    <div className="flex justify-between items-center mb-16">
                      <div className="section-title" style={{ margin: 0 }}>Team Management</div>
                      <button className="btn btn-primary btn-sm" onClick={() => setAddTeamForm(true)}><Icon.plus /> Add</button>
                    </div>
                    {addTeamForm && (
                      <div className="card mb-16">
                        <div className="input-group"><label className="input-label">Team Name</label><input className="input" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div className="input-group"><label className="input-label">Player 1</label><input className="input" value={newP1} onChange={(e) => setNewP1(e.target.value)} placeholder="Player 1" /></div>
                          <div className="input-group"><label className="input-label">Player 2</label><input className="input" value={newP2} onChange={(e) => setNewP2(e.target.value)} placeholder="Player 2" /></div>
                        </div>
                        <div className="btn-row">
                          <button className="btn btn-primary btn-sm" onClick={addTeam}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setAddTeamForm(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {teams.map((t) => (
                      <div key={t.id} className="team-card mb-16">
                        <div className="team-icon">{t.logo}</div>
                        <div className="team-info-block">
                          <div className="team-card-name">{t.name}</div>
                          <div className="team-card-players">{t.players.join(" & ")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE NAV */}
        <div className="mobile-nav">
          {TABS.map((t) => (
            <button key={t.id} className={`mobile-nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* SCORE MODAL */}
        {scoreModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "90%", maxWidth: "440px", background: "rgba(17,17,24,0.98)", border: "1px solid rgba(0,255,136,0.2)" }}>
              <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "13px", color: "#00ff88", letterSpacing: "2px", marginBottom: "20px" }}>UPDATE SCORE</div>
              <div className="flex items-center gap-16 mb-24">
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, marginBottom: "10px" }}>{scoreModal.team1.logo} {scoreModal.team1.name}</div>
                  <input className="score-input" type="number" min="0" max="30" value={s1} onChange={(e) => setS1(e.target.value)} />
                </div>
                <div style={{ fontFamily: "Orbitron, sans-serif", color: "#334155", fontSize: "20px" }}>VS</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, marginBottom: "10px" }}>{scoreModal.team2.logo} {scoreModal.team2.name}</div>
                  <input className="score-input" type="number" min="0" max="30" value={s2} onChange={(e) => setS2(e.target.value)} />
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary flex-1" onClick={saveScore}>Update Score</button>
                <button className="btn btn-secondary" onClick={() => setScoreModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* WINNER CELEBRATION */}
        {winner && (
          <div className="winner-overlay" onClick={() => setWinner(null)}>
            <div className="winner-card" onClick={(e) => e.stopPropagation()}>
              <div className="confetti" />
              <div className="winner-trophy">🏆</div>
              <div className="winner-label">🏸 Tournament Champion</div>
              <div className="winner-name">{winner.name}</div>
              <div className="winner-sub">{winner.players?.join(" & ")}</div>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => shareWhatsApp(`🏆 CHAMPIONS!\n${winner.name} wins the GameNova Badminton Invitational 2026! 🏸🎉`)}>📱 Share Victory</button>
                <button className="btn btn-secondary" onClick={() => setWinner(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── MATCH CARD COMPONENT ─────────────────────────────────────────────────────
function MatchCard({ match: m, onStart, onScore, onComplete, onShare, liveTimer }) {
  const statusClass = m.status === "live" ? "live" : m.status === "completed" ? "completed" : "";
  const stageLabel = m.stage === "semifinal" ? "SF" : m.stage === "final" ? "FINAL" : `Group ${m.group}`;

  function fmt(s) { if (s === null) return "-"; return String(s); }

  return (
    <div className={`match-card ${statusClass}`}>
      {m.status === "live" && <div className="shuttle-trail">🏸</div>}
      <div className="match-meta">
        <span className="match-stage">{stageLabel}</span>
        <span className="match-court">{m.court}</span>
      </div>
      <div className="match-teams">
        <div className="team-info">
          <div className="team-name">{m.team1.logo} {m.team1.name}</div>
          <div className="team-players">{m.team1.players?.join(" & ")}</div>
        </div>
        <div className="score-block">
          {m.status === "live" && (
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#ff6b35", marginBottom: "4px" }}>
              {liveTimer > 0 ? `${String(Math.floor(liveTimer / 60)).padStart(2, "0")}:${String(liveTimer % 60).padStart(2, "0")}` : "LIVE"}
            </div>
          )}
          <div className="score-display">
            <span style={{ color: m.status === "completed" && (m.score1 ?? 0) > (m.score2 ?? 0) ? "#00ff88" : "#fff" }}>{fmt(m.score1)}</span>
            <span style={{ color: "#334155" }}> – </span>
            <span style={{ color: m.status === "completed" && (m.score2 ?? 0) > (m.score1 ?? 0) ? "#00ff88" : "#fff" }}>{fmt(m.score2)}</span>
          </div>
          {m.status !== "live" && <div className="vs-badge">VS</div>}
        </div>
        <div className="team-info" style={{ textAlign: "right" }}>
          <div className="team-name">{m.team2.name} {m.team2.logo}</div>
          <div className="team-players">{m.team2.players?.join(" & ")}</div>
        </div>
      </div>
      <div className="match-footer">
        <span className="match-time">🕐 {m.time}</span>
        <div className="row" style={{ gap: "8px" }}>
          {m.status === "upcoming" && onStart && <button className="btn btn-secondary btn-sm" onClick={onStart}><Icon.play /> Start</button>}
          {m.status === "live" && onScore && <button className="btn btn-orange btn-sm" onClick={onScore}>📝 Score</button>}
          {m.status === "live" && onComplete && <button className="btn btn-danger btn-sm" onClick={onComplete}>✅ End</button>}
          {onShare && <button className="wa-btn" onClick={onShare}><Icon.share /> WA</button>}
          {m.status === "completed" && <span className="status-badge status-done">DONE</span>}
          {m.status === "live" && <span className="status-badge status-live">LIVE</span>}
          {m.status === "upcoming" && m.stage === "semifinal" && <span className="status-badge status-semifinal">SF</span>}
          {m.status === "upcoming" && m.stage === "final" && <span className="status-badge status-final">FINAL</span>}
        </div>
      </div>
    </div>
  );
}

// ─── STANDINGS TABLE COMPONENT ────────────────────────────────────────────────
function StandingsTable({ standings, showQualification }) {
  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>PD</th><th>PTS</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.team.id}>
            <td><span className={`rank-cell ${i === 0 ? "rank-1" : i === 1 ? "rank-2" : ""}`}>{i + 1}</span></td>
            <td>
              <div className="team-cell">
                {showQualification && <span className="rank-q" style={{ background: i < 2 ? "#00ff88" : "#334155" }} />}
                <span className="team-emoji">{s.team.logo}</span>
                <div>
                  <div className="team-cell-name">{s.team.name}</div>
                  <div className="team-cell-subs">{s.team.players?.join(" & ")}</div>
                </div>
              </div>
            </td>
            <td className="stat-cell" style={{ color: "#00ff88" }}>{s.W}</td>
            <td className="stat-cell" style={{ color: "#ef4444" }}>{s.L}</td>
            <td className="stat-cell">{s.PF}</td>
            <td className="stat-cell">{s.PA}</td>
            <td className={`stat-cell ${s.PD > 0 ? "pd-pos" : s.PD < 0 ? "pd-neg" : ""}`}>{s.PD > 0 ? "+" : ""}{s.PD}</td>
            <td className="pts-cell">{s.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── BRACKET MATCH COMPONENT ──────────────────────────────────────────────────
function BracketMatch({ match: m }) {
  const w1 = m.status === "completed" && (m.score1 ?? 0) >= (m.score2 ?? 0);
  const w2 = m.status === "completed" && (m.score2 ?? 0) > (m.score1 ?? 0);
  return (
    <div className="bracket-match">
      <div className={`bracket-team ${w1 ? "winner" : m.team1 ? "" : "tbd"}`}>
        <span>{m.team1 ? `${m.team1.logo} ${m.team1.name}` : "TBD"}</span>
        {m.score1 !== null && <span className="bracket-score">{m.score1}</span>}
      </div>
      <div className={`bracket-team ${w2 ? "winner" : m.team2 ? "" : "tbd"}`}>
        <span>{m.team2 ? `${m.team2.logo} ${m.team2.name}` : "TBD"}</span>
        {m.score2 !== null && <span className="bracket-score">{m.score2}</span>}
      </div>
    </div>
  );
}
