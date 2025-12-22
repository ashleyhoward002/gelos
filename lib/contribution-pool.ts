"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export type PoolStatus = "active" | "paused" | "completed" | "cancelled";
export type ContributionStatus = "pending" | "confirmed" | "rejected" | "refunded";

export interface PaymentMethod {
  type: "venmo" | "zelle" | "paypal" | "cash" | "bank" | "other";
  handle?: string;
  enabled: boolean;
}

export interface ContributionPool {
  id: string;
  group_id: string;
  trip_id: string | null;
  title: string;
  description: string | null;
  goal_amount: number;
  current_amount: number;
  currency: string;
  deadline: string | null;
  status: PoolStatus;
  per_person_target: number | null;
  allow_custom_amounts: boolean;
  require_confirmation: boolean;
  is_private: boolean;
  payment_methods: PaymentMethod[];
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  members?: PoolMember[];
  contributions?: PoolContribution[];
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  target_amount: number | null;
  total_contributed: number;
  is_exempt: boolean;
  exempt_reason: string | null;
  joined_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PoolContribution {
  id: string;
  pool_id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  status: ContributionStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  contributed_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  confirmer?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

export interface PoolSummary {
  id: string;
  group_id: string;
  trip_id: string | null;
  title: string;
  goal_amount: number;
  current_amount: number;
  currency: string;
  deadline: string | null;
  status: PoolStatus;
  created_by: string;
  member_count: number;
  confirmed_contributions: number;
  pending_contributions: number;
  percent_complete: number;
  amount_remaining: number;
}

// ============================================
// GET POOLS
// ============================================

export async function getPools(groupId: string): Promise<ContributionPool[]> {
  const supabase = await createServerSupabaseClient();

  const { data: pools, error } = await supabase
    .from("contribution_pools")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pools:", error);
    return [];
  }

  // Get creator info for each pool
  const poolsWithCreators = await Promise.all(
    (pools || []).map(async (pool) => {
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", pool.created_by)
        .single();

      return {
        ...pool,
        creator,
      } as ContributionPool;
    })
  );

  return poolsWithCreators;
}

// ============================================
// GET POOL WITH DETAILS
// ============================================

export async function getPool(poolId: string): Promise<ContributionPool | null> {
  const supabase = await createServerSupabaseClient();

  const { data: pool, error } = await supabase
    .from("contribution_pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (error || !pool) {
    console.error("Error fetching pool:", error);
    return null;
  }

  // Get creator
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", pool.created_by)
    .single();

  // Get members with user info
  const { data: members } = await supabase
    .from("pool_members")
    .select("*")
    .eq("pool_id", poolId)
    .order("joined_at");

  const membersWithUsers = await Promise.all(
    (members || []).map(async (member) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", member.user_id)
        .single();

      return { ...member, user } as PoolMember;
    })
  );

  // Get contributions with user info
  const { data: contributions } = await supabase
    .from("pool_contributions")
    .select("*")
    .eq("pool_id", poolId)
    .order("contributed_at", { ascending: false });

  const contributionsWithUsers = await Promise.all(
    (contributions || []).map(async (contrib) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", contrib.user_id)
        .single();

      let confirmer = null;
      if (contrib.confirmed_by) {
        const { data: confirmerData } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", contrib.confirmed_by)
          .single();
        confirmer = confirmerData;
      }

      return { ...contrib, user, confirmer } as PoolContribution;
    })
  );

  return {
    ...pool,
    creator,
    members: membersWithUsers,
    contributions: contributionsWithUsers,
  } as ContributionPool;
}

// ============================================
// GET USER'S POOL PROGRESS
// ============================================

export async function getUserPoolProgress(
  poolId: string
): Promise<{ target: number; contributed: number; remaining: number } | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("pool_members")
    .select("target_amount, total_contributed")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  const target = member.target_amount || 0;
  const contributed = member.total_contributed || 0;

  return {
    target,
    contributed,
    remaining: Math.max(0, target - contributed),
  };
}

// ============================================
// CREATE POOL
// ============================================

