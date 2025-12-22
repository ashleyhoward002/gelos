"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { ActivityCategory, ActivityStatus, ParticipantStatus } from "./activity-constants";

// Re-export types
export type { ActivityCategory, ActivityStatus, ParticipantStatus };

export interface ActivityParticipant {
  id: string;
  activity_id: string;
  user_id: string;
  status: ParticipantStatus;
  paid: boolean;
  paid_amount: number | null;
  notes: string | null;
  responded_at: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripActivity {
  id: string;
  outing_id: string;
  name: string;
  description: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  map_link: string | null;
  category: ActivityCategory;
  cost_per_person: number | null;
  total_cost: number | null;
  currency: string;
  min_people: number | null;
  max_people: number | null;
  is_group_activity: boolean;
  status: ActivityStatus;
  booking_url: string | null;
  confirmation_number: string | null;
  booked_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: ActivityParticipant[];
  participant_counts?: {
    going: number;
    maybe: number;
    not_going: number;
    interested: number;
  };
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  booker?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

// ============ GET ACTIVITIES ============

export async function getActivities(tripId: string): Promise<TripActivity[]> {
  const supabase = await createServerSupabaseClient();

  const { data: activities, error } = await supabase
    .from("trip_activities")
    .select("*")
    .eq("outing_id", tripId)
    .order("activity_date", { ascending: true, nullsFirst: false })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }

  // Fetch participants for each activity
  const activitiesWithDetails = await Promise.all(
    (activities || []).map(async (activity) => {
      // Get participants
      const { data: participants } = await supabase
        .from("trip_activity_participants")
        .select("*")
        .eq("activity_id", activity.id);

      const participantsWithUsers = await Promise.all(
        (participants || []).map(async (p) => {
          const { data: user } = await supabase
            .from("users")
            .select("id, display_name, full_name, avatar_url")
            .eq("id", p.user_id)
            .single();
          return { ...p, user };
        })
      );

      // Calculate counts
      const counts = {
        going: participantsWithUsers.filter((p) => p.status === "going").length,
        maybe: participantsWithUsers.filter((p) => p.status === "maybe").length,
        not_going: participantsWithUsers.filter((p) => p.status === "not_going").length,
        interested: participantsWithUsers.filter((p) => p.status === "interested").length,
      };

      // Get creator
      let creator = null;
      if (activity.created_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", activity.created_by)
          .single();
        creator = data;
      }

      // Get booker
      let booker = null;
      if (activity.booked_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", activity.booked_by)
          .single();
        booker = data;
      }

      return {
        ...activity,
        participants: participantsWithUsers,
        participant_counts: counts,
        creator,
        booker,
      } as TripActivity;
    })
  );

  return activitiesWithDetails;
}

// ============ GET SINGLE ACTIVITY ============

export async function getActivity(activityId: string): Promise<TripActivity | null> {
  const supabase = await createServerSupabaseClient();

  const { data: activity, error } = await supabase
    .from("trip_activities")
    .select("*")
    .eq("id", activityId)
    .single();

  if (error || !activity) {
    console.error("Error fetching activity:", error);
    return null;
  }

  // Get participants with user details
  const { data: participants } = await supabase
    .from("trip_activity_participants")
    .select("*")
    .eq("activity_id", activityId);

  const participantsWithUsers = await Promise.all(
    (participants || []).map(async (p) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", p.user_id)
        .single();
      return { ...p, user };
    })
  );

  // Calculate counts
  const counts = {
    going: participantsWithUsers.filter((p) => p.status === "going").length,
    maybe: participantsWithUsers.filter((p) => p.status === "maybe").length,
    not_going: participantsWithUsers.filter((p) => p.status === "not_going").length,
    interested: participantsWithUsers.filter((p) => p.status === "interested").length,
  };

  // Get creator
  let creator = null;
  if (activity.created_by) {
    const { data } = await supabase
      .from("users")
      .select("id, display_name, full_name")
      .eq("id", activity.created_by)
      .single();
    creator = data;
  }

