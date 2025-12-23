"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface StudyResource {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  resource_type: "note" | "link" | "file";
  content: string | null; // For notes
  url: string | null; // For links
  file_url: string | null; // For files
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  subject: string | null;
  is_pinned: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================
// STUDY RESOURCES CRUD
// ============================================

export async function getStudyResources(groupId: string): Promise<StudyResource[]> {
  const supabase = await createServerSupabaseClient();

  const { data: resources, error } = await supabase
    .from("study_resources")
    .select("*")
    .eq("group_id", groupId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching study resources:", error);
    return [];
  }

  // Get uploader info for each resource
  const resourcesWithUploaders = await Promise.all(
    (resources || []).map(async (resource) => {
      const { data: uploader } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", resource.uploaded_by)
        .single();

      return {
        ...resource,
        uploader: uploader || undefined,
      };
    })
  );

  return resourcesWithUploaders;
}

export async function getStudyResource(resourceId: string): Promise<StudyResource | null> {
  const supabase = await createServerSupabaseClient();

  const { data: resource, error } = await supabase
    .from("study_resources")
    .select("*")
    .eq("id", resourceId)
    .single();

  if (error || !resource) {
    console.error("Error fetching study resource:", error);
    return null;
  }

  // Get uploader info
  const { data: uploader } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", resource.uploaded_by)
    .single();

  return {
    ...resource,
    uploader: uploader || undefined,
  };
}

export async function createStudyResource(
  groupId: string,
  data: {
    title: string;
    description?: string;
    resource_type: "note" | "link" | "file";
    content?: string;
    url?: string;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
    subject?: string;
  }
): Promise<{ success: boolean; resource?: StudyResource; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: resource, error } = await supabase
    .from("study_resources")
    .insert({
      group_id: groupId,
      title: data.title,
      description: data.description || null,
      resource_type: data.resource_type,
      content: data.content || null,
      url: data.url || null,
      file_url: data.file_url || null,
      file_name: data.file_name || null,
      file_type: data.file_type || null,
      file_size: data.file_size || null,
      subject: data.subject || null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating study resource:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/resources`);
  return { success: true, resource };
}

export async function updateStudyResource(
  resourceId: string,
  groupId: string,
  data: Partial<{
    title: string;
    description: string;
    content: string;
    url: string;
    subject: string;
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
    .from("study_resources")
    .update(data)
    .eq("id", resourceId)
    .eq("uploaded_by", user.id);

  if (error) {
    console.error("Error updating study resource:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/resources`);
  return { success: true };
}

export async function deleteStudyResource(
  resourceId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the resource to check if it has a file
  const { data: resource } = await supabase
    .from("study_resources")
    .select("file_url")
    .eq("id", resourceId)
    .single();

  // Delete from storage if it's a file
  if (resource?.file_url) {
    const filePath = resource.file_url.split("/").slice(-2).join("/");
    await supabase.storage.from("study-resources").remove([filePath]);
  }

  const { error } = await supabase
    .from("study_resources")
    .delete()
    .eq("id", resourceId)
    .eq("uploaded_by", user.id);

  if (error) {
    console.error("Error deleting study resource:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/resources`);
  return { success: true };
}

export async function togglePinResource(
  resourceId: string,
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
    .from("study_resources")
    .update({ is_pinned: isPinned })
    .eq("id", resourceId)
    .eq("uploaded_by", user.id);

  if (error) {
    console.error("Error toggling pin:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/resources`);
  return { success: true };
}

// ============================================
// FILE UPLOAD
// ============================================

export async function uploadResourceFile(
  groupId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Generate unique filename
  const ext = file.name.split(".").pop();
  const fileName = `${groupId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("study-resources")
    .upload(fileName, file);

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrl } = supabase.storage
    .from("study-resources")
    .getPublicUrl(fileName);

  return { success: true, url: publicUrl.publicUrl };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function getResourcesBySubject(
  groupId: string,
  subject: string
): Promise<StudyResource[]> {
  const supabase = await createServerSupabaseClient();

  const { data: resources, error } = await supabase
    .from("study_resources")
    .select("*")
    .eq("group_id", groupId)
    .eq("subject", subject)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching resources by subject:", error);
    return [];
  }

  return resources || [];
}

export async function getSubjects(groupId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  const { data: resources, error } = await supabase
    .from("study_resources")
    .select("subject")
    .eq("group_id", groupId)
    .not("subject", "is", null);

  if (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }

  // Get unique subjects
  const subjectSet = new Set(resources?.map((r) => r.subject).filter(Boolean));
  const subjects = Array.from(subjectSet) as string[];
  return subjects.sort();
}