export async function createPool(
  groupId: string,
  data: {
    title: string;
    description?: string;
    tripId?: string;
    goalAmount: number;
    currency?: string;
    deadline?: string;
    perPersonTarget?: number;
    allowCustomAmounts?: boolean;
    requireConfirmation?: boolean;
    isPrivate?: boolean;
    paymentMethods?: PaymentMethod[];
    memberIds?: string[];
  }
): Promise<{ success?: boolean; pool?: ContributionPool; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Create the pool
  const { data: pool, error } = await supabase
    .from("contribution_pools")
    .insert({
      group_id: groupId,
      trip_id: data.tripId || null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      goal_amount: data.goalAmount,
      currency: data.currency || "USD",
      deadline: data.deadline || null,
      per_person_target: data.perPersonTarget || null,
      allow_custom_amounts: data.allowCustomAmounts ?? true,
      require_confirmation: data.requireConfirmation ?? false,
      is_private: data.isPrivate ?? false,
      payment_methods: data.paymentMethods || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating pool:", error);
    return { error: error.message };
  }

  // Add additional members if specified
  if (data.memberIds && data.memberIds.length > 0) {
    const membersToAdd = data.memberIds
      .filter((id) => id !== user.id)
      .map((userId) => ({
        pool_id: pool.id,
        user_id: userId,
        target_amount: data.perPersonTarget || null,
      }));

    if (membersToAdd.length > 0) {
      await supabase.from("pool_members").insert(membersToAdd);
    }
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, pool: pool as ContributionPool };
}

// ============================================
// UPDATE POOL
// ============================================

export async function updatePool(
  poolId: string,
  groupId: string,
  data: {
    title?: string;
    description?: string;
    goalAmount?: number;
    deadline?: string | null;
    status?: PoolStatus;
    perPersonTarget?: number;
    allowCustomAmounts?: boolean;
    requireConfirmation?: boolean;
    isPrivate?: boolean;
    paymentMethods?: PaymentMethod[];
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.goalAmount !== undefined) updateData.goal_amount = data.goalAmount;
  if (data.deadline !== undefined) updateData.deadline = data.deadline;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.perPersonTarget !== undefined) updateData.per_person_target = data.perPersonTarget;
  if (data.allowCustomAmounts !== undefined) updateData.allow_custom_amounts = data.allowCustomAmounts;
  if (data.requireConfirmation !== undefined) updateData.require_confirmation = data.requireConfirmation;
  if (data.isPrivate !== undefined) updateData.is_private = data.isPrivate;
  if (data.paymentMethods !== undefined) updateData.payment_methods = data.paymentMethods;

  const { error } = await supabase
    .from("contribution_pools")
    .update(updateData)
    .eq("id", poolId);

  if (error) {
    console.error("Error updating pool:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// DELETE POOL
// ============================================

export async function deletePool(
  poolId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("contribution_pools")
    .delete()
    .eq("id", poolId);

  if (error) {
    console.error("Error deleting pool:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// ADD CONTRIBUTION
// ============================================

export async function addContribution(
  poolId: string,
  groupId: string,
  data: {
    amount: number;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
  }
): Promise<{ success?: boolean; contribution?: PoolContribution; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if pool requires confirmation
  const { data: pool } = await supabase
    .from("contribution_pools")
    .select("require_confirmation")
    .eq("id", poolId)
    .single();

  const status = pool?.require_confirmation ? "pending" : "confirmed";

  const { data: contribution, error } = await supabase
    .from("pool_contributions")
    .insert({
      pool_id: poolId,
      user_id: user.id,
      amount: data.amount,
      payment_method: data.paymentMethod || null,
      payment_reference: data.paymentReference?.trim() || null,
      notes: data.notes?.trim() || null,
      status,
      confirmed_by: !pool?.require_confirmation ? user.id : null,
      confirmed_at: !pool?.require_confirmation ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding contribution:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, contribution: contribution as PoolContribution };
}

// ============================================
// CONFIRM CONTRIBUTION
// ============================================

export async function confirmContribution(
  contributionId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("pool_contributions")
    .update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", contributionId);

  if (error) {
    console.error("Error confirming contribution:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// REJECT CONTRIBUTION
// ============================================

export async function rejectContribution(
  contributionId: string,
  groupId: string,
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("pool_contributions")
    .update({
      status: "rejected",
      rejection_reason: reason || null,
    })
    .eq("id", contributionId);

  if (error) {
    console.error("Error rejecting contribution:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// REFUND CONTRIBUTION
// ============================================

export async function refundContribution(
  contributionId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("pool_contributions")
    .update({ status: "refunded" })
    .eq("id", contributionId);

  if (error) {
    console.error("Error refunding contribution:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// ADD POOL MEMBER
// ============================================

export async function addPoolMember(
  poolId: string,
  groupId: string,
  userId: string,
  targetAmount?: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("pool_members").insert({
    pool_id: poolId,
    user_id: userId,
    target_amount: targetAmount || null,
  });

  if (error) {
    console.error("Error adding pool member:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// UPDATE MEMBER TARGET
// ============================================

export async function updateMemberTarget(
  poolId: string,
  groupId: string,
  userId: string,
  targetAmount: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("pool_members")
    .update({ target_amount: targetAmount })
    .eq("pool_id", poolId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating member target:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// EXEMPT MEMBER
// ============================================

export async function exemptMember(
  poolId: string,
  groupId: string,
  userId: string,
  exempt: boolean,
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("pool_members")
    .update({
      is_exempt: exempt,
      exempt_reason: exempt ? (reason || null) : null,
    })
    .eq("pool_id", poolId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error exempting member:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ============================================
// RECALCULATE PER-PERSON TARGETS
// ============================================

export async function recalculatePoolTargets(
  poolId: string,
  groupId: string
): Promise<{ success?: boolean; perPerson?: number; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get pool
  const { data: pool } = await supabase
    .from("contribution_pools")
    .select("goal_amount")
    .eq("id", poolId)
    .single();

  if (!pool) {
    return { error: "Pool not found" };
  }

  // Get non-exempt members
  const { data: members } = await supabase
    .from("pool_members")
    .select("id, user_id")
    .eq("pool_id", poolId)
    .eq("is_exempt", false);

  if (!members || members.length === 0) {
    return { error: "No members to split between" };
  }

  const perPerson = Math.ceil((pool.goal_amount / members.length) * 100) / 100;

  // Update pool
  await supabase
    .from("contribution_pools")
    .update({ per_person_target: perPerson })
    .eq("id", poolId);

  // Update all non-exempt members
  await supabase
    .from("pool_members")
    .update({ target_amount: perPerson })
    .eq("pool_id", poolId)
    .eq("is_exempt", false);

  revalidatePath(`/groups/${groupId}`);
  return { success: true, perPerson };
}
