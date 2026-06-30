"use client";

import { useState, useEffect, useCallback } from "react";
import {
  tournamentApi,
  courtApi,
  groupApi,
  teamApi,
  type Tournament,
  type Court,
  type Group,
  type Team,
} from "@/lib/supabase";

async function dashboardApi(type: "court" | "group" | "team", payload: any) {
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Dashboard API request failed.");
  }
  return data;
}

export function useDashboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const defaultTournament = await tournamentApi.getOrCreateDefault();
      setTournament(defaultTournament);

      const [courtRows, groupRows, teamRows] = await Promise.all([
        courtApi.list(defaultTournament.id),
        groupApi.list(defaultTournament.id),
        teamApi.list(defaultTournament.id),
      ]);

      setCourts(courtRows);
      setGroups(groupRows);
      setTeams(teamRows);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const createCourt = useCallback(async (name: string) => {
    const court = await dashboardApi("court", { name });
    setCourts((prev) => [...prev, court]);
    return court;
  }, []);

  const updateCourt = useCallback(async (id: string, payload: Partial<Court>) => {
    const court = await courtApi.update(id, payload);
    setCourts((prev) => prev.map((item) => (item.id === id ? court : item)));
    return court;
  }, []);

  const deleteCourt = useCallback(async (id: string) => {
    await courtApi.remove(id);
    setCourts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const createGroup = useCallback(async (name: string) => {
    const group = await dashboardApi("group", { name });
    setGroups((prev) => [...prev, { ...group, teams: [] }]);
    return group;
  }, []);

  const updateGroup = useCallback(async (id: string, payload: Partial<Group>) => {
    const group = await groupApi.update(id, payload);
    setGroups((prev) => prev.map((item) => (item.id === id ? { ...item, ...group } : item)));
    return group;
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await groupApi.remove(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const createTeam = useCallback(async (groupId: string, name: string, playerNames: string[]) => {
    const team = await dashboardApi("team", { groupId, name, playerNames });

    setTeams((prev) => [...prev.filter((item) => item.id !== team.id), team]
      .sort((a, b) => a.name.localeCompare(b.name)));

    if (tournament?.id) {
      const [updatedGroups, refreshedTeams] = await Promise.all([
        groupApi.list(tournament.id),
        teamApi.list(tournament.id),
      ]);
      setGroups(updatedGroups);
      setTeams(refreshedTeams);
    }
    return team;
  }, [tournament?.id]);

  const updateTeam = useCallback(async (id: string, name: string, playerNames: string[]) => {
    const team = await teamApi.update(id, { name }, playerNames);
    const [updatedGroups, refreshedTeams] = await Promise.all([
      groupApi.list(tournament?.id ?? ""),
      teamApi.list(tournament?.id ?? ""),
    ]);

    setGroups(updatedGroups);
    setTeams(refreshedTeams);
    return team;
  }, [tournament?.id]);

  const deleteTeam = useCallback(async (id: string) => {
    await teamApi.remove(id);
    const [updatedGroups, refreshedTeams] = await Promise.all([
      groupApi.list(tournament?.id ?? ""),
      teamApi.list(tournament?.id ?? ""),
    ]);

    setGroups(updatedGroups);
    setTeams(refreshedTeams);
  }, [tournament?.id]);

  const groupsByName = groups.reduce<Record<string, Team[]>>((acc, group) => {
    acc[group.name] = group.teams ?? [];
    return acc;
  }, {});

  return {
    tournament,
    courts,
    groups,
    groupsByName,
    teams,
    loading,
    error,
    refresh,
    createCourt,
    updateCourt,
    deleteCourt,
    createGroup,
    updateGroup,
    deleteGroup,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}
