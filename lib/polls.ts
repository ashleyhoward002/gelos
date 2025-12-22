"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export type PollType = "multiple_choice" | "ranking" | "date_picker" | "lottery";

export interface PollSettings {
  allow_member_options?: boolean; // Allow any group member to add options (default true)
  multi_select?: boolean;
  max_selections?: number;
  anonymous?: boolean;
  show_results?: boolean;
}

export interface Poll {
  id: string;
  group_id: string;
  outing_id: string | null;
  title: string;
  description: string | null;
  poll_type: PollType;
  settings: PollSettings;
  closes_at: string | null;
  is_closed: boolean;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  };
  options?: PollOption[];
  vote_count?: number;
  has_voted?: boolean;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  option_date: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  suggester?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  votes?: PollVote[];
  vote_count?: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  rank: number | null;
  availability: "available" | "maybe" | "unavailable" | null;
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface LotteryResult {
  id: string;
  poll_id: string;
  winner_option_id: string;
  suggested_by: string | null;
  drawn_at: string;
  suggester?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  winning_option?: PollOption;
}

export async function getPolls(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    return [];
  }

  // Get creator info and vote counts for each poll
  const pollsWithDetails = await Promise.all(
    (polls || []).map(async (poll) => {
      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name")
        .eq("id", poll.created_by)
        .single();

      // Get unique voter count
      const { data: votes } = await supabase
        .from("poll_votes")
        .select("user_id")
        .eq("poll_id", poll.id);

      const uniqueVoters = new Set(votes?.map((v) => v.user_id) || []);

      // Check if current user has voted
      const hasVoted = user ? uniqueVoters.has(user.id) : false;

      return {
        ...poll,
        creator,
        vote_count: uniqueVoters.size,
        has_voted: hasVoted,
      };
    })
  );

  return pollsWithDetails as Poll[];
}

export async function getPoll(pollId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: poll, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .single();

  if (error) {
    console.error("Error fetching poll:", error);
    return null;
  }

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name")
    .eq("id", poll.created_by)
    .single();

  // Get options with votes
  const { data: options } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: true });

  // Get all votes for this poll
  const { data: allVotes } = await supabase
    .from("poll_votes")
    .select("*")
    .eq("poll_id", pollId);

  // Get user info for each vote (unless anonymous)
  const isAnonymous = poll.settings?.anonymous;
  const votesWithUsers = await Promise.all(
    (allVotes || []).map(async (vote) => {
      if (isAnonymous) {
        return { ...vote, user: null };
      }
      const { data: voteUser } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", vote.user_id)
        .single();
      return { ...vote, user: voteUser };
    })
  );

  // Attach votes and suggester to options
  const optionsWithVotes = await Promise.all(
    (options || []).map(async (option) => {
      const optionVotes = votesWithUsers.filter((v) => v.option_id === option.id);

      // Get suggester info
      let suggester = null;
      if (option.created_by) {
        const { data: suggesterData } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", option.created_by)
          .single();
        suggester = suggesterData;
      }

      return {
        ...option,
        suggester,
        votes: optionVotes,
        vote_count: optionVotes.length,
      };
    })
  );

  // Check if current user has voted
  const hasVoted = user
    ? (allVotes || []).some((v) => v.user_id === user.id)
    : false;

  // Get unique voter count
  const uniqueVoters = new Set((allVotes || []).map((v) => v.user_id));

  return {
    ...poll,
    creator,
    options: optionsWithVotes,
    vote_count: uniqueVoters.size,
    has_voted: hasVoted,
  } as Poll;
}

