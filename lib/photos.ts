import { createClient } from './supabase';

export interface Photo {
  id: string;
  group_id: string;
  outing_id: string | null;
  uploaded_by: string;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  taken_at: string | null;
  is_favorite: boolean;
  created_at: string;
  original_filename?: string | null;
  file_size?: number | null;
  uploader?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  outing?: {
    id: string;
    title: string;
  } | null;
}

export interface DuplicateCheck {
  file: File;
  isDuplicate: boolean;
  existingPhoto?: Photo;
}

// Check for potential duplicate photos by filename and file size
export async function checkForDuplicates(
  groupId: string,
  files: { name: string; size: number }[]
):Promise<{ filename: string; size: number; existingPhoto: Photo }[]> {
  const supabase = createClient();

  // Get all photos in the group with their original filenames and sizes
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, file_url, original_filename, file_size, caption, created_at")
    .eq("group_id", groupId);

  if (error || !photos) {
    console.error("Error checking duplicates:", error);
    return [];
  }

  const duplicates: { filename: string; size: number; existingPhoto: Photo }[] = [];

  for (const file of files) {
    // Check for exact match (same filename AND same file size)
    const existing = photos.find(
      (photo) =>
        photo.original_filename === file.name && photo.file_size === file.size
    );

    if (existing) {
      duplicates.push({
        filename: file.name,
        size: file.size,
        existingPhoto: existing as Photo,
      });
    }
  }

  return duplicates;
}

export async function getPhotos(
  groupId: string,
  filter?: "all" | "favorites" | string // string for outing_id
) {
  const supabase = createClient();

  // Debug: Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("getPhotos - Auth check:", {
    userId: user?.id || "NOT AUTHENTICATED",
    authError: authError?.message || null,
    groupId,
    filter
  });

  // Build query without caching
  let query = supabase
    .from("photos")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (filter === "favorites") {
    query = query.eq("is_favorite", true);
  } else if (filter && filter !== "all") {
    // Filter by outing_id
    query = query.eq("outing_id", filter);
  }

  const { data: photos, error } = await query;

  if (error) {
    console.error("Error fetching photos:", error);
    console.error("Query details - groupId:", groupId, "filter:", filter);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return [];
  }

  console.log("Photos fetched:", photos?.length || 0, "for group:", groupId);
  if (photos?.length === 0) {
    console.log("No photos returned - checking if RLS issue. User ID:", user?.id);
  }

  // Fetch uploader info separately
  const photosWithUploader = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data: uploader } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", photo.uploaded_by)
        .single();

      let outing = null;
      if (photo.outing_id) {
        const { data: outingData } = await supabase
          .from("outings")
          .select("id, title")
          .eq("id", photo.outing_id)
          .single();
        outing = outingData;
      }

      return {
        ...photo,
        uploader,
        outing,
      };
    })
  );

  return photosWithUploader as Photo[];
}

export async function getPhoto(photoId: string) {
  const supabase = createClient();

  const { data: photo, error } = await supabase
    .from("photos")
    .select(`
      *,
      uploader:users!uploaded_by (
        id,
        display_name,
        full_name,
        avatar_url
      ),
      outing:outings (
        id,
        title
      )
    `)
    .eq("id", photoId)
    .single();

  if (error) {
    console.error("Error fetching photo:", error);
    return null;
  }

  return photo as Photo;
}

export async function uploadPhoto(
  groupId: string,
  file: File,
  caption?: string,
  outingId?: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${groupId}/${user.id}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(fileName, file);

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    return { error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("photos")
    .getPublicUrl(fileName);

  const fileUrl = urlData.publicUrl;

  // Insert photo record
  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      group_id: groupId,
      outing_id: outingId || null,
      uploaded_by: user.id,
      file_url: fileUrl,
      caption: caption?.trim() || null,
      original_filename: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting photo:", insertError);
    return { error: insertError.message };
  }

  return { success: true, photo };
}

