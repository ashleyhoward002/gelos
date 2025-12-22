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

  const { data: group, error } = await supabase
    .from("groups")
    .select(`
      *,
      group_members (
        id,
        role,
        joined_at,
        user:users (
          id,
          full_name,
          display_name,
          avatar_url
        )
      )
    `)
    .eq("id", groupId)
    .single();

  if (error) {
    return null;
  }

  return group;
}

// Get group with member contact info (only shared contacts)
export async function getGroupWithContacts(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: group, error } = await supabase
    .from("groups")
    .select(`
      *,
      group_members (
        id,
        role,
        joined_at,
        user:users (
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
      )
    `)
    .eq("id", groupId)
    .single();

  if (error) {
    return null;
  }

  // Filter contact info based on user preferences
  if (group?.group_members) {
    group.group_members = group.group_members.map((member: {
      id: string;
      role: string;
      joined_at: string;
      user: {
        id: string;
        full_name: string;
        display_name: string;
        avatar_url: string;
        phone_number: string;
        show_phone: boolean;
        whatsapp_number: string;
        show_whatsapp: boolean;
        whatsapp_same_as_phone: boolean;
        email: string;
        show_email: boolean;
        instagram_handle: string;
        show_instagram: boolean;
        snapchat_handle: string;
        show_snapchat: boolean;
      };
    }) => ({
      ...member,
      user: {
        id: member.user.id,
        full_name: member.user.full_name,
        display_name: member.user.display_name,
        avatar_url: member.user.avatar_url,
        // Only include contact info if user chose to share it
        phone_number: member.user.show_phone ? member.user.phone_number : null,
        whatsapp_number: member.user.show_whatsapp
          ? (member.user.whatsapp_same_as_phone ? member.user.phone_number : member.user.whatsapp_number)
          : null,
        email: member.user.show_email ? member.user.email : null,
        instagram_handle: member.user.show_instagram ? member.user.instagram_handle : null,
        snapchat_handle: member.user.show_snapchat ? member.user.snapchat_handle : null,
      },
    }));
  }

  return group;
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

  return groups;
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
