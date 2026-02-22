"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface WhiteboardBoard {
  id: string;
  group_id: string;
  title: string;
  background_color: string;
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

export type ElementType = "path" | "shape" | "text" | "image" | "sticky";

export interface PathContent {
  points: [number, number][];
  strokeColor: string;
  strokeWidth: number;
  tool: "pen" | "marker" | "highlighter";
}

export interface ShapeContent {
  shapeType: "rectangle" | "circle" | "triangle" | "arrow" | "line";
  fillColor: string | null;
  strokeColor: string;
  strokeWidth: number;
}

export interface TextContent {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
}

export interface ImageContent {
  imageUrl: string;
  caption?: string;
}

export interface StickyContent {
  text: string;
  backgroundColor: string;
}

export type ElementContent = PathContent | ShapeContent | TextContent | ImageContent | StickyContent;

export interface WhiteboardElement {
  id: string;
  board_id: string;
  element_type: ElementType;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  z_index: number;
  content: ElementContent;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

// ============================================
// BOARDS
// ============================================

export async function getWhiteboards(groupId: string): Promise<WhiteboardBoard[]> {
  const supabase = await createServerSupabaseClient();

  const { data: boards, error } = await supabase
    .from("whiteboard_boards")
    .select("*")
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching whiteboards:", error);
    return [];
  }

  // Get element counts and creator info
  const boardsWithDetails = await Promise.all(
    (boards || []).map(async (board) => {
      const { count } = await supabase
        .from("whiteboard_elements")
        .select("*", { count: "exact", head: true })
        .eq("board_id", board.id);

      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", board.created_by)
        .single();

      return {
        ...board,
        element_count: count || 0,
        creator: creator || undefined,
      };
    })
  );

  return boardsWithDetails;
}

export async function getWhiteboard(boardId: string): Promise<WhiteboardBoard | null> {
  const supabase = await createServerSupabaseClient();

  const { data: board, error } = await supabase
    .from("whiteboard_boards")
    .select("*")
    .eq("id", boardId)
    .single();

  if (error || !board) {
    console.error("Error fetching whiteboard:", error);
    return null;
  }

  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", board.created_by)
    .single();

  return { ...board, creator: creator || undefined };
}

export async function createWhiteboard(
  groupId: string,
  title: string
): Promise<{ success: boolean; board?: WhiteboardBoard; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: board, error } = await supabase
    .from("whiteboard_boards")
    .insert({
      group_id: groupId,
      title,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating whiteboard:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/whiteboard`);
  return { success: true, board };
}

export async function updateWhiteboard(
  boardId: string,
  updates: { title?: string; background_color?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("whiteboard_boards")
    .update(updates)
    .eq("id", boardId);

  if (error) {
    console.error("Error updating whiteboard:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteWhiteboard(
  boardId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("whiteboard_boards")
    .delete()
    .eq("id", boardId);

  if (error) {
    console.error("Error deleting whiteboard:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/whiteboard`);
  return { success: true };
}

// ============================================
// ELEMENTS
// ============================================

export async function getWhiteboardElements(boardId: string): Promise<WhiteboardElement[]> {
  const supabase = await createServerSupabaseClient();

  const { data: elements, error } = await supabase
    .from("whiteboard_elements")
    .select("*")
    .eq("board_id", boardId)
    .order("z_index", { ascending: true });

  if (error) {
    console.error("Error fetching whiteboard elements:", error);
    return [];
  }

  return elements || [];
}

export async function createElement(
  boardId: string,
  elementType: ElementType,
  content: ElementContent,
  position?: { x: number; y: number },
  size?: { width: number; height: number }
): Promise<{ success: boolean; element?: WhiteboardElement; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get highest z_index
  const { data: topElement } = await supabase
    .from("whiteboard_elements")
    .select("z_index")
    .eq("board_id", boardId)
    .order("z_index", { ascending: false })
    .limit(1)
    .single();

  const zIndex = (topElement?.z_index || 0) + 1;

  const { data: element, error } = await supabase
    .from("whiteboard_elements")
    .insert({
      board_id: boardId,
      element_type: elementType,
      content,
      position_x: position?.x ?? 0,
      position_y: position?.y ?? 0,
      width: size?.width ?? null,
      height: size?.height ?? null,
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
  updates: Partial<Pick<WhiteboardElement, "position_x" | "position_y" | "width" | "height" | "rotation" | "z_index" | "content">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("whiteboard_elements")
    .update(updates)
    .eq("id", elementId);

  if (error) {
    console.error("Error updating element:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteElement(elementId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("whiteboard_elements")
    .delete()
    .eq("id", elementId);

  if (error) {
    console.error("Error deleting element:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function clearBoard(boardId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Only delete elements created by this user
  const { error } = await supabase
    .from("whiteboard_elements")
    .delete()
    .eq("board_id", boardId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error clearing board:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
