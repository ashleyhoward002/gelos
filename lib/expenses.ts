"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import type { ExpenseSplitType, ExpenseCategory } from "./expense-constants";

export interface ExpenseGuest {
  id: string;
  group_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string | null;
  guest_id: string | null;
  amount: number;
  percentage: number | null;
  is_settled: boolean;
  settled_at: string | null;
  settled_by: string | null;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  guest?: ExpenseGuest | null;
}

export interface Expense {
  id: string;
  group_id: string;
  outing_id: string | null;
  description: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: ExpenseSplitType;
  category: ExpenseCategory;
  receipt_url: string | null;
  expense_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  payer?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  paid_by_user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  splits?: ExpenseSplit[];
}

export interface Balance {
  you_owe: number;
  you_are_owed: number;
  net_balance: number;
}

export interface MemberBalance {
  other_user_id: string;
  amount: number;
  direction: "owes_you" | "you_owe";
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Get all expenses for a group
export async function getExpenses(
  groupId: string,
  options?: {
    category?: ExpenseCategory | "all";
    settled?: "all" | "settled" | "unsettled";
    search?: string;
    outing_id?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options?.search) {
    query = query.ilike("description", `%${options.search}%`);
  }

  if (options?.outing_id) {
    query = query.eq("outing_id", options.outing_id);
  }

  const { data: expenses, error } = await query;

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  // Get payer info and splits for each expense
  const expensesWithDetails = await Promise.all(
    (expenses || []).map(async (expense) => {
      // Get payer info
      const { data: payer } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", expense.paid_by)
        .single();

      // Get splits
      const { data: splits } = await supabase
        .from("expense_splits")
        .select("*")
        .eq("expense_id", expense.id);

      // Get user info for each split
      const splitsWithUsers = await Promise.all(
        (splits || []).map(async (split) => {
          let user = null;
          let guest = null;

          if (split.user_id) {
            const { data: userData } = await supabase
              .from("users")
              .select("id, display_name, full_name, avatar_url")
              .eq("id", split.user_id)
              .single();
            user = userData;
          } else if (split.guest_id) {
            const { data: guestData } = await supabase
              .from("expense_guests")
              .select("*")
              .eq("id", split.guest_id)
              .single();
            guest = guestData;
          }

          return { ...split, user, guest };
        })
      );

      // Filter by settled status if needed
      let filteredSplits = splitsWithUsers;
      if (options?.settled === "settled") {
        filteredSplits = splitsWithUsers.filter(s => s.is_settled);
      } else if (options?.settled === "unsettled") {
        filteredSplits = splitsWithUsers.filter(s => !s.is_settled);
      }

      return {
        ...expense,
        payer,
        paid_by_user: payer,
        splits: filteredSplits,
      };
    })
  );

  // Filter out expenses with no matching splits if filtering by settled status
  if (options?.settled && options.settled !== "all") {
    return expensesWithDetails.filter(e => e.splits && e.splits.length > 0) as Expense[];
  }

  return expensesWithDetails as Expense[];
}

// Get a single expense with details
export async function getExpense(expenseId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: expense, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .single();

  if (error || !expense) {
    console.error("Error fetching expense:", error);
    return null;
  }

  // Get payer info
  const { data: payer } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", expense.paid_by)
    .single();

  // Get splits with user/guest info
  const { data: splits } = await supabase
    .from("expense_splits")
    .select("*")
    .eq("expense_id", expenseId);

  const splitsWithUsers = await Promise.all(
    (splits || []).map(async (split) => {
      let user = null;
      let guest = null;

      if (split.user_id) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, display_name, full_name, avatar_url")
          .eq("id", split.user_id)
          .single();
        user = userData;
      } else if (split.guest_id) {
        const { data: guestData } = await supabase
          .from("expense_guests")
          .select("*")
          .eq("id", split.guest_id)
          .single();
        guest = guestData;
      }

      return { ...split, user, guest };
    })
  );

  return {
    ...expense,
    payer,
    splits: splitsWithUsers,
  } as Expense;
}

