"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { redirect } from "next/navigation";
import { GroupType, featuresByType } from "./group-features";

export async function createGroup(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const groupType = formData.get("groupType") as GroupType;
  const customFeatures = formData.get("customFeatures") as string;

  if (!name || name.trim() === "") {
    return { error: "Group name is required" };
  }

  // Determine enabled features
  let enabledFeatures: string[];

  if (groupType === "custom" && customFeatures) {
    enabledFeatures = JSON.parse(customFeatures);
    if (enabledFeatures.length === 0) {
      return { error: "Please select at least one feature" };
    }
  } else {
    enabledFeatures = featuresByType[groupType];
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      group_type: groupType,
      enabled_features: enabledFeatures,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating group:", error);
    return { error: error.message };
  }

  redirect(`/groups/${group.id}`);
}

export async function getGroup(groupId: string) {
  const supabase = await createServerSupabaseClient();

  // First get the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    console.error("Error fetching group:", groupError);
    return null;
  }

  // Then get active members separately
  // Use !left to force LEFT JOIN - otherwise members without a users record are excluded
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select(`
      id,
      user_id,
      role,
      joined_at,
      user:users!left (
        id,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .is("left_at", null);

  if (membersError) {
    console.error("Error fetching members:", membersError);
  }

  // Map members, providing fallback for users not in public.users
  const processedMembers = (members || []).map(
    (member: { user_id: string; user?: { id?: string; full_name?: string; display_name?: string; avatar_url?: string } | null; id: string; role: string; joined_at: string }) => ({
      ...member,
      user: member.user?.id ? member.user : {
        id: member.user_id,
        full_name: "New Member",
        display_name: "New Member",
        avatar_url: null
      }
    })
  );

  return {
    ...group,
    group_members: processedMembers
  };
}

// Get group with member contact info (only shared contacts)
export async function getGroupWithContacts(groupId: string) {
  const supabase = await createServerSupabaseClient();

  // First get the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return null;
  }

  // DEBUG: Get ALL members first (including those with left_at set)
  const { data: allMembers, error: allMembersError } = await supabase
    .from("group_members")
    .select("id, user_id, role, joined_at, left_at")
    .eq("group_id", groupId);

  console.log("DEBUG: All members in group (no left_at filter):", JSON.stringify(allMembers, null, 2));
  if (allMembersError) {
    console.error("DEBUG: Error fetching all members:", allMembersError);
  }

  // Then get active members with contact info
  // Use !left to force LEFT JOIN - otherwise members without a users record are excluded
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select(`
      id,
      user_id,
      role,
      joined_at,
      left_at,
      user:users!left (
        id,
        full_name,
        display_name,
        avatar_url,
        phone_number,
        show_phone,
        whatsapp_number,
        show_whatsapp,
        whatsapp_same_as_phone,
        email,
        show_email,
        instagram_handle,
        show_instagram,
        snapchat_handle,
        show_snapchat
      )
    `)
    .eq("group_id", groupId)
    .is("left_at", null);

  console.log("DEBUG: Active members (with left_at IS NULL filter):", JSON.stringify(members, null, 2));

  if (membersError) {
    console.error("Error fetching members:", membersError);
  }

  // Process members - filter contact info based on preferences
  // Include members even if they don't have a user record yet
  interface MemberUser {
    id: string;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    phone_number?: string | null;
    show_phone?: boolean;
    whatsapp_number?: string | null;
    show_whatsapp?: boolean;
    whatsapp_same_as_phone?: boolean;
    email?: string | null;
    show_email?: boolean;
    instagram_handle?: string | null;
    show_instagram?: boolean;
    snapchat_handle?: string | null;
    show_snapchat?: boolean;
  }

  // Log for debugging
  console.log("Raw members from DB:", JSON.stringify(members, null, 2));

  const processedMembers = (members || []).map((member: {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    user: MemberUser | null;
  }) => {
    // Check if user data exists and has a valid id
    const hasValidUser = member.user && typeof member.user === 'object' && member.user.id;

    if (!hasValidUser) {
      // User not in public.users yet - return basic info
      console.log("Member without user data:", member.user_id);
      return {
        ...member,
        user: {
          id: member.user_id,
          full_name: "New Member",
          display_name: "New Member",
          avatar_url: null,
          phone_number: null,
          whatsapp_number: null,
          email: null,
          instagram_handle: null,
          snapchat_handle: null,
        }
      };
    }

    // User exists - filter contact info based on preferences
    return {
      ...member,
      user: {
        id: member.user.id,
        full_name: member.user.full_name || "Unknown",
        display_name: member.user.display_name || member.user.full_name || "Unknown",
        avatar_url: member.user.avatar_url,
        phone_number: member.user.show_phone ? member.user.phone_number : null,
        whatsapp_number: member.user.show_whatsapp
          ? (member.user.whatsapp_same_as_phone ? member.user.phone_number : member.user.whatsapp_number)
          : null,
        email: member.user.show_email ? member.user.email : null,
        instagram_handle: member.user.show_instagram ? member.user.instagram_handle : null,
        snapchat_handle: member.user.show_snapchat ? member.user.snapchat_handle : null,
      },
    };
  });

  console.log("Processed members:", processedMembers.length);

  return {
    ...group,
    group_members: processedMembers
  };
}

export async function getUserGroups() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: groups, error } = await supabase
    .from("groups")
    .select(`
      *,
      group_members!inner (
        user_id,
        role
      )
    `)
    .eq("group_members.user_id", user.id)
    .is("group_members.left_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching groups:", error);
    return [];
  }

  // Filter out any null or invalid groups
  return (groups || []).filter(g => g && g.id && g.name);
}

export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is owner
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (!membership || membership.role !== "owner") {
    return { error: "Only the group owner can update settings" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const groupType = formData.get("groupType") as GroupType;
  const features = formData.get("features") as string;

  if (!name || name.trim() === "") {
    return { error: "Group name is required" };
  }

  const enabledFeatures = features ? JSON.parse(features) : [];

  if (enabledFeatures.length === 0) {
    return { error: "Please select at least one feature" };
  }

  const { error } = await supabase
    .from("groups")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      group_type: groupType,
      enabled_features: enabledFeatures,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  if (error) {
    console.error("Error updating group:", error);
    return { error: error.message };
  }

  redirect(`/groups/${groupId}`);
}
