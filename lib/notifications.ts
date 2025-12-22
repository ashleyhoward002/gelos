"use server";

import { createServerSupabaseClient } from "./supabase-server";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  group_id: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (notifications || []) as Notification[];
}

export async function getUnreadCount() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count || 0;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return { success: true };
}