// Create a new expense with splits
export async function createExpense(
  groupId: string,
  data: {
    description: string;
    amount: number;
    currency?: string;
    paid_by: string;
    split_type: ExpenseSplitType;
    category: ExpenseCategory;
    receipt_url?: string;
    expense_date?: string;
    notes?: string;
    outing_id?: string;
    splits: {
      user_id?: string;
      guest_id?: string;
      amount: number;
      percentage?: number;
    }[];
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!data.description.trim()) {
    return { error: "Description is required" };
  }

  if (data.amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  if (!data.splits || data.splits.length === 0) {
    return { error: "At least one split is required" };
  }

  // Create expense
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      outing_id: data.outing_id || null,
      description: data.description.trim(),
      amount: data.amount,
      currency: data.currency || "USD",
      paid_by: data.paid_by,
      split_type: data.split_type,
      category: data.category,
      receipt_url: data.receipt_url?.trim() || null,
      expense_date: data.expense_date || new Date().toISOString().split("T")[0],
      notes: data.notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (expenseError) {
    console.error("Error creating expense:", expenseError);
    return { error: expenseError.message };
  }

  // Create splits
  const splitInserts = data.splits.map((split) => ({
    expense_id: expense.id,
    user_id: split.user_id || null,
    guest_id: split.guest_id || null,
    amount: split.amount,
    percentage: split.percentage || null,
    is_settled: split.user_id === data.paid_by, // Auto-settle payer's own split
  }));

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splitInserts);

  if (splitsError) {
    console.error("Error creating splits:", splitsError);
    // Clean up expense if splits fail
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { error: splitsError.message };
  }

  // Create notifications for group members involved in the split
  const memberIds = data.splits
    .filter(s => s.user_id && s.user_id !== user.id)
    .map(s => s.user_id);

  if (memberIds.length > 0) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const creatorName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = memberIds.map((memberId) => ({
      user_id: memberId,
      type: "expense_added",
      title: "New Expense",
      message: `${creatorName} added "${data.description}" ($${data.amount.toFixed(2)})`,
      link: `/groups/${groupId}/expenses`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true, expense };
}

// Update an expense
export async function updateExpense(
  expenseId: string,
  groupId: string,
  data: {
    description?: string;
    amount?: number;
    currency?: string;
    paid_by?: string;
    split_type?: ExpenseSplitType;
    category?: ExpenseCategory;
    receipt_url?: string;
    expense_date?: string;
    notes?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const updateData: Record<string, unknown> = {};

  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.paid_by !== undefined) updateData.paid_by = data.paid_by;
  if (data.split_type !== undefined) updateData.split_type = data.split_type;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.receipt_url !== undefined) updateData.receipt_url = data.receipt_url.trim() || null;
  if (data.expense_date !== undefined) updateData.expense_date = data.expense_date;
  if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;

  const { error } = await supabase
    .from("expenses")
    .update(updateData)
    .eq("id", expenseId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating expense:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
  return { success: true };
}

// Upload a receipt for an expense
export async function uploadReceipt(
  expenseId: string,
  groupId: string,
  formData: FormData
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Please upload an image (JPG, PNG, WebP) or PDF." };
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File too large. Maximum size is 10MB." };
  }

  // Generate unique filename
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${groupId}/${expenseId}/${Date.now()}.${extension}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading receipt:", uploadError);
    return { error: "Failed to upload receipt" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(filename);

  const receiptUrl = urlData.publicUrl;

  // Update expense with receipt URL
  const { error: updateError } = await supabase
    .from("expenses")
    .update({ receipt_url: receiptUrl })
    .eq("id", expenseId);

  if (updateError) {
    console.error("Error updating expense with receipt:", updateError);
    return { error: "Failed to save receipt" };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
  return { success: true, receipt_url: receiptUrl };
}

// Delete a receipt from an expense
export async function deleteReceipt(expenseId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the current receipt URL
  const { data: expense } = await supabase
    .from("expenses")
    .select("receipt_url, created_by")
    .eq("id", expenseId)
    .single();

  if (!expense) {
    return { error: "Expense not found" };
  }

  if (expense.created_by !== user.id) {
    return { error: "Only the expense creator can delete the receipt" };
  }

  // Delete from storage if it's a Supabase storage URL
  if (expense.receipt_url?.includes("receipts")) {
    const path = expense.receipt_url.split("/receipts/")[1];
    if (path) {
      await supabase.storage.from("receipts").remove([path]);
    }
  }

  // Update expense to remove receipt URL
  const { error } = await supabase
    .from("expenses")
    .update({ receipt_url: null })
    .eq("id", expenseId);

  if (error) {
    console.error("Error removing receipt:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
  return { success: true };
}

// Delete an expense
export async function deleteExpense(expenseId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting expense:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true };
}

// Settle a split
export async function settleSplit(splitId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expense_splits")
    .update({
      is_settled: true,
      settled_at: new Date().toISOString(),
      settled_by: user.id,
    })
    .eq("id", splitId);

  if (error) {
    console.error("Error settling split:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true };
}

// Unsettle a split
export async function unsettleSplit(splitId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expense_splits")
    .update({
      is_settled: false,
      settled_at: null,
      settled_by: null,
    })
    .eq("id", splitId);

  if (error) {
    console.error("Error unsettling split:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true };
}

// Settle all splits between two users
export async function settleUp(groupId: string, withUserId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get all expenses in this group
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, paid_by")
    .eq("group_id", groupId);

  if (!expenses || expenses.length === 0) {
    return { success: true, count: 0 };
  }

  const expenseIds = expenses.map(e => e.id);

  // Settle splits where current user owes withUserId
  // (withUserId paid, current user has unsettled split)
  const expensesPaidByOther = expenses.filter(e => e.paid_by === withUserId).map(e => e.id);

  if (expensesPaidByOther.length > 0) {
    await supabase
      .from("expense_splits")
      .update({
        is_settled: true,
        settled_at: new Date().toISOString(),
        settled_by: user.id,
      })
      .in("expense_id", expensesPaidByOther)
      .eq("user_id", user.id)
      .eq("is_settled", false);
  }

  // Settle splits where withUserId owes current user
  // (current user paid, withUserId has unsettled split)
  const expensesPaidByMe = expenses.filter(e => e.paid_by === user.id).map(e => e.id);

  if (expensesPaidByMe.length > 0) {
    await supabase
      .from("expense_splits")
      .update({
        is_settled: true,
        settled_at: new Date().toISOString(),
        settled_by: user.id,
      })
      .in("expense_id", expensesPaidByMe)
      .eq("user_id", withUserId)
      .eq("is_settled", false);
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true };
}

// Get user balance in a group
export async function getUserBalance(groupId: string): Promise<Balance> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { you_owe: 0, you_are_owed: 0, net_balance: 0 };
  }

  const { data, error } = await supabase.rpc("get_user_balance", {
    p_group_id: groupId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error getting balance:", error);
    return { you_owe: 0, you_are_owed: 0, net_balance: 0 };
  }

  if (data && data.length > 0) {
    return {
      you_owe: Number(data[0].you_owe) || 0,
      you_are_owed: Number(data[0].you_are_owed) || 0,
      net_balance: Number(data[0].net_balance) || 0,
    };
  }

  return { you_owe: 0, you_are_owed: 0, net_balance: 0 };
}

// Get balances with individual members
export async function getMemberBalances(groupId: string): Promise<MemberBalance[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_member_balances", {
    p_group_id: groupId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error getting member balances:", error);
    return [];
  }

  // Get user info for each balance
  const balancesWithUsers = await Promise.all(
    (data || []).map(async (balance: { other_user_id: string; amount: number; direction: "owes_you" | "you_owe" }) => {
      const { data: userData } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", balance.other_user_id)
        .single();

      return {
        ...balance,
        user: userData,
      };
    })
  );

  return balancesWithUsers as MemberBalance[];
}

// Create a guest for the group
export async function createGuest(groupId: string, name: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!name.trim()) {
    return { error: "Name is required" };
  }

  const { data: guest, error } = await supabase
    .from("expense_guests")
    .insert({
      group_id: groupId,
      name: name.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating guest:", error);
    return { error: error.message };
  }

  return { success: true, guest };
}

// Get all guests for a group
export async function getGuests(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: guests, error } = await supabase
    .from("expense_guests")
    .select("*")
    .eq("group_id", groupId)
    .order("name");

  if (error) {
    console.error("Error fetching guests:", error);
    return [];
  }

  return guests as ExpenseGuest[];
}

// Delete a guest
export async function deleteGuest(guestId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expense_guests")
    .delete()
    .eq("id", guestId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting guest:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/expenses`);
  return { success: true };
}

// Send a reminder for an expense
export async function sendReminder(
  expenseId: string,
  toUserId: string,
  groupId: string,
  message?: string
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Create reminder record
  const { error: reminderError } = await supabase
    .from("expense_reminders")
    .insert({
      expense_id: expenseId,
      from_user_id: user.id,
      to_user_id: toUserId,
      message: message?.trim() || null,
    });

  if (reminderError) {
    console.error("Error creating reminder:", reminderError);
    return { error: reminderError.message };
  }

  // Get expense details for notification
  const { data: expense } = await supabase
    .from("expenses")
    .select("description, amount")
    .eq("id", expenseId)
    .single();

  // Get sender profile
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, full_name")
    .eq("id", user.id)
    .single();

  const senderName = profile?.display_name || profile?.full_name || "Someone";

  // Create notification
  await supabase.from("notifications").insert({
    user_id: toUserId,
    type: "expense_reminder",
    title: "Payment Reminder",
    message: message?.trim()
      ? `${senderName}: "${message.trim()}"`
      : `${senderName} sent you a reminder for "${expense?.description}"`,
    link: `/groups/${groupId}/expenses`,
    group_id: groupId,
  });

  return { success: true };
}

// Get group members (for split selection)
export async function getGroupMembers(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .is("left_at", null);

  if (error) {
    console.error("Error fetching members:", error);
    return [];
  }

  // Get user details for each member
  const membersWithDetails = await Promise.all(
    (members || []).map(async (member) => {
      const { data: userData } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", member.user_id)
        .single();
      return userData;
    })
  );

  return membersWithDetails.filter(Boolean);
}
