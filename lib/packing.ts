"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { PackingCategory } from "./packing-constants";

// Re-export types
export type { PackingCategory };

export interface PackingList {
  id: string;
  trip_id: string;
  user_id: string | null;
  is_shared: boolean;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: PackingItem[];
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

export interface PackingItem {
  id: string;
  list_id: string;
  item_name: string;
  category: PackingCategory;
  quantity: number;
  is_packed: boolean;
  packed_at: string | null;
  added_by: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  adder?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

// ============ GET PACKING LISTS ============

export async function getPackingLists(tripId: string): Promise<PackingList[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get all lists for this trip (shared + user's personal)
  const { data: lists, error } = await supabase
    .from("trip_packing_lists")
    .select("*")
    .eq("trip_id", tripId)
    .or(`is_shared.eq.true,user_id.eq.${user.id}`)
    .order("is_shared", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching packing lists:", error);
    return [];
  }

  // Fetch items and creators for each list
  const listsWithDetails = await Promise.all(
    (lists || []).map(async (list) => {
      // Get items
      const { data: items } = await supabase
        .from("trip_packing_items")
        .select("*")
        .eq("list_id", list.id)
        .order("category")
        .order("sort_order")
        .order("created_at");

      // Get adder info for each item
      const itemsWithAdder = await Promise.all(
        (items || []).map(async (item) => {
          let adder = null;
          if (item.added_by) {
            const { data } = await supabase
              .from("users")
              .select("id, display_name, full_name")
              .eq("id", item.added_by)
              .single();
            adder = data;
          }
          return { ...item, adder };
        })
      );

      // Get creator
      let creator = null;
      if (list.created_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", list.created_by)
          .single();
        creator = data;
      }

      return {
        ...list,
        items: itemsWithAdder,
        creator,
      } as PackingList;
    })
  );

  return listsWithDetails;
}

// ============ GET OR CREATE DEFAULT LISTS ============

export async function getOrCreateDefaultLists(
  tripId: string,
  groupId: string
): Promise<{ shared: PackingList | null; personal: PackingList | null }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { shared: null, personal: null };
  }

  // Get existing lists
  const lists = await getPackingLists(tripId);

  let sharedList = lists.find((l) => l.is_shared);
  let personalList = lists.find((l) => !l.is_shared && l.user_id === user.id);

  // Create shared list if none exists
  if (!sharedList) {
    const { data: newShared, error: sharedError } = await supabase
      .from("trip_packing_lists")
      .insert({
        trip_id: tripId,
        user_id: null,
        is_shared: true,
        title: "Group Essentials",
        created_by: user.id,
      })
      .select()
      .single();

    if (!sharedError && newShared) {
      sharedList = { ...newShared, items: [], creator: null };
    }
  }

