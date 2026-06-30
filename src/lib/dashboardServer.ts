import { serverSupabase } from "./serverSupabase";
import type { Court, Group, Team, Tournament } from "@/lib/supabase";

const DEFAULT_TOURNAMENT_NAME = "ShuttlePro Dashboard";

export async function getOrCreateDefaultTournament(): Promise<Tournament> {
  const { data, error } = await serverSupabase
    .from("tournaments")
    .select("*")
    .eq("name", DEFAULT_TOURNAMENT_NAME)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await serverSupabase
    .from("tournaments")
    .insert({
      name: DEFAULT_TOURNAMENT_NAME,
      description: "Default ShuttlePro dashboard tournament",
      type: "doubles",
      status: "draft",
      max_teams: 64,
      group_count: 0,
      courts_count: 0,
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

export async function createCourt(name: string): Promise<Court> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Court name is required.");
  }

  const tournament = await getOrCreateDefaultTournament();
  // Check for duplicate court names
  const { data: existingCourts, error: checkError } = await serverSupabase
    .from("courts")
    .select("name")
    .eq("tournament_id", tournament.id)
    .eq("is_active", true);
  if (checkError) throw checkError;
  if (existingCourts?.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`A court named "${trimmed}" already exists in this tournament.`);
  }

  const { data: existingCourt } = await serverSupabase
    .from("courts")
    .select("display_order")
    .eq("tournament_id", tournament.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = existingCourt?.display_order ? existingCourt.display_order + 1 : 1;

  const { data, error } = await serverSupabase
    .from("courts")
    .insert({ tournament_id: tournament.id, name: trimmed, display_order: nextOrder })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCourt(id: string): Promise<void> {
  const { error } = await serverSupabase.from("courts").delete().eq("id", id);
  if (error) throw error;
}

export async function createGroup(name: string): Promise<Group> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Group name is required.");
  }

  const tournament = await getOrCreateDefaultTournament();
  const { count, error: courtError } = await serverSupabase
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id);

  if (courtError) throw courtError;
  if (!count || count === 0) {
    throw new Error("Create a court before adding a group.");
  }

  const { data: tournamentGroups, error: groupsError } = await serverSupabase
    .from("groups")
    .select("name")
    .eq("tournament_id", tournament.id);
  if (groupsError) throw groupsError;
  if (tournamentGroups?.some((group) => group.name.trim().toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`A group named "${trimmed}" already exists in this tournament.`);
  }

  const { data: existingGroup } = await serverSupabase
    .from("groups")
    .select("display_order")
    .eq("tournament_id", tournament.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = existingGroup?.display_order ? existingGroup.display_order + 1 : 1;

  const { data, error } = await serverSupabase
    .from("groups")
    .insert({ tournament_id: tournament.id, name: trimmed, display_order: nextOrder })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await serverSupabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

export async function createTeam(groupId: string, name: string, playerNames: string[]): Promise<Team> {
  const trimmedName = name.trim();
  const players = playerNames.map((player) => player.trim()).filter(Boolean);

  if (!trimmedName) {
    throw new Error("Team name is required.");
  }

  if (!groupId) {
    throw new Error("A group must be selected before creating a team.");
  }

  if (players.length === 0) {
    throw new Error("Add at least one player for the team.");
  }

  const { data: group, error: groupError } = await serverSupabase
    .from("groups")
    .select("id, tournament_id")
    .eq("id", groupId)
    .single();
  if (groupError) throw groupError;
  if (!group) {
    throw new Error("Selected group not found.");
  }

  const { data: tournamentTeams, error: existingTeamError } = await serverSupabase
    .from("teams")
    .select("name")
    .eq("tournament_id", group.tournament_id)
    .eq("is_active", true);
  if (existingTeamError) {
    throw existingTeamError;
  }
  if (tournamentTeams?.some((team) => team.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error(`A team named "${trimmedName}" already exists in this tournament.`);
  }

  const { data: team, error: teamError } = await serverSupabase
    .from("teams")
    .insert({ tournament_id: group.tournament_id, name: trimmedName, logo_emoji: "🏸", color: "#00ff88" })
    .select()
    .single();

  if (teamError) {
    throw teamError;
  }

  const playerRows = players.map((full_name, index) => ({
    team_id: team.id,
    tournament_id: group.tournament_id,
    full_name,
    is_captain: index === 0,
  }));

  if (playerRows.length > 0) {
    const { error: playersError } = await serverSupabase.from("players").insert(playerRows);
    if (playersError) throw playersError;
  }

  const { error: assignmentError } = await serverSupabase.from("group_teams").insert({ group_id: groupId, team_id: team.id });
  if (assignmentError) throw assignmentError;

  const { data: fullTeam, error: fetchError } = await serverSupabase
    .from("teams")
    .select(`*, players(*)`)
    .eq("id", team.id)
    .single();
  if (fetchError) throw fetchError;

  return fullTeam;
}

export async function updateTeam(id: string, name: string, playerNames: string[]): Promise<Team> {
  const trimmedName = name.trim();
  const players = playerNames.map((player) => player.trim()).filter(Boolean);

  if (!trimmedName) {
    throw new Error("Team name is required.");
  }

  const { data: existingTeam, error: teamError } = await serverSupabase
    .from("teams")
    .select("*, tournament_id")
    .eq("id", id)
    .single();
  if (teamError) throw teamError;
  if (!existingTeam) {
    throw new Error("Team not found.");
  }

  const { data: tournamentTeams, error: duplicateError } = await serverSupabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", existingTeam.tournament_id)
    .eq("is_active", true)
    .neq("id", id);
  if (duplicateError) {
    throw duplicateError;
  }
  if (tournamentTeams?.some((team) => team.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error(`A team named "${trimmedName}" already exists in this tournament.`);
  }

  const { error: updateError } = await serverSupabase
    .from("teams")
    .update({ name: trimmedName })
    .eq("id", id);
  if (updateError) throw updateError;

  const { error: deleteError } = await serverSupabase.from("players").delete().eq("team_id", id);
  if (deleteError) throw deleteError;

  const playerRows = players.map((full_name, index) => ({
    team_id: id,
    tournament_id: existingTeam.tournament_id,
    full_name,
    is_captain: index === 0,
  }));

  if (playerRows.length > 0) {
    const { error: playersError } = await serverSupabase.from("players").insert(playerRows);
    if (playersError) throw playersError;
  }

  const { data: fullTeam, error: fetchError } = await serverSupabase
    .from("teams")
    .select(`*, players(*)`)
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  return fullTeam;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await serverSupabase.from("teams").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}
