"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface StudySession {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_type: "in_person" | "online" | "hybrid";
  meeting_link: string | null;
  topics: string[] | null;
  max_participants: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  rsvps?: SessionRSVP[];
  rsvp_counts?: {
    going: number;
    maybe: number;
    not_going: number;
  };
  user_rsvp?: SessionRSVP | null;
}

export interface SessionRSVP {
  id: string;
  session_id: string;
  user_id: string;
  status: "going" | "maybe" | "not_going";
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================
// STUDY SESSIONS CRUD
// ============================================

export async function getStudySessions(groupId: string): Promise<StudySession[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("group_id", groupId)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching study sessions:", error);
    return [];
  }

  // Get RSVPs and creator info for each session
  const sessionsWithDetails = await Promise.all(
    (sessions || []).map(async (session) => {
      // Get RSVPs
      const { data: rsvps } = await supabase
        .from("study_session_rsvps")
        .select("*")
        .eq("session_id", session.id);

      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", session.created_by)
        .single();

      // Calculate RSVP counts
      const rsvpCounts = {
        going: (rsvps || []).filter((r) => r.status === "going").length,
        maybe: (rsvps || []).filter((r) => r.status === "maybe").length,
        not_going: (rsvps || []).filter((r) => r.status === "not_going").length,
      };

      // Get current user's RSVP
      const userRsvp = user
        ? (rsvps || []).find((r) => r.user_id === user.id)
        : null;

      return {
        ...session,
        creator: creator || undefined,
        rsvp_counts: rsvpCounts,
        user_rsvp: userRsvp || null,
      };
    })
  );

  return sessionsWithDetails;
}

export async function getStudySession(sessionId: string): Promise<StudySession | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    console.error("Error fetching study session:", error);
    return null;
  }

  // Get RSVPs with user info
  const { data: rsvps } = await supabase
    .from("study_session_rsvps")
    .select("*")
    .eq("session_id", sessionId);

  // Get user info for each RSVP
  const rsvpsWithUsers = await Promise.all(
    (rsvps || []).map(async (rsvp) => {
      const { data: rsvpUser } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", rsvp.user_id)
        .single();

      return {
        ...rsvp,
        user: rsvpUser || undefined,
      };
    })
  );

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", session.created_by)
    .single();

  // Calculate RSVP counts
  const rsvpCounts = {
    going: rsvpsWithUsers.filter((r) => r.status === "going").length,
    maybe: rsvpsWithUsers.filter((r) => r.status === "maybe").length,
    not_going: rsvpsWithUsers.filter((r) => r.status === "not_going").length,
  };

  // Get current user's RSVP
  const userRsvp = user
    ? rsvpsWithUsers.find((r) => r.user_id === user.id)
    : null;

  return {
    ...session,
    creator: creator || undefined,
    rsvps: rsvpsWithUsers,
    rsvp_counts: rsvpCounts,
    user_rsvp: userRsvp || null,
  };
}

export async function createStudySession(
  groupId: string,
  data: {
    title: string;
    description?: string;
    subject?: string;
    session_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    location_type?: "in_person" | "online" | "hybrid";
    meeting_link?: string;
    topics?: string[];
    max_participants?: number;
  }
): Promise<{ success: boolean; session?: StudySession; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: session, error } = await supabase
    .from("study_sessions")
    .insert({
      group_id: groupId,
      title: data.title,
      description: data.description || null,
      subject: data.subject || null,
      session_date: data.session_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      location: data.location || null,
      location_type: data.location_type || "in_person",
      meeting_link: data.meeting_link || null,
      topics: data.topics || null,
      max_participants: data.max_participants || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating study session:", error);
    return { success: false, error: error.message };
  }

  // Auto-RSVP creator as "going"
  await supabase.from("study_session_rsvps").insert({
    session_id: session.id,
    user_id: user.id,
    status: "going",
  });

  revalidatePath(`/groups/${groupId}/study-sessions`);
  return { success: true, session };
}

export async function updateStudySession(
  sessionId: string,
  groupId: string,
  data: Partial<{
    title: string;
    description: string;
    subject: string;
    session_date: string;
    start_time: string;
    end_time: string;
    location: string;
    location_type: "in_person" | "online" | "hybrid";
    meeting_link: string;
    topics: string[];
    max_participants: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("study_sessions")
    .update(data)
    .eq("id", sessionId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating study session:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/study-sessions`);
  return { success: true };
}

export async function deleteStudySession(
  sessionId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting study session:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/study-sessions`);
  return { success: true };
}

// ============================================
// RSVP OPERATIONS
// ============================================

export async function updateRSVP(
  sessionId: string,
  groupId: string,
  status: "going" | "maybe" | "not_going"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Upsert the RSVP
  const { error } = await supabase
    .from("study_session_rsvps")
    .upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "session_id,user_id",
      }
    );

  if (error) {
    console.error("Error updating RSVP:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/study-sessions`);
  return { success: true };
}

export async function removeRSVP(
  sessionId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("study_session_rsvps")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing RSVP:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/study-sessions`);
  return { success: true };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function getUpcomingSessions(groupId: string, limit = 5): Promise<StudySession[]> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: sessions, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("group_id", groupId)
    .gte("session_date", today)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching upcoming sessions:", error);
    return [];
  }

  return sessions || [];
}