  // Create personal list if none exists
  if (!personalList) {
    const { data: newPersonal, error: personalError } = await supabase
      .from("trip_packing_lists")
      .insert({
        trip_id: tripId,
        user_id: user.id,
        is_shared: false,
        title: "My Packing List",
        created_by: user.id,
      })
      .select()
      .single();

    if (!personalError && newPersonal) {
      personalList = { ...newPersonal, items: [], creator: null };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { shared: sharedList || null, personal: personalList || null };
}

// ============ CREATE PACKING LIST ============

export async function createPackingList(
  tripId: string,
  groupId: string,
  data: {
    title: string;
    is_shared?: boolean;
  }
): Promise<{ success?: boolean; list?: PackingList; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: list, error } = await supabase
    .from("trip_packing_lists")
    .insert({
      trip_id: tripId,
      user_id: data.is_shared ? null : user.id,
      is_shared: data.is_shared || false,
      title: data.title.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating packing list:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, list: list as PackingList };
}

// ============ UPDATE PACKING LIST ============

export async function updatePackingList(
  listId: string,
  groupId: string,
  tripId: string,
  data: { title?: string }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_lists")
    .update({
      title: data.title?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (error) {
    console.error("Error updating packing list:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ DELETE PACKING LIST ============

export async function deletePackingList(
  listId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_lists")
    .delete()
    .eq("id", listId);

  if (error) {
    console.error("Error deleting packing list:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ ADD PACKING ITEM ============

export async function addPackingItem(
  listId: string,
  groupId: string,
  tripId: string,
  data: {
    item_name: string;
    category?: PackingCategory;
    quantity?: number;
    notes?: string;
  }
): Promise<{ success?: boolean; item?: PackingItem; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get max sort_order for this list
  const { data: maxOrder } = await supabase
    .from("trip_packing_items")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order || 0) + 1;

  const { data: item, error } = await supabase
    .from("trip_packing_items")
    .insert({
      list_id: listId,
      item_name: data.item_name.trim(),
      category: data.category || "misc",
      quantity: data.quantity || 1,
      notes: data.notes?.trim() || null,
      added_by: user.id,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, item: item as PackingItem };
}

// ============ UPDATE PACKING ITEM ============

export async function updatePackingItem(
  itemId: string,
  groupId: string,
  tripId: string,
  data: {
    item_name?: string;
    category?: PackingCategory;
    quantity?: number;
    notes?: string | null;
    is_packed?: boolean;
    sort_order?: number;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {};

  if (data.item_name !== undefined) updateData.item_name = data.item_name.trim();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

  if (data.is_packed !== undefined) {
    updateData.is_packed = data.is_packed;
    updateData.packed_at = data.is_packed ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("trip_packing_items")
    .update(updateData)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ TOGGLE ITEM PACKED ============

export async function toggleItemPacked(
  itemId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; is_packed?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get current state
  const { data: item } = await supabase
    .from("trip_packing_items")
    .select("is_packed")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { error: "Item not found" };
  }

  const newState = !item.is_packed;

  const { error } = await supabase
    .from("trip_packing_items")
    .update({
      is_packed: newState,
      packed_at: newState ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  if (error) {
    console.error("Error toggling packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, is_packed: newState };
}

// ============ DELETE PACKING ITEM ============

export async function deletePackingItem(
  itemId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ COPY ITEM TO PERSONAL LIST ============

export async function copyItemToPersonalList(
  itemId: string,
  personalListId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; item?: PackingItem; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the original item
  const { data: originalItem } = await supabase
    .from("trip_packing_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (!originalItem) {
    return { error: "Item not found" };
  }

  // Check if item already exists in personal list
  const { data: existing } = await supabase
    .from("trip_packing_items")
    .select("id")
    .eq("list_id", personalListId)
    .eq("item_name", originalItem.item_name)
    .single();

  if (existing) {
    return { error: "Item already in your list" };
  }

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from("trip_packing_items")
    .select("sort_order")
    .eq("list_id", personalListId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order || 0) + 1;

  // Create copy in personal list
  const { data: newItem, error } = await supabase
    .from("trip_packing_items")
    .insert({
      list_id: personalListId,
      item_name: originalItem.item_name,
      category: originalItem.category,
      quantity: originalItem.quantity,
      notes: originalItem.notes,
      added_by: user.id,
      sort_order: nextOrder,
      is_packed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error copying packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, item: newItem as PackingItem };
}

// ============ MARK ALL PACKED IN CATEGORY ============

export async function markCategoryPacked(
  listId: string,
  category: PackingCategory,
  packed: boolean,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_items")
    .update({
      is_packed: packed,
      packed_at: packed ? new Date().toISOString() : null,
    })
    .eq("list_id", listId)
    .eq("category", category);

  if (error) {
    console.error("Error marking category packed:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ REORDER ITEMS ============

export async function reorderPackingItems(
  itemIds: string[],
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Update sort_order for each item
  const updates = itemIds.map((id, index) =>
    supabase
      .from("trip_packing_items")
      .update({ sort_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error("Error reordering items:", errors[0].error);
    return { error: "Failed to reorder items" };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// ============ ADD SUGGESTED ITEMS ============

export async function addSuggestedItems(
  listId: string,
  groupId: string,
  tripId: string,
  items: { name: string; category: PackingCategory; quantity?: number }[]
): Promise<{ success?: boolean; added: number; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", added: 0 };
  }

  // Get existing items to avoid duplicates
  const { data: existingItems } = await supabase
    .from("trip_packing_items")
    .select("item_name")
    .eq("list_id", listId);

  const existingNames = new Set(
    (existingItems || []).map((i) => i.item_name.toLowerCase())
  );

  // Filter out items that already exist
  const newItems = items.filter(
    (item) => !existingNames.has(item.name.toLowerCase())
  );

  if (newItems.length === 0) {
    return { success: true, added: 0 };
  }

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from("trip_packing_items")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  let nextOrder = (maxOrder?.sort_order || 0) + 1;

  // Create items
  const itemsToInsert = newItems.map((item) => ({
    list_id: listId,
    item_name: item.name,
    category: item.category,
    quantity: item.quantity || 1,
    added_by: user.id,
    sort_order: nextOrder++,
  }));

  const { error } = await supabase
    .from("trip_packing_items")
    .insert(itemsToInsert);

  if (error) {
    console.error("Error adding suggested items:", error);
    return { error: error.message, added: 0 };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, added: newItems.length };
}
