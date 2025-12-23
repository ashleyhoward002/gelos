"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface ScrapbookPage {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  cover_thumbnail_url: string | null;
  background_color: string;
  background_pattern: string | null;
  page_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  element_count?: number;
}

export interface ScrapbookElement {
  id: string;
  page_id: string;
  element_type: "photo" | "text" | "sticker" | "shape" | "date_stamp";
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  content: PhotoContent | TextContent | StickerContent | ShapeContent | DateStampContent;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoContent {
  photoId?: string;
  photoUrl: string;
  caption?: string;
}

export interface TextContent {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
}

export interface StickerContent {
  stickerId: string;
  emoji?: string;
  stickerUrl?: string;
}

export interface ShapeContent {
  shapeType: "rectangle" | "circle" | "star" | "heart";
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface DateStampContent {
  date: string;
  format?: string;
  style?: string;
}

export interface StickerCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface Sticker {
  id: string;
  category_id: string;
  name: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
}

// ============================================
// SCRAPBOOK PAGES
// ============================================

export async function getScrapbookPages(groupId: string): Promise<ScrapbookPage[]> {
  const supabase = await createServerSupabaseClient();

  const { data: pages, error } = await supabase
    .from("scrapbook_pages")
    .select("*")
    .eq("group_id", groupId)
    .order("page_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching scrapbook pages:", error);
    return [];
  }

  // Get element counts for each page
  const pagesWithCounts = await Promise.all(
    (pages || []).map(async (page) => {
      const { count } = await supabase
        .from("scrapbook_elements")
        .select("*", { count: "exact", head: true })
        .eq("page_id", page.id);

      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", page.created_by)
        .single();

      return {
        ...page,
        element_count: count || 0,
        creator: creator || undefined,
      };
    })
  );