  // Get booker
  let booker = null;
  if (activity.booked_by) {
    const { data } = await supabase
      .from("users")
      .select("id, display_name, full_name")
      .eq("id", activity.booked_by)
      .single();
    booker = data;
  }

  return {
    ...activity,
    participants: participantsWithUsers,
    participant_counts: counts,
    creator,
    booker,
  } as TripActivity;
}

// ============ CREATE ACTIVITY ============

export async function createActivity(
  tripId: string,
  groupId: string,
  data: {
    name: string;
    description?: string;
    activity_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    map_link?: string;
    category?: ActivityCategory;
    cost_per_person?: number;
    total_cost?: number;
    currency?: string;
    min_people?: number;
    max_people?: number;
    is_group_activity?: boolean;
    status?: ActivityStatus;
    booking_url?: string;
    confirmation_number?: string;
    notes?: string;
  }
): Promise<{ success?: boolean; activity?: TripActivity; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: activity, error } = await supabase
    .from("trip_activities")
    .insert({
      outing_id: tripId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      activity_date: data.activity_date || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      location: data.location?.trim() || null,
      map_link: data.map_link?.trim() || null,
      category: data.category || "other",
      cost_per_person: data.cost_per_person || null,
      total_cost: data.total_cost || null,
      currency: data.currency || "USD",
      min_people: data.min_people || null,
      max_people: data.max_people || null,
      is_group_activity: data.is_group_activity || false,
      status: data.status || "idea",
      booking_url: data.booking_url?.trim() || null,
      confirmation_number: data.confirmation_number?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating activity:", error);
    return { error: error.message };
  }

  // Send notifications to group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .is("left_at", null)
    .neq("user_id", user.id);

  if (members && members.length > 0) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const creatorName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: "activity_created",
      title: "New Activity",
      message: `${creatorName} suggested "${data.name}" - RSVP now!`,
      link: `/groups/${groupId}/outings/${tripId}?tab=activities`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, activity: activity as TripActivity };
}

// ============ UPDATE ACTIVITY ============