export async function createPoll(
  groupId: string,
  data: {
    title: string;
    description?: string;
    poll_type: PollType;
    settings?: PollSettings;
    closes_at?: string;
    options: { text: string; date?: string }[];
    outing_id?: string;
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

  if (data.options.length < 2) {
    return { error: "At least 2 options are required" };
  }

  // Merge settings with default allow_member_options = true
  const settings = {
    allow_member_options: true,
    ...data.settings,
  };

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      group_id: groupId,
      outing_id: data.outing_id || null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      poll_type: data.poll_type,
      settings,
      closes_at: data.closes_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (pollError) {
    console.error("Error creating poll:", pollError);
    return { error: pollError.message };
  }

  // Create options with created_by
  const optionsToInsert = data.options.map((opt, index) => ({
    poll_id: poll.id,
    option_text: opt.text.trim(),
    option_date: opt.date || null,
    sort_order: index,
    created_by: user.id,
  }));

  const { error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert);

  if (optionsError) {
    console.error("Error creating poll options:", optionsError);
    // Clean up the poll if options failed
    await supabase.from("polls").delete().eq("id", poll.id);
    return { error: optionsError.message };
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

    const creatorName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: "poll_created",
      title: "New Poll",
      message: `${creatorName} created "${data.title}"`,
      link: `/groups/${groupId}/polls/${poll.id}`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/polls`);
  return { success: true, poll };
}

export async function votePoll(
  pollId: string,
  groupId: string,
  votes: { option_id: string; rank?: number; availability?: string }[]
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get poll to check if it's closed
  const { data: poll } = await supabase
    .from("polls")
    .select("is_closed, poll_type, settings")
    .eq("id", pollId)
    .single();

  if (!poll) {
    return { error: "Poll not found" };
  }

  if (poll.is_closed) {
    return { error: "This poll is closed" };
  }

  // Delete existing votes for this user on this poll
  await supabase
    .from("poll_votes")
    .delete()
    .eq("poll_id", pollId)
    .eq("user_id", user.id);

  // Insert new votes
  const votesToInsert = votes.map((v) => ({
    poll_id: pollId,
    option_id: v.option_id,
    user_id: user.id,
    rank: v.rank || null,
    availability: v.availability || null,
  }));

  const { error } = await supabase.from("poll_votes").insert(votesToInsert);

  if (error) {
    console.error("Error voting:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/polls/${pollId}`);
  revalidatePath(`/groups/${groupId}/polls`);
  return { success: true };
}

export async function closePoll(pollId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("polls")
    .update({ is_closed: true })
    .eq("id", pollId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error closing poll:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/polls/${pollId}`);
  revalidatePath(`/groups/${groupId}/polls`);
  return { success: true };
}

export async function deletePoll(pollId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting poll:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/polls`);
  return { success: true };
}

export async function addPollOption(
  pollId: string,
  groupId: string,
  data: { text: string; date?: string }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get poll to check settings
  const { data: poll } = await supabase
    .from("polls")
    .select("is_closed, settings, created_by")
    .eq("id", pollId)
    .single();

  if (!poll) {
    return { error: "Poll not found" };
  }

  if (poll.is_closed) {
    return { error: "This poll is closed" };
  }

  // Check if member options are allowed (or if user is the creator)
  const allowMemberOptions = poll.settings?.allow_member_options !== false;
  if (!allowMemberOptions && poll.created_by !== user.id) {
    return { error: "Adding options is not allowed for this poll" };
  }

  if (!data.text.trim()) {
    return { error: "Option text is required" };
  }

  // Get the current max sort_order
  const { data: existingOptions } = await supabase
    .from("poll_options")
    .select("sort_order")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = (existingOptions?.[0]?.sort_order ?? -1) + 1;

  // Insert the new option
  const { data: option, error } = await supabase
    .from("poll_options")
    .insert({
      poll_id: pollId,
      option_text: data.text.trim(),
      option_date: data.date || null,
      sort_order: nextSortOrder,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding poll option:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/polls/${pollId}`);
  return { success: true, option };
}

export async function drawLottery(pollId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get poll to verify ownership and type
  const { data: poll } = await supabase
    .from("polls")
    .select("created_by, poll_type, title")
    .eq("id", pollId)
    .single();

  if (!poll) {
    return { error: "Poll not found" };
  }

  if (poll.created_by !== user.id) {
    return { error: "Only the poll creator can draw the lottery" };
  }

  if (poll.poll_type !== "lottery") {
    return { error: "This is not a lottery poll" };
  }

  // Check if lottery already drawn
  const { data: existingResult } = await supabase
    .from("lottery_results")
    .select("id")
    .eq("poll_id", pollId)
    .single();

  if (existingResult) {
    return { error: "Lottery has already been drawn" };
  }

  // Get all options for this poll (lottery draws from submitted options)
  const { data: options } = await supabase
    .from("poll_options")
    .select("id, option_text, created_by")
    .eq("poll_id", pollId);

  if (!options || options.length === 0) {
    return { error: "No options in this lottery" };
  }

  // Randomly select a winning option
  const winnerIndex = Math.floor(Math.random() * options.length);
  const winningOption = options[winnerIndex];

  // Record the result
  const { data: result, error: resultError } = await supabase
    .from("lottery_results")
    .insert({
      poll_id: pollId,
      winner_option_id: winningOption.id,
      suggested_by: winningOption.created_by,
    })
    .select()
    .single();

  if (resultError) {
    console.error("Error recording lottery result:", resultError);
    return { error: resultError.message };
  }

  // Close the poll
  await supabase.from("polls").update({ is_closed: true }).eq("id", pollId);

  // Notify the person who suggested the winning option (if any)
  if (winningOption.created_by && winningOption.created_by !== user.id) {
    await supabase.from("notifications").insert({
      user_id: winningOption.created_by,
      type: "lottery_winner",
      title: "Your Suggestion Won!",
      message: `Your suggestion "${winningOption.option_text}" won the lottery "${poll.title}"!`,
      link: `/groups/${groupId}/polls/${pollId}`,
      group_id: groupId,
    });
  }

  // Notify all group members about the result
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .is("left_at", null)
    .neq("user_id", user.id);

  if (members && members.length > 0) {
    const notifications = members
      .filter((m: { user_id: string }) => m.user_id !== winningOption.created_by)
      .map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: "lottery_drawn",
        title: "Lottery Drawn",
        message: `"${winningOption.option_text}" was selected in "${poll.title}"`,
        link: `/groups/${groupId}/polls/${pollId}`,
        group_id: groupId,
      }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  revalidatePath(`/groups/${groupId}/polls/${pollId}`);
  revalidatePath(`/groups/${groupId}/polls`);
  return { success: true, result };
}

export async function getLotteryResult(pollId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: result, error } = await supabase
    .from("lottery_results")
    .select("*")
    .eq("poll_id", pollId)
    .single();

  if (error || !result) {
    return null;
  }

  // Get suggester info (person who suggested the winning option)
  let suggester = null;
  if (result.suggested_by) {
    const { data: suggesterData } = await supabase
      .from("users")
      .select("id, display_name, full_name")
      .eq("id", result.suggested_by)
      .single();
    suggester = suggesterData;
  }

  // Get winning option
  const { data: option } = await supabase
    .from("poll_options")
    .select("*")
    .eq("id", result.winner_option_id)
    .single();

  return {
    ...result,
    suggester,
    winning_option: option,
  } as LotteryResult;
}
