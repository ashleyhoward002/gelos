"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export interface GroupDocument {
  id: string;
  group_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: DocumentCategory;
  description?: string | null;
  outing_id?: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  outing?: {
    id: string;
    title: string;
  } | null;
}

export type DocumentCategory =
  | "itinerary"
  | "ticket"
  | "reservation"
  | "receipt"
  | "map"
  | "guide"
  | "contract"
  | "other";

export const documentCategoryLabels: Record<DocumentCategory, { label: string; icon: string }> = {
  itinerary: { label: "Itinerary", icon: "📅" },
  ticket: { label: "Ticket", icon: "🎫" },
  reservation: { label: "Reservation", icon: "🏨" },
  receipt: { label: "Receipt", icon: "🧾" },
  map: { label: "Map", icon: "🗺️" },
  guide: { label: "Guide", icon: "📖" },
  contract: { label: "Contract", icon: "📝" },
  other: { label: "Other", icon: "📄" },
};

export async function getDocuments(groupId: string): Promise<GroupDocument[]> {
  const supabase = await createServerSupabaseClient();

  const { data: documents, error } = await supabase
    .from("group_documents")
    .select(`
      *,
      uploader:users!group_documents_uploaded_by_fkey(
        id,
        display_name,
        full_name,
        avatar_url
      ),
      outing:outings(
        id,
        title
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  return documents || [];
}

export async function uploadDocument(
  groupId: string,
  formData: FormData
): Promise<{ document?: GroupDocument; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const category = formData.get("category") as DocumentCategory;
  const description = formData.get("description") as string | null;
  const outingId = formData.get("outing_id") as string | null;

  if (!file || !name || !category) {
    return { error: "Missing required fields" };
  }

  // Validate file size (max 25MB)
  if (file.size > 25 * 1024 * 1024) {
    return { error: "File too large. Maximum size is 25MB." };
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Allowed: PDF, images, Word, Excel, and text files." };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split(".").pop();
  const fileName = `${groupId}/${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, "_")}.${extension}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(fileName, file);

  if (uploadError) {
    console.error("Error uploading document:", uploadError);
    return { error: "Failed to upload file" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(fileName);

  // Create document record
  const { data: document, error: insertError } = await supabase
    .from("group_documents")
    .insert({
      group_id: groupId,
      name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      category,
      description: description || null,
      outing_id: outingId || null,
      uploaded_by: user.id,
    })
    .select(`
      *,
      uploader:users!group_documents_uploaded_by_fkey(
        id,
        display_name,
        full_name,
        avatar_url
      ),
      outing:outings(
        id,
        title
      )
    `)
    .single();

  if (insertError) {
    console.error("Error creating document record:", insertError);
    // Try to clean up uploaded file
    await supabase.storage.from("documents").remove([fileName]);
    return { error: "Failed to save document" };
  }

  revalidatePath(`/groups/${groupId}/documents`);
  return { document };
}

export async function deleteDocument(
  documentId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the document to find the file path
  const { data: document, error: fetchError } = await supabase
    .from("group_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { error: "Document not found" };
  }

  // Check if user is the uploader or a group admin
  if (document.uploaded_by !== user.id) {
    // Check if user is admin
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { error: "Only the uploader or an admin can delete this document" };
    }
  }

  // Extract file path from URL
  const url = new URL(document.file_url);
  const pathParts = url.pathname.split("/");
  const filePath = pathParts.slice(pathParts.indexOf("documents") + 1).join("/");

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([filePath]);

  if (storageError) {
    console.error("Error deleting file from storage:", storageError);
    // Continue to delete the record anyway
  }

  // Delete the record
  const { error: deleteError } = await supabase
    .from("group_documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) {
    console.error("Error deleting document record:", deleteError);
    return { error: "Failed to delete document" };
  }

  revalidatePath(`/groups/${groupId}/documents`);
  return { success: true };
}

export async function updateDocument(
  documentId: string,
  groupId: string,
  updates: {
    name?: string;
    category?: DocumentCategory;
    description?: string | null;
    outing_id?: string | null;
  }
): Promise<{ document?: GroupDocument; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Update the document
  const { data: document, error } = await supabase
    .from("group_documents")
    .update(updates)
    .eq("id", documentId)
    .select(`
      *,
      uploader:users!group_documents_uploaded_by_fkey(
        id,
        display_name,
        full_name,
        avatar_url
      ),
      outing:outings(
        id,
        title
      )
    `)
    .single();

  if (error) {
    console.error("Error updating document:", error);
    return { error: "Failed to update document" };
  }

  revalidatePath(`/groups/${groupId}/documents`);
  return { document };
}

export async function getOutingsForDocuments(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: outings, error } = await supabase
    .from("outings")
    .select("id, title")
    .eq("group_id", groupId)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching outings:", error);
    return [];
  }

  return outings || [];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType === "application/pdf") return "📕";
  if (fileType.includes("word")) return "📘";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📗";
  if (fileType === "text/plain") return "📄";
  return "📎";
}
