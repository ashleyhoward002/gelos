"use server";

import { createServerSupabaseClient } from "./supabase-server";

// ============================================
// TYPES
// ============================================

export interface GroupInvite {
  id: string;
  group_id: string;
  invite_code: string;
  invite_link: string | null;
  invited_email: string | null;
  invited_by: string;
  role: "owner" | "admin" | "member";
  uses_remaining: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  inviter?: {
    id: string;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  group?: {
    id: string;
    name: string;
    description: string | null;
    group_type: string;
  };
  use_count?: number;
}

export interface InviteUse {
  id: string;
  invite_id: string;
  user_id: string;
  joined_at: string;
  user?: {
    id: string;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateInviteOptions {
  role?: "admin" | "member";
  usesRemaining?: number | null;
  expiresIn?: "never" | "7days" | "30days" | "custom";
  customExpiryDate?: string;
  invitedEmail?: string;
}

// ============================================
// HELPER: Generate invite code
// ============================================

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// CREATE INVITE
// ============================================

export async function createInvite(
  groupId: string,
  options: CreateInviteOptions = {}
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is admin/owner of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "You don't have permission to create invites" };
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  // Check for uniqueness
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from("group_invites")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: "Failed to generate unique invite code" };
  }

  // Calculate expiry date
  let expiresAt: string | null = null;
  if (options.expiresIn === "7days") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.expiresIn === "30days") {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.expiresIn === "custom" && options.customExpiryDate) {
    expiresAt = new Date(options.customExpiryDate).toISOString();
  }

  // Create invite link (relative for flexibility)
  const inviteLink = `/invite/${inviteCode}`;

  const { data: invite, error } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      invite_code: inviteCode,
      invite_link: inviteLink,
      invited_email: options.invitedEmail || null,
      invited_by: user.id,
      role: options.role || "member",
      uses_remaining: options.usesRemaining ?? null,
      expires_at: expiresAt,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invite:", error);
    return { error: error.message };
  }

  return { invite };
}

// ============================================
// GET GROUP INVITES
// ============================================

export async function getGroupInvites(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: invites, error } = await supabase
    .from("group_invites")
    .select(`
      *,
      inviter:users!group_invites_invited_by_fkey (
        id,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invites:", error);
    return [];
  }

  // Get use counts for each invite
  const inviteIds = invites.map((i) => i.id);
  const { data: useCounts } = await supabase
    .from("group_invite_uses")
    .select("invite_id")
    .in("invite_id", inviteIds);

  const useCountMap: Record<string, number> = {};
  useCounts?.forEach((use) => {
    useCountMap[use.invite_id] = (useCountMap[use.invite_id] || 0) + 1;
  });

  return invites.map((invite) => ({
    ...invite,
    use_count: useCountMap[invite.id] || 0,
  })) as GroupInvite[];
}

// ============================================
// GET INVITE BY CODE
// ============================================

export async function getInviteByCode(code: string) {
  const supabase = await createServerSupabaseClient();

  const { data: invite, error } = await supabase
    .from("group_invites")
    .select(`
      *,
      inviter:users!group_invites_invited_by_fkey (
        id,
        full_name,
        display_name,
        avatar_url
      ),
      group:groups (
        id,
        name,
        description,
        group_type
      )
    `)
    .eq("invite_code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !invite) {
    return null;
  }

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return null;
  }

  // Check if uses exhausted
  if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
    return null;
  }

  // Get member count for the group
  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", invite.group_id)
    .is("left_at", null);

  return {
    ...invite,
    member_count: count || 0,
  } as GroupInvite & { member_count: number };
}

// ============================================
// ACCEPT INVITE (JOIN GROUP)
// ============================================

export async function acceptInvite(code: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", requiresAuth: true };
  }

  // Get the invite
  const invite = await getInviteByCode(code);

  if (!invite) {
    return { error: "This invite is no longer valid" };
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id, left_at")
    .eq("group_id", invite.group_id)
    .eq("user_id", user.id)
    .single();

  if (existingMembership && !existingMembership.left_at) {
    return { error: "You're already a member of this group", alreadyMember: true, groupId: invite.group_id };
  }

  // If they were a member before and left, rejoin
  if (existingMembership && existingMembership.left_at) {
    const { error: rejoinError } = await supabase
      .from("group_members")
      .update({
        left_at: null,
        role: invite.role,
        joined_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.id);

    if (rejoinError) {
      return { error: "Failed to rejoin group" };
    }
  } else {
    // Add as new member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: invite.group_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return { error: "Failed to join group" };
    }
  }

  // Record the invite use
  await supabase.from("group_invite_uses").insert({
    invite_id: invite.id,
    user_id: user.id,
  });

  // Create notification for the inviter
  await supabase.from("notifications").insert({
    user_id: invite.invited_by,
    type: "member_joined",
    title: "Someone joined your group!",
    message: `A new member joined via your invite link`,
    link: `/groups/${invite.group_id}`,
    group_id: invite.group_id,
  });

  // Notify all group members about the new member
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", invite.group_id)
    .is("left_at", null)
    .neq("user_id", user.id);

  if (members) {
    const notifications = members.map((member) => ({
      user_id: member.user_id,
      type: "member_joined",
      title: "New member joined!",
      message: `Someone new joined the group`,
      link: `/groups/${invite.group_id}`,
      group_id: invite.group_id,
    }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  return { success: true, groupId: invite.group_id };
}

// ============================================
// CHECK USER MEMBERSHIP
// ============================================

export async function checkMembership(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isMember: false, isAuthenticated: false };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("id, role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  return {
    isMember: !!membership,
    isAuthenticated: true,
    role: membership?.role || null,
  };
}

// ============================================
// DEACTIVATE INVITE
// ============================================

export async function deactivateInvite(inviteId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("group_invites")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// REACTIVATE INVITE
// ============================================

export async function reactivateInvite(inviteId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("group_invites")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// DELETE INVITE
// ============================================

export async function deleteInvite(inviteId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("group_invites")
    .delete()
    .eq("id", inviteId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// GET INVITE USES
// ============================================

export async function getInviteUses(inviteId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: uses, error } = await supabase
    .from("group_invite_uses")
    .select(`
      *,
      user:users (
        id,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("invite_id", inviteId)
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Error fetching invite uses:", error);
    return [];
  }

  return uses as InviteUse[];
}

// ============================================
// GET OR CREATE DEFAULT INVITE
// ============================================

export async function getOrCreateDefaultInvite(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check for existing active invite with unlimited uses that doesn't expire
  const { data: existingInvite } = await supabase
    .from("group_invites")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .is("uses_remaining", null)
    .is("expires_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingInvite) {
    return { invite: existingInvite as GroupInvite };
  }

  // Create a new default invite
  return createInvite(groupId, {
    role: "member",
    usesRemaining: null,
    expiresIn: "never",
  });
}