export async function uploadPhotos(
  groupId: string,
  formData: FormData
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const files = formData.getAll("files") as File[];
  const caption = formData.get("caption") as string;
  const outingIdValue = formData.get("outingId");
  // Properly extract outingId - ensure it's a valid non-empty string or null
  const outingId = typeof outingIdValue === "string" && outingIdValue.trim() !== ""
    ? outingIdValue.trim()
    : null;

  if (files.length === 0) {
    return { error: "No files provided" };
  }

  // Limit: Max 20 files per upload
  if (files.length > 20) {
    return { error: "Too many files. Please upload 20 or fewer photos at a time." };
  }

  // Check individual file sizes (50MB per file)
  const maxFileSize = 50 * 1024 * 1024; // 50MB per file
  const oversizedFiles = files.filter(f => f.size > maxFileSize);
  if (oversizedFiles.length > 0) {
    return { 
      error: `Some files exceed 50MB limit: ${oversizedFiles.map(f => f.name).join(', ')}` 
    };
  }

  // Check total file size (limit: 100MB total)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 100 * 1024 * 1024; // 100MB
  if (totalSize > maxTotalSize) {
    return { error: `Total file size exceeds 100MB. Please reduce the number or size of photos.` };
  }

  console.log(`Starting upload of ${files.length} files, total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

  const uploadedPhotos: { id: string; file_url: string }[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      console.log(`Uploading ${file.name} (${(file.size / 1024).toFixed(2)}KB)...`);
      
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${groupId}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage with timeout
      const uploadPromise = supabase.storage
        .from("photos")
        .upload(fileName, file);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 120000) // 120 second timeout for mobile
      );

      const { error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as { error: Error | null };

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        errors.push(`Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`);
        continue;
      }
      
      console.log(`Successfully uploaded ${file.name}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("photos")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Insert photo record with original filename and size for duplicate detection
    const { data: photo, error: insertError } = await supabase
      .from("photos")
      .insert({
        group_id: groupId,
        outing_id: outingId,
        uploaded_by: user.id,
        file_url: fileUrl,
        caption: caption?.trim() || null,
        original_filename: file.name,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting photo:", insertError);
      errors.push(`Failed to save ${file.name}`);
      continue;
    }

    uploadedPhotos.push(photo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Exception uploading ${file.name}:`, err);
      errors.push(`Failed to upload ${file.name}: ${errorMessage}`);
    }
  }
  
  console.log(`Upload complete: ${uploadedPhotos.length} succeeded, ${errors.length} failed`);

  // Create notifications for all group members
  if (uploadedPhotos.length > 0) {
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

      const uploaderName = profile?.display_name || profile?.full_name || "Someone";
      const photoCount = uploadedPhotos.length;
      const message = photoCount === 1
        ? `${uploaderName} added a photo`
        : `${uploaderName} added ${photoCount} photos`;

      const notifications = members.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: "photos_added",
        title: "New Photos",
        message,
        link: `/groups/${groupId}/photos`,
        group_id: groupId,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  }

  if (errors.length > 0) {
    return {
      success: true,
      photos: uploadedPhotos,
      warnings: errors,
    };
  }

  return { success: true, photos: uploadedPhotos };
}

export async function toggleFavorite(photoId: string, groupId: string) {
  const supabase = createClient();

  // Get current favorite status
  const { data: photo } = await supabase
    .from("photos")
    .select("is_favorite")
    .eq("id", photoId)
    .single();

  if (!photo) {
    return { error: "Photo not found" };
  }

  const { error } = await supabase
    .from("photos")
    .update({ is_favorite: !photo.is_favorite })
    .eq("id", photoId);

  if (error) {
    console.error("Error toggling favorite:", error);
    return { error: error.message };
  }

  return { success: true, is_favorite: !photo.is_favorite };
}

export async function updatePhotoCaption(
  photoId: string,
  caption: string,
  groupId: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("photos")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId)
    .eq("uploaded_by", user.id);

  if (error) {
    console.error("Error updating caption:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePhoto(
  photoId: string,
  groupId: string,
  updates: { caption?: string; outing_id?: string | null }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const updateData: { caption?: string | null; outing_id?: string | null } = {};

  if (updates.caption !== undefined) {
    updateData.caption = updates.caption.trim() || null;
  }

  if (updates.outing_id !== undefined) {
    updateData.outing_id = updates.outing_id || null;
  }

  const { data: photo, error } = await supabase
    .from("photos")
    .update(updateData)
    .eq("id", photoId)
    .eq("uploaded_by", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating photo:", error);
    return { error: error.message };
  }

  return { success: true, photo };
}

export async function deletePhoto(photoId: string, groupId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get photo to delete from storage
  const { data: photo } = await supabase
    .from("photos")
    .select("file_url, uploaded_by")
    .eq("id", photoId)
    .single();

  if (!photo) {
    return { error: "Photo not found" };
  }

  if (photo.uploaded_by !== user.id) {
    return { error: "You can only delete your own photos" };
  }

  // Extract file path from URL
  const urlParts = photo.file_url.split("/photos/");
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from("photos").remove([filePath]);
  }

  // Delete photo record
  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("uploaded_by", user.id);

  if (error) {
    console.error("Error deleting photo:", error);
    return { error: error.message };
  }

  return { success: true };
}

// ============ BATCH OPERATIONS ============

export async function batchDeletePhotos(photoIds: string[], groupId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (photoIds.length === 0) {
    return { error: "No photos selected" };
  }

  // Get photos to delete
  const { data: photos } = await supabase
    .from("photos")
    .select("id, file_url, uploaded_by")
    .in("id", photoIds)
    .eq("uploaded_by", user.id);

  if (!photos || photos.length === 0) {
    return { error: "No photos found or you can only delete your own photos" };
  }

  // Delete from storage
  const filePaths: string[] = [];
  for (const photo of photos) {
    const urlParts = photo.file_url.split("/photos/");
    if (urlParts.length > 1) {
      filePaths.push(urlParts[1]);
    }
  }

  if (filePaths.length > 0) {
    await supabase.storage.from("photos").remove(filePaths);
  }

  // Delete records
  const { error } = await supabase
    .from("photos")
    .delete()
    .in("id", photos.map(p => p.id));

  if (error) {
    console.error("Error batch deleting photos:", error);
    return { error: error.message };
  }

  return { success: true, count: photos.length };
}

export async function batchUpdateOuting(
  photoIds: string[],
  groupId: string,
  outingId: string | null
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (photoIds.length === 0) {
    return { error: "No photos selected" };
  }

  // Update only user's photos
  const { data: updated, error } = await supabase
    .from("photos")
    .update({ outing_id: outingId || null })
    .in("id", photoIds)
    .eq("uploaded_by", user.id)
    .select("id");

  if (error) {
    console.error("Error batch updating outing:", error);
    return { error: error.message };
  }

  return { success: true, count: updated?.length || 0 };
}

export async function batchToggleFavorite(
  photoIds: string[],
  groupId: string,
  setFavorite: boolean
) {
  const supabase = createClient();

  if (photoIds.length === 0) {
    return { error: "No photos selected" };
  }

  const { data: updated, error } = await supabase
    .from("photos")
    .update({ is_favorite: setFavorite })
    .in("id", photoIds)
    .select("id");

  if (error) {
    console.error("Error batch toggling favorite:", error);
    return { error: error.message };
  }

  return { success: true, count: updated?.length || 0 };
}
