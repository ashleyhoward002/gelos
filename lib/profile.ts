"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const fullName = formData.get("fullName") as string;
  const displayName = formData.get("displayName") as string;
  const birthday = formData.get("birthday") as string;
  const shareBirthday = formData.get("shareBirthday") === "true";

  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName?.trim() || null,
      display_name: displayName?.trim() || null,
      birthday: birthday || null,
      share_birthday: shareBirthday,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function updateContactInfo(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const phoneNumber = formData.get("phoneNumber") as string;
  const showPhone = formData.get("showPhone") === "true";
  const whatsappNumber = formData.get("whatsappNumber") as string;
  const showWhatsapp = formData.get("showWhatsapp") === "true";
  const whatsappSameAsPhone = formData.get("whatsappSameAsPhone") === "true";
  const showEmail = formData.get("showEmail") === "true";
  const instagramHandle = formData.get("instagramHandle") as string;
  const showInstagram = formData.get("showInstagram") === "true";
  const snapchatHandle = formData.get("snapchatHandle") as string;
  const showSnapchat = formData.get("showSnapchat") === "true";

  const { error } = await supabase
    .from("users")
    .update({
      phone_number: phoneNumber?.trim() || null,
      show_phone: showPhone,
      whatsapp_number: whatsappNumber?.trim() || null,
      show_whatsapp: showWhatsapp,
      whatsapp_same_as_phone: whatsappSameAsPhone,
      show_email: showEmail,
      instagram_handle: instagramHandle?.trim()?.replace(/^@/, '') || null,
      show_instagram: showInstagram,
      snapchat_handle: snapchatHandle?.trim()?.replace(/^@/, '') || null,
      show_snapchat: showSnapchat,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating contact info:", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function getProfile() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function getFamilyMembers() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return members || [];
}

export async function addFamilyMember(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const relationship = formData.get("relationship") as string;
  const birthday = formData.get("birthday") as string;

  if (!name || !relationship || !birthday) {
    return { error: "All fields are required" };
  }

  const { error } = await supabase.from("family_members").insert({
    user_id: user.id,
    name: name.trim(),
    relationship: relationship.trim(),
    birthday,
  });

  if (error) {
    console.error("Error adding family member:", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function deleteFamilyMember(memberId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting family member:", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}
