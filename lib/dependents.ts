"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { DependentType, AgeGroup } from "./dependent-constants";

// Re-export types
export type { DependentType, AgeGroup };

export interface TripDependent {
  id: string;
  trip_id: string;
  name: string;
  type: DependentType;
  age_group: AgeGroup;
  age: number | null;
  responsible_member: string;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  responsible_user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface FamilyUnitData {
  member: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  dependents: TripDependent[];
  totalPeople: number;
}

// ============ GET DEPENDENTS ============

export async function getDependents(tripId: string): Promise<TripDependent[]> {
  const supabase = await createServerSupabaseClient();

  const { data: dependents, error } = await supabase
    .from("trip_dependents")
    .select("*")
    .eq("trip_id", tripId)
    .order("responsible_member")
    .order("type")
    .order("name");

  if (error) {
    console.error("Error fetching dependents:", error);
    return [];
  }

  // Fetch responsible user details
  const dependentsWithUsers = await Promise.all(
    (dependents || []).map(async (dep) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", dep.responsible_member)
        .single();

      return {
        ...dep,
        responsible_user: user,
      } as TripDependent;
    })
  );

  return dependentsWithUsers;
}

// ============ GET FAMILY UNITS ============

export async function getFamilyUnits(tripId: string, groupId: string): Promise<FamilyUnitData[]> {
  const supabase = await createServerSupabaseClient();

  // Get group members
  const { data: members } = await supabase
    .from("group_members")
    .select(`
      user:users (
        id,
        display_name,
        full_name,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .is("left_at", null);

  if (!members) return [];

  // Get all dependents for this trip
  const dependents = await getDependents(tripId);

  // Build family units
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const familyUnits: FamilyUnitData[] = members.map((m: any) => {
    const memberDependents = dependents.filter(
      (d) => d.responsible_member === m.user?.id
    );

    return {
      member: m.user,
      dependents: memberDependents,
      totalPeople: 1 + memberDependents.length,
    };
  });

  // Sort by total people (descending), then by name
  return familyUnits.sort((a, b) => {
    if (b.totalPeople !== a.totalPeople) {
      return b.totalPeople - a.totalPeople;
    }
    const nameA = a.member?.display_name || a.member?.full_name || "";
    const nameB = b.member?.display_name || b.member?.full_name || "";
    return nameA.localeCompare(nameB);
  });
}

// ============ GET TOTAL PEOPLE COUNT ============

export async function getTotalPeopleCount(tripId: string, groupId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  // Count members
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .is("left_at", null);

  // Count dependents
  const { count: dependentCount } = await supabase
    .from("trip_dependents")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  return (memberCount || 0) + (dependentCount || 0);
}

// ============ ADD DEPENDENT ============

export async function addDependent(
  tripId: string,
  groupId: string,
  data: {
    name: string;
    type: DependentType;
    age_group: AgeGroup;
    age?: number | null;
    responsible_member: string;
    notes?: string;
  }
): Promise<{ success?: boolean; dependent?: TripDependent; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: dependent, error } = await supabase
    .from("trip_dependents")
    .insert({
      trip_id: tripId,
      name: data.name.trim(),
      type: data.type,
      age_group: data.age_group,
      age: data.age || null,
      responsible_member: data.responsible_member,
      notes: data.notes?.trim() || null,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding dependent:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, dependent: dependent as TripDependent };
}

// ============ ADD MULTIPLE DEPENDENTS (Quick Add) ============

export async function addMultipleDependents(
  tripId: string,
  groupId: string,
  dependents: {
    name: string;
    type: DependentType;
    age_group: AgeGroup;
    age?: number | null;
  }[]
): Promise<{ success?: boolean; added: number; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", added: 0 };
  }

  const toInsert = dependents.map((d) => ({
    trip_id: tripId,
    name: d.name.trim(),
    type: d.type,
    age_group: d.age_group,
    age: d.age || null,
    responsible_member: user.id,
    added_by: user.id,
  }));

  const { error } = await supabase
    .from("trip_dependents")
    .insert(toInsert);

  if (error) {
    console.error("Error adding dependents:", error);
    return { error: error.message, added: 0 };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, added: dependents.length };
}

// ============ UPDATE DEPENDENT ============

export async function updateDependent(
  dependentId: string,
  groupId: string,
  tripId: string,
  data: {
    name?: string;
    type?: DependentType;
    age_group?: AgeGroup;
    age?: number | null;
    responsible_member?: string;
    notes?: string | null;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.age_group !== undefined) updateData.age_group = data.age_group;
  if (data.age !== undefined) updateData.age = data.age;
  if (data.responsible_member !== undefined) updateData.responsible_member = data.responsible_member;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  const { error } = await supabase
    .from("trip_dependents")
    .update(updateData)
    .eq("id", dependentId);

  if (error) {
    console.error("Error updating dependent:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ DELETE DEPENDENT ============

export async function deleteDependent(
  dependentId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_dependents")
    .delete()
    .eq("id", dependentId);

  if (error) {
    console.error("Error deleting dependent:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ REASSIGN DEPENDENT ============

export async function reassignDependent(
  dependentId: string,
  newResponsibleMember: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  return updateDependent(dependentId, groupId, tripId, {
    responsible_member: newResponsibleMember,
  });
}

// ============ GET MY DEPENDENTS ============

export async function getMyDependents(tripId: string): Promise<TripDependent[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: dependents, error } = await supabase
    .from("trip_dependents")
    .select("*")
    .eq("trip_id", tripId)
    .eq("responsible_member", user.id)
    .order("type")
    .order("name");

  if (error) {
    console.error("Error fetching my dependents:", error);
    return [];
  }

  return dependents as TripDependent[];
}

// ============ COPY DEPENDENTS FROM ANOTHER TRIP ============

export async function copyDependentsFromTrip(
  sourceTripId: string,
  targetTripId: string,
  groupId: string
): Promise<{ success?: boolean; copied: number; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", copied: 0 };
  }

  // Get dependents from source trip (only user's dependents)
  const { data: sourceDependents } = await supabase
    .from("trip_dependents")
    .select("*")
    .eq("trip_id", sourceTripId)
    .eq("responsible_member", user.id);

  if (!sourceDependents || sourceDependents.length === 0) {
    return { success: true, copied: 0 };
  }

  // Check for existing dependents in target trip
  const { data: existingDependents } = await supabase
    .from("trip_dependents")
    .select("name")
    .eq("trip_id", targetTripId)
    .eq("responsible_member", user.id);

  const existingNames = new Set(
    (existingDependents || []).map((d) => d.name.toLowerCase())
  );

  // Filter out duplicates
  const newDependents = sourceDependents.filter(
    (d) => !existingNames.has(d.name.toLowerCase())
  );

  if (newDependents.length === 0) {
    return { success: true, copied: 0 };
  }

  // Insert new dependents
  const toInsert = newDependents.map((d) => ({
    trip_id: targetTripId,
    name: d.name,
    type: d.type,
    age_group: d.age_group,
    age: d.age,
    responsible_member: user.id,
    notes: d.notes,
    added_by: user.id,
  }));

  const { error } = await supabase
    .from("trip_dependents")
    .insert(toInsert);

  if (error) {
    console.error("Error copying dependents:", error);
    return { error: error.message, copied: 0 };
  }

  revalidatePath(`/groups/${groupId}/outings/${targetTripId}`);
  return { success: true, copied: newDependents.length };
}

// ============ GET PREVIOUS TRIPS WITH DEPENDENTS ============

export async function getPreviousTripsWithDependents(
  groupId: string,
  excludeTripId?: string
): Promise<{ id: string; title: string; dependentCount: number }[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get trips in this group
  const { data: trips } = await supabase
    .from("outings")
    .select("id, title")
    .eq("group_id", groupId)
    .eq("outing_type", "trip")
    .neq("id", excludeTripId || "")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!trips) return [];

  // Get dependent counts for each trip
  const tripsWithCounts = await Promise.all(
    trips.map(async (trip) => {
      const { count } = await supabase
        .from("trip_dependents")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", trip.id)
        .eq("responsible_member", user.id);

      return {
        id: trip.id,
        title: trip.title,
        dependentCount: count || 0,
      };
    })
  );

  // Only return trips that have dependents
  return tripsWithCounts.filter((t) => t.dependentCount > 0);
}