  return pagesWithCounts;
}

export async function getScrapbookPage(pageId: string): Promise<ScrapbookPage | null> {
  const supabase = await createServerSupabaseClient();

  const { data: page, error } = await supabase
    .from("scrapbook_pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (error || !page) {
    console.error("Error fetching scrapbook page:", error);
    return null;
  }

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", page.created_by)
    .single();

  return {
    ...page,
    creator: creator || undefined,
  };
}

export async function createScrapbookPage(
  groupId: string,
  title: string,
  description?: string,
  backgroundColor?: string
): Promise<{ success: boolean; page?: ScrapbookPage; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get highest page_order
  const { data: lastPage } = await supabase
    .from("scrapbook_pages")
    .select("page_order")
    .eq("group_id", groupId)
    .order("page_order", { ascending: false })
    .limit(1)
    .single();

  const pageOrder = (lastPage?.page_order || 0) + 1;

  const { data: page, error } = await supabase
    .from("scrapbook_pages")
    .insert({
      group_id: groupId,
      title,
      description: description || null,
      background_color: backgroundColor || "#FFF8F0",
      page_order: pageOrder,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating scrapbook page:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/scrapbook`);
  return { success: true, page };
}

export async function updateScrapbookPage(
  pageId: string,
  updates: {
    title?: string;
    description?: string;
    background_color?: string;
    background_pattern?: string | null;
    cover_thumbnail_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("scrapbook_pages")
    .update(updates)
    .eq("id", pageId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating scrapbook page:", error);
    return { success: false, error: error.message };
  }

  // Get group_id for revalidation
  const { data: page } = await supabase
    .from("scrapbook_pages")
    .select("group_id")
    .eq("id", pageId)
    .single();

  if (page) {
    revalidatePath(`/groups/${page.group_id}/scrapbook`);
    revalidatePath(`/groups/${page.group_id}/scrapbook/${pageId}`);
  }

  return { success: true };
}

export async function deleteScrapbookPage(
  pageId: string,
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
    .from("scrapbook_pages")
    .delete()
    .eq("id", pageId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting scrapbook page:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/scrapbook`);
  return { success: true };
}

// ============================================
// SCRAPBOOK ELEMENTS
// ============================================

export async function getScrapbookElements(pageId: string): Promise<ScrapbookElement[]> {
  const supabase = await createServerSupabaseClient();

  const { data: elements, error } = await supabase
    .from("scrapbook_elements")
    .select("*")
    .eq("page_id", pageId)
    .order("z_index", { ascending: true });

  if (error) {
    console.error("Error fetching scrapbook elements:", error);
    return [];
  }

  return elements || [];
}

export async function createElement(
  pageId: string,
  elementType: ScrapbookElement["element_type"],
  content: ScrapbookElement["content"],
  position?: { x: number; y: number },
  size?: { width: number; height: number }
): Promise<{ success: boolean; element?: ScrapbookElement; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get highest z_index on this page
  const { data: topElement } = await supabase
    .from("scrapbook_elements")
    .select("z_index")
    .eq("page_id", pageId)
    .order("z_index", { ascending: false })
    .limit(1)
    .single();

  const zIndex = (topElement?.z_index || 0) + 1;

  // Default sizes based on element type
  const defaultSizes: Record<string, { width: number; height: number }> = {
    photo: { width: 250, height: 250 },
    text: { width: 200, height: 100 },
    sticker: { width: 80, height: 80 },
    shape: { width: 150, height: 150 },
    date_stamp: { width: 180, height: 60 },
  };

  const { data: element, error } = await supabase
    .from("scrapbook_elements")
    .insert({
      page_id: pageId,
      element_type: elementType,
      content,
      position_x: position?.x ?? 100,
      position_y: position?.y ?? 100,
      width: size?.width ?? defaultSizes[elementType]?.width ?? 200,
      height: size?.height ?? defaultSizes[elementType]?.height ?? 200,
      z_index: zIndex,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating element:", error);
    return { success: false, error: error.message };
  }

  return { success: true, element };
}

export async function updateElement(
  elementId: string,
  updates: Partial<{
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
    z_index: number;
    content: ScrapbookElement["content"];
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
    .from("scrapbook_elements")
    .update(updates)
    .eq("id", elementId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating element:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteElement(
  elementId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("scrapbook_elements")
    .delete()
    .eq("id", elementId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting element:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function bringToFront(
  elementId: string,
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get highest z_index on this page
  const { data: topElement } = await supabase
    .from("scrapbook_elements")
    .select("z_index")
    .eq("page_id", pageId)
    .order("z_index", { ascending: false })
    .limit(1)
    .single();

  const newZIndex = (topElement?.z_index || 0) + 1;

  const { error } = await supabase
    .from("scrapbook_elements")
    .update({ z_index: newZIndex })
    .eq("id", elementId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error bringing to front:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function sendToBack(
  elementId: string,
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get lowest z_index on this page
  const { data: bottomElement } = await supabase
    .from("scrapbook_elements")
    .select("z_index")
    .eq("page_id", pageId)
    .order("z_index", { ascending: true })
    .limit(1)
    .single();

  const newZIndex = (bottomElement?.z_index || 1) - 1;

  const { error } = await supabase
    .from("scrapbook_elements")
    .update({ z_index: newZIndex })
    .eq("id", elementId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error sending to back:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// STICKERS
// ============================================

export async function getStickerCategories(): Promise<StickerCategory[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("sticker_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching sticker categories:", error);
    return [];
  }

  return data || [];
}

export async function getStickers(categoryId?: string): Promise<Sticker[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("stickers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching stickers:", error);
    return [];
  }

  return data || [];
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function saveAllElements(
  pageId: string,
  elements: Array<{
    id: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
    z_index: number;
    content: ScrapbookElement["content"];
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update all elements in parallel
  const updates = elements.map((element) =>
    supabase
      .from("scrapbook_elements")
      .update({
        position_x: element.position_x,
        position_y: element.position_y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        z_index: element.z_index,
        content: element.content,
      })
      .eq("id", element.id)
      .eq("created_by", user.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error("Errors saving elements:", errors);
    return { success: false, error: "Failed to save some elements" };
  }

  return { success: true };
}
