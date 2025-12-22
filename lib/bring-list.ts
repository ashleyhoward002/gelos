"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { getTemplate } from "./bring-list-constants";

// ============================================
// TYPES
// ============================================

export interface BringListCategory {
  id: string;
  bring_list_id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface BringListItem {
  id: string;
  bring_list_id: string;
  category_id: string | null;
  item_name: string;
  quantity_needed: number;
  quantity_claimed: number;
  claimed_by: string | null;
  claimed_by_name: string | null;
  claim_note: string | null;
  notes: string | null;
  is_suggestion: boolean;
  suggestion_approved: boolean;
  is_received: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  category?: BringListCategory | null;
}

export interface BringList {
  id: string;
  event_id: string | null;
  outing_id: string | null;
  group_id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_providing: string | null;
  template_used: string | null;
  created_at: string;
  updated_at: string;
  categories: BringListCategory[];
  items: BringListItem[];
  host?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ============================================
// GET BRING LIST
// ============================================

export async function getBringList(params: {
  eventId?: string;
  outingId?: string;
}): Promise<BringList | null> {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from("event_bring_lists").select("*");

  if (params.eventId) {
    query = query.eq("event_id", params.eventId);
  } else if (params.outingId) {
    query = query.eq("outing_id", params.outingId);
  } else {
    return null;
  }

  const { data: bringList, error } = await query.single();

  if (error || !bringList) {
    return null;
  }

  // Get categories
  const { data: categories } = await supabase
    .from("bring_list_categories")
    .select("*")
    .eq("bring_list_id", bringList.id)
    .order("sort_order");

  // Get items
  const { data: items } = await supabase
    .from("bring_list_items")
    .select("*")
    .eq("bring_list_id", bringList.id)
    .order("created_at");

  // Get host info
  const { data: host } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", bringList.host_id)
    .single();

  return {
    ...bringList,
    categories: categories || [],
    items: items || [],
    host,
  } as BringList;
}

// ============================================
// CREATE BRING LIST
// ============================================

export async function createBringList(data: {
  eventId?: string;
  outingId?: string;
  groupId: string;
  title: string;
  description?: string;
  hostProviding?: string;
  templateId?: string;
}): Promise<{ success?: boolean; bringList?: BringList; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Create the bring list
  const { data: bringList, error } = await supabase
    .from("event_bring_lists")
    .insert({
      event_id: data.eventId || null,
      outing_id: data.outingId || null,
      group_id: data.groupId,
      title: data.title,
      description: data.description || null,
      host_id: user.id,
      host_providing: data.hostProviding || null,
      template_used: data.templateId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating bring list:", error);
    return { error: error.message };
  }

  // If template is provided, add categories and items
  if (data.templateId && data.templateId !== "blank") {
    const template = getTemplate(data.templateId);
    if (template) {
      // If no host providing was set, use template default
      if (!data.hostProviding && template.hostProviding) {
        await supabase
          .from("event_bring_lists")
          .update({ host_providing: template.hostProviding })
          .eq("id", bringList.id);
      }

      // Add categories and items
      for (let i = 0; i < template.categories.length; i++) {
        const cat = template.categories[i];

        const { data: category } = await supabase
          .from("bring_list_categories")
          .insert({
            bring_list_id: bringList.id,
            name: cat.name,
            icon: cat.icon,
            sort_order: i,
          })
          .select()
          .single();

        if (category) {
          // Add items for this category
          const itemsToInsert = cat.items.map((itemName) => ({
            bring_list_id: bringList.id,
            category_id: category.id,
            item_name: itemName,
            added_by: user.id,
          }));

          await supabase.from("bring_list_items").insert(itemsToInsert);
        }
      }
    }
  }

  // Revalidate paths
  if (data.eventId) {
    revalidatePath(`/groups/${data.groupId}/calendar`);
  }
  if (data.outingId) {
    revalidatePath(`/groups/${data.groupId}/outings/${data.outingId}`);
  }

  // Fetch the complete bring list
  const fullBringList = await getBringList({
    eventId: data.eventId,
    outingId: data.outingId,
  });

  return { success: true, bringList: fullBringList || undefined };
}

// ============================================
// UPDATE BRING LIST
// ============================================

export async function updateBringList(
  listId: string,
  groupId: string,
  data: {
    title?: string;
    description?: string;
    hostProviding?: string;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.hostProviding !== undefined) updateData.host_providing = data.hostProviding;

  const { error } = await supabase
    .from("event_bring_lists")
    .update(updateData)
    .eq("id", listId);

  if (error) {
    console.error("Error updating bring list:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// DELETE BRING LIST
// ============================================

export async function deleteBringList(
  listId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("event_bring_lists")
    .delete()
    .eq("id", listId);

  if (error) {
    console.error("Error deleting bring list:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// CATEGORY OPERATIONS
// ============================================

export async function addCategory(
  listId: string,
  groupId: string,
  data: { name: string; icon?: string }
): Promise<{ success?: boolean; category?: BringListCategory; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get max sort order
  const { data: maxOrder } = await supabase
    .from("bring_list_categories")
    .select("sort_order")
    .eq("bring_list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: category, error } = await supabase
    .from("bring_list_categories")
    .insert({
      bring_list_id: listId,
      name: data.name,
      icon: data.icon || "📦",
      sort_order: (maxOrder?.sort_order || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding category:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, category: category as BringListCategory };
}

export async function updateCategory(
  categoryId: string,
  groupId: string,
  data: { name?: string; icon?: string; sort_order?: number }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("bring_list_categories")
    .update(data)
    .eq("id", categoryId);

  if (error) {
    console.error("Error updating category:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function deleteCategory(
  categoryId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("bring_list_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("Error deleting category:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// ITEM OPERATIONS
// ============================================

export async function addItem(
  listId: string,
  groupId: string,
  data: {
    itemName: string;
    categoryId?: string;
    quantityNeeded?: number;
    notes?: string;
    isSuggestion?: boolean;
  }
): Promise<{ success?: boolean; item?: BringListItem; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: item, error } = await supabase
    .from("bring_list_items")
    .insert({
      bring_list_id: listId,
      category_id: data.categoryId || null,
      item_name: data.itemName.trim(),
      quantity_needed: data.quantityNeeded || 1,
      notes: data.notes?.trim() || null,
      is_suggestion: data.isSuggestion || false,
      suggestion_approved: !data.isSuggestion, // Auto-approve if not a suggestion
      added_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, item: item as BringListItem };
}

export async function updateItem(
  itemId: string,
  groupId: string,
  data: {
    itemName?: string;
    categoryId?: string;
    quantityNeeded?: number;
    notes?: string;
    suggestionApproved?: boolean;
    isReceived?: boolean;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {};
  if (data.itemName !== undefined) updateData.item_name = data.itemName.trim();
  if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
  if (data.quantityNeeded !== undefined) updateData.quantity_needed = data.quantityNeeded;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.suggestionApproved !== undefined) updateData.suggestion_approved = data.suggestionApproved;
  if (data.isReceived !== undefined) updateData.is_received = data.isReceived;

  const { error } = await supabase
    .from("bring_list_items")
    .update(updateData)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function deleteItem(
  itemId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("bring_list_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// CLAIM OPERATIONS
// ============================================

export async function claimItem(
  itemId: string,
  groupId: string,
  claimNote?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get user's display name
  const { data: userData } = await supabase
    .from("users")
    .select("display_name, full_name")
    .eq("id", user.id)
    .single();

  const displayName = userData?.display_name || userData?.full_name || "Someone";

  // Get item to check quantity
  const { data: item } = await supabase
    .from("bring_list_items")
    .select("quantity_needed, quantity_claimed")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { error: "Item not found" };
  }

  const { error } = await supabase
    .from("bring_list_items")
    .update({
      claimed_by: user.id,
      claimed_by_name: displayName,
      claim_note: claimNote?.trim() || null,
      quantity_claimed: Math.min(item.quantity_claimed + 1, item.quantity_needed),
    })
    .eq("id", itemId);

  if (error) {
    console.error("Error claiming item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function unclaimItem(
  itemId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("bring_list_items")
    .update({
      claimed_by: null,
      claimed_by_name: null,
      claim_note: null,
      quantity_claimed: 0,
    })
    .eq("id", itemId);

  if (error) {
    console.error("Error unclaiming item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function suggestItem(
  listId: string,
  groupId: string,
  data: {
    itemName: string;
    categoryId?: string;
    notes?: string;
    claimIt?: boolean;
  }
): Promise<{ success?: boolean; item?: BringListItem; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get user's display name
  const { data: userData } = await supabase
    .from("users")
    .select("display_name, full_name")
    .eq("id", user.id)
    .single();

  const displayName = userData?.display_name || userData?.full_name || "Someone";

  const { data: item, error } = await supabase
    .from("bring_list_items")
    .insert({
      bring_list_id: listId,
      category_id: data.categoryId || null,
      item_name: data.itemName.trim(),
      notes: data.notes?.trim() || null,
      is_suggestion: true,
      suggestion_approved: true, // Auto-approve suggestions for now
      claimed_by: data.claimIt ? user.id : null,
      claimed_by_name: data.claimIt ? displayName : null,
      quantity_claimed: data.claimIt ? 1 : 0,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error suggesting item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, item: item as BringListItem };
}

// ============================================
// MARK ITEM AS RECEIVED
// ============================================

export async function markItemReceived(
  itemId: string,
  groupId: string,
  received: boolean
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("bring_list_items")
    .update({ is_received: received })
    .eq("id", itemId);

  if (error) {
    console.error("Error marking item received:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// REASSIGN ITEM
// ============================================

export async function reassignItem(
  itemId: string,
  groupId: string,
  newUserId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  let displayName: string | null = null;

  if (newUserId) {
    const { data: userData } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", newUserId)
      .single();

    displayName = userData?.display_name || userData?.full_name || "Someone";
  }

  const { error } = await supabase
    .from("bring_list_items")
    .update({
      claimed_by: newUserId,
      claimed_by_name: displayName,
      quantity_claimed: newUserId ? 1 : 0,
    })
    .eq("id", itemId);

  if (error) {
    console.error("Error reassigning item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// GET SUMMARY
// ============================================

export async function getBringListSummary(params: {
  eventId?: string;
  outingId?: string;
}): Promise<{
  totalItems: number;
  claimedItems: number;
  unclaimedItems: number;
  receivedItems: number;
  contributors: { userId: string; userName: string; items: string[] }[];
  stillNeeded: string[];
} | null> {
  const bringList = await getBringList(params);

  if (!bringList) return null;

  const approvedItems = bringList.items.filter((i) => i.suggestion_approved);

  const totalItems = approvedItems.length;
  const claimedItems = approvedItems.filter((i) => i.claimed_by !== null).length;
  const unclaimedItems = totalItems - claimedItems;
  const receivedItems = approvedItems.filter((i) => i.is_received).length;

  // Group by contributor
  const contributorMap = new Map<string, { userId: string; userName: string; items: string[] }>();
  approvedItems.forEach((item) => {
    if (item.claimed_by) {
      const existing = contributorMap.get(item.claimed_by);
      if (existing) {
        existing.items.push(item.item_name);
      } else {
        contributorMap.set(item.claimed_by, {
          userId: item.claimed_by,
          userName: item.claimed_by_name || "Someone",
          items: [item.item_name],
        });
      }
    }
  });

  const contributors = Array.from(contributorMap.values());
  const stillNeeded = approvedItems
    .filter((i) => !i.claimed_by)
    .map((i) => i.item_name);

  return {
    totalItems,
    claimedItems,
    unclaimedItems,
    receivedItems,
    contributors,
    stillNeeded,
  };
}
