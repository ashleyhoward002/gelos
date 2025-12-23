"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface SharedNote {
  id: string;
  group_id: string;
  title: string;
  content: string | null;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================
// SHARED NOTES CRUD
// ============================================

export async function getSharedNotes(groupId: string): Promise<SharedNote[]> {
  const supabase = await createServerSupabaseClient();

  const { data: notes, error } = await supabase
    .from("shared_notes")
    .select("*")
    .eq("group_id", groupId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching shared notes:", error);
    return [];
  }

  // Get creator info for each note
  const notesWithCreators = await Promise.all(
    (notes || []).map(async (note) => {
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", note.created_by)
        .single();

      return {
        ...note,
        creator: creator || undefined,
      };
    })
  );

  return notesWithCreators;
}

export async function getSharedNote(noteId: string): Promise<SharedNote | null> {
  const supabase = await createServerSupabaseClient();

  const { data: note, error } = await supabase
    .from("shared_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error || !note) {
    console.error("Error fetching shared note:", error);
    return null;
  }

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", note.created_by)
    .single();

  return {
    ...note,
    creator: creator || undefined,
  };
}

export async function createSharedNote(
  groupId: string,
  data: {
    title: string;
    content?: string;
  }
): Promise<{ success: boolean; note?: SharedNote; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: note, error } = await supabase
    .from("shared_notes")
    .insert({
      group_id: groupId,
      title: data.title,
      content: data.content || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shared note:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/notes`);
  return { success: true, note };
}

export async function updateSharedNote(
  noteId: string,
  groupId: string,
  data: Partial<{
    title: string;
    content: string;
    is_pinned: boolean;
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
    .from("shared_notes")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating shared note:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/notes`);
  return { success: true };
}

export async function deleteSharedNote(
  noteId: string,
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
    .from("shared_notes")
    .delete()
    .eq("id", noteId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting shared note:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/notes`);
  return { success: true };
}

export async function togglePinNote(
  noteId: string,
  groupId: string,
  isPinned: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("shared_notes")
    .update({ is_pinned: isPinned })
    .eq("id", noteId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error toggling pin:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/notes`);
  return { success: true };
}