export async function updateActivity(
  activityId: string,
  groupId: string,
  tripId: string,
  data: {
    name?: string;
    description?: string;
    activity_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    map_link?: string | null;
    category?: ActivityCategory;
    cost_per_person?: number | null;
    total_cost?: number | null;
    currency?: string;
    min_people?: number | null;
    max_people?: number | null;
    is_group_activity?: boolean;
    status?: ActivityStatus;
    booking_url?: string | null;
    confirmation_number?: string | null;
    notes?: string | null;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current activity to check for status change
  const { data: currentActivity } = await supabase
    .from("trip_activities")
    .select("status, name")
    .eq("id", activityId)
    .single();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.activity_date !== undefined) updateData.activity_date = data.activity_date;
  if (data.start_time !== undefined) updateData.start_time = data.start_time;
  if (data.end_time !== undefined) updateData.end_time = data.end_time;
  if (data.location !== undefined) updateData.location = data.location?.trim() || null;
  if (data.map_link !== undefined) updateData.map_link = data.map_link?.trim() || null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.cost_per_person !== undefined) updateData.cost_per_person = data.cost_per_person;
  if (data.total_cost !== undefined) updateData.total_cost = data.total_cost;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.min_people !== undefined) updateData.min_people = data.min_people;
  if (data.max_people !== undefined) updateData.max_people = data.max_people;
  if (data.is_group_activity !== undefined) updateData.is_group_activity = data.is_group_activity;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.booking_url !== undefined) updateData.booking_url = data.booking_url?.trim() || null;
  if (data.confirmation_number !== undefined) updateData.confirmation_number = data.confirmation_number?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  // If status changed to booked/confirmed, set booked_by
  if (data.status && (data.status === "booked" || data.status === "confirmed")) {
    updateData.booked_by = user.id;
  }

  const { error } = await supabase
    .from("trip_activities")
    .update(updateData)
    .eq("id", activityId);

  if (error) {
    console.error("Error updating activity:", error);
    return { error: error.message };
  }

  // Notify if status changed to booked or confirmed
  if (data.status && currentActivity && data.status !== currentActivity.status) {
    if (data.status === "booked" || data.status === "confirmed") {
      // Get all going participants
      const { data: participants } = await supabase
        .from("trip_activity_participants")
        .select("user_id")
        .eq("activity_id", activityId)
        .eq("status", "going")
        .neq("user_id", user.id);

      if (participants && participants.length > 0) {
        const statusLabel = data.status === "booked" ? "booked" : "confirmed";
        const notifications = participants.map((p: { user_id: string }) => ({
          user_id: p.user_id,
          type: "activity_status_changed",
          title: `Activity ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
          message: `"${currentActivity.name}" has been ${statusLabel}!`,
          link: `/groups/${groupId}/outings/${tripId}?tab=activities`,
          group_id: groupId,
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ DELETE ACTIVITY ============

export async function deleteActivity(
  activityId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_activities")
    .delete()
    .eq("id", activityId);

  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ RESPOND TO ACTIVITY (RSVP) ============

export async function respondToActivity(
  activityId: string,
  groupId: string,
  tripId: string,
  status: ParticipantStatus,
  notes?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already has a response
  const { data: existing } = await supabase
    .from("trip_activity_participants")
    .select("id, status")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .single();

  const previousStatus = existing?.status;

  if (existing) {
    const { error } = await supabase
      .from("trip_activity_participants")
      .update({
        status,
        notes: notes?.trim() || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating RSVP:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_activity_participants")
      .insert({
        activity_id: activityId,
        user_id: user.id,
        status,
        notes: notes?.trim() || null,
        responded_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error creating RSVP:", error);
      return { error: error.message };
    }
  }

  // Get activity details for notification
  const { data: activity } = await supabase
    .from("trip_activities")
    .select("name, created_by, min_people")
    .eq("id", activityId)
    .single();

  if (activity) {
    // Notify activity creator of RSVP (only if not the creator)
    if (activity.created_by !== user.id && status === "going") {
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.display_name || profile?.full_name || "Someone";

      await supabase.from("notifications").insert({
        user_id: activity.created_by,
        type: "activity_rsvp",
        title: "New RSVP",
        message: `${userName} is going to "${activity.name}"!`,
        link: `/groups/${groupId}/outings/${tripId}?tab=activities`,
        group_id: groupId,
      });
    }

    // Check if min_people is now met (only if this was a new "going" response)
    if (status === "going" && previousStatus !== "going" && activity.min_people) {
      const { data: goingParticipants } = await supabase
        .from("trip_activity_participants")
        .select("id")
        .eq("activity_id", activityId)
        .eq("status", "going");

      const goingCount = goingParticipants?.length || 0;

      // If we just reached min_people, notify everyone
      if (goingCount === activity.min_people) {
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .is("left_at", null);

        if (members) {
          const notifications = members.map((m: { user_id: string }) => ({
            user_id: m.user_id,
            type: "activity_min_reached",
            title: "Enough People!",
            message: `"${activity.name}" has enough people to book! 🎉`,
            link: `/groups/${groupId}/outings/${tripId}?tab=activities`,
            group_id: groupId,
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ REMOVE RSVP ============

export async function removeRsvp(
  activityId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_activity_participants")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing RSVP:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ UPDATE PAYMENT STATUS ============

export async function updatePaymentStatus(
  activityId: string,
  participantUserId: string,
  groupId: string,
  tripId: string,
  hasPaid: boolean,
  paidAmount?: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_activity_participants")
    .update({
      paid: hasPaid,
      paid_amount: paidAmount || null,
      updated_at: new Date().toISOString(),
    })
    .eq("activity_id", activityId)
    .eq("user_id", participantUserId);

  if (error) {
    console.error("Error updating payment status:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ GET USER'S RSVP STATUS ============

export async function getUserRsvpStatus(
  activityId: string
): Promise<ParticipantStatus | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("trip_activity_participants")
    .select("status")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .single();

  return (data?.status as ParticipantStatus) || null;
}
