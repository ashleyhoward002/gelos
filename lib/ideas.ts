"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export type IdeaCategory = "food" | "activities" | "outdoors" | "events" | "nightlife" | "arts" | "shopping";
export type IdeaStatus = "idea" | "planned" | "completed";

export interface Idea {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: IdeaCategory;
  source_url: string | null;
  image_url: string | null;
  suggested_by: string;
  vote_count: number;
  status: IdeaStatus;
  outing_id: string | null;
  created_at: string;
  suggester?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  has_voted?: boolean;
  outing?: {
    id: string;
    title: string;
    event_date: string | null;
  } | null;
}

// categoryLabels moved to lib/idea-constants.ts (cannot export objects from "use server" files)

export async function getIdeas(
  groupId: string,
  options?: {
    category?: IdeaCategory | "all";
    status?: IdeaStatus | "all";
    search?: string;
    sortBy?: "votes" | "newest" | "category";
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("outing_ideas")
    .select("*")
    .eq("group_id", groupId);

  // Apply filters
  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,description.ilike.%${options.search}%,location.ilike.%${options.search}%`
    );
  }

  // Apply sorting
  if (options?.sortBy === "votes") {
    query = query.order("vote_count", { ascending: false });
  } else if (options?.sortBy === "category") {
    query = query.order("category", { ascending: true }).order("vote_count", { ascending: false });
  } else {
    // Default to newest
    query = query.order("created_at", { ascending: false });
  }

  const { data: ideas, error } = await query;

  if (error) {
    console.error("Error fetching ideas:", error);
    return [];
  }

  // Get user's votes for these ideas
  let userVotes: string[] = [];
  if (user) {
    const { data: votes } = await supabase
      .from("outing_idea_votes")
      .select("idea_id")
      .eq("user_id", user.id)
      .in(
        "idea_id",
        (ideas || []).map((i) => i.id)
      );
    userVotes = (votes || []).map((v) => v.idea_id);
  }

  // Get suggester info and outing info for each idea
  const ideasWithDetails = await Promise.all(
    (ideas || []).map(async (idea) => {
      // Get suggester info
      const { data: suggester } = await supabase
        .from("users")
        .select("id, display_name, full_name")
        .eq("id", idea.suggested_by)
        .single();

      // Get outing info if linked
      let outing = null;
      if (idea.outing_id) {
        const { data: outingData } = await supabase
          .from("outings")
          .select("id, title, event_date")
          .eq("id", idea.outing_id)
          .single();
        outing = outingData;
      }

      return {
        ...idea,
        suggester,
        outing,
        has_voted: userVotes.includes(idea.id),
      };
    })
  );

  return ideasWithDetails as Idea[];
}

export async function getIdea(ideaId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: idea, error } = await supabase
    .from("outing_ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (error || !idea) {
    console.error("Error fetching idea:", error);
    return null;
  }

  // Check if user has voted
  let hasVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from("outing_idea_votes")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("user_id", user.id)
      .single();
    hasVoted = !!vote;
  }

  // Get suggester info
  const { data: suggester } = await supabase
    .from("users")
    .select("id, display_name, full_name")
    .eq("id", idea.suggested_by)
    .single();

  // Get outing info if linked
  let outing = null;
  if (idea.outing_id) {
    const { data: outingData } = await supabase
      .from("outings")
      .select("id, title, event_date")
      .eq("id", idea.outing_id)
      .single();
    outing = outingData;
  }

  return {
    ...idea,
    suggester,
    outing,
    has_voted: hasVoted,
  } as Idea;
}

export async function createIdea(
  groupId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    category: IdeaCategory;
    source_url?: string;
    image_url?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!data.title.trim()) {
    return { error: "Title is required" };
  }

  const { data: idea, error } = await supabase
    .from("outing_ideas")
    .insert({
      group_id: groupId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      category: data.category,
      source_url: data.source_url?.trim() || null,
      image_url: data.image_url?.trim() || null,
      suggested_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating idea:", error);
    return { error: error.message };
  }

  // Auto-upvote your own idea
  await supabase.from("outing_idea_votes").insert({
    idea_id: idea.id,
    user_id: user.id,
  });

  // Create notifications for group members
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
      type: "idea_added",
      title: "New Idea",
      message: `${creatorName} added an idea: "${data.title}"`,
      link: `/groups/${groupId}/ideas`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/ideas`);
  return { success: true, idea };
}

export async function updateIdea(
  ideaId: string,
  groupId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    category?: IdeaCategory;
    source_url?: string;
    image_url?: string;
    status?: IdeaStatus;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim() || null;
  if (data.location !== undefined) updateData.location = data.location.trim() || null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.source_url !== undefined) updateData.source_url = data.source_url.trim() || null;
  if (data.image_url !== undefined) updateData.image_url = data.image_url.trim() || null;
  if (data.status !== undefined) updateData.status = data.status;

  const { error } = await supabase
    .from("outing_ideas")
    .update(updateData)
    .eq("id", ideaId)
    .eq("suggested_by", user.id);

  if (error) {
    console.error("Error updating idea:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/ideas`);
  return { success: true };
}

export async function deleteIdea(ideaId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("outing_ideas")
    .delete()
    .eq("id", ideaId)
    .eq("suggested_by", user.id);

  if (error) {
    console.error("Error deleting idea:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/ideas`);
  return { success: true };
}

export async function voteIdea(ideaId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already voted
  const { data: existingVote } = await supabase
    .from("outing_idea_votes")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (existingVote) {
    // Remove vote
    const { error } = await supabase
      .from("outing_idea_votes")
      .delete()
      .eq("id", existingVote.id);

    if (error) {
      console.error("Error removing vote:", error);
      return { error: error.message };
    }

    revalidatePath(`/groups/${groupId}/ideas`);
    return { success: true, voted: false };
  } else {
    // Add vote
    const { error } = await supabase.from("outing_idea_votes").insert({
      idea_id: ideaId,
      user_id: user.id,
    });

    if (error) {
      console.error("Error adding vote:", error);
      return { error: error.message };
    }

    revalidatePath(`/groups/${groupId}/ideas`);
    return { success: true, voted: true };
  }
}

export async function planIdea(
  ideaId: string,
  groupId: string,
  outingData: {
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the idea
  const { data: idea } = await supabase
    .from("outing_ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Create the outing
  const { data: outing, error: outingError } = await supabase
    .from("outings")
    .insert({
      group_id: groupId,
      title: outingData.title.trim(),
      description: outingData.description?.trim() || null,
      location: outingData.location?.trim() || idea.location || null,
      event_date: outingData.event_date || null,
      status: "upcoming",
      created_by: user.id,
    })
    .select()
    .single();

  if (outingError) {
    console.error("Error creating outing:", outingError);
    return { error: outingError.message };
  }

  // Link idea to outing and update status
  const { error: updateError } = await supabase
    .from("outing_ideas")
    .update({
      status: "planned",
      outing_id: outing.id,
    })
    .eq("id", ideaId);

  if (updateError) {
    console.error("Error updating idea:", updateError);
  }

  // Create notifications for group members
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

    const plannerName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: "idea_planned",
      title: "Idea Being Planned!",
      message: `${plannerName} is planning "${idea.title}"!`,
      link: `/groups/${groupId}/outings/${outing.id}`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/ideas`);
  revalidatePath(`/groups/${groupId}/outings`);
  return { success: true, outing };
}

export async function markIdeaCompleted(ideaId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("outing_ideas")
    .update({ status: "completed" })
    .eq("id", ideaId);

  if (error) {
    console.error("Error marking idea as completed:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/ideas`);
  return { success: true };
}
