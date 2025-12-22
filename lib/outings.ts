"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export type OutingType = "outing" | "trip";
export type AttendeeStatus = "going" | "maybe" | "not_going";

export type PaymentFrequency = "monthly" | "biweekly" | "custom";

export interface Outing {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  end_date: string | null;
  outing_type: OutingType;
  budget_goal: number | null;
  budget_currency: string;
  budget_deadline: string | null;
  payment_frequency: PaymentFrequency;
  reminder_enabled: boolean;
  reminder_day: number;
  status: "upcoming" | "completed";
  cover_image_url: string | null;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  photo_count?: number;
  expense_count?: number;
  attendee_count?: number;
  total_spent?: number;
}

export interface TripAttendee {
  id: string;
  outing_id: string;
  user_id: string;
  status: AttendeeStatus;
  joined_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripBudgetSummary {
  total_spent: number;
  budget_goal: number;
  your_share: number;
  your_paid: number;
  your_balance: number;
  attendee_count: number;
}

export interface TripPayment {
  id: string;
  outing_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripSavingsSummary {
  budget_goal: number;
  total_contributed: number;
  percent_funded: number;
  attendee_count: number;
  per_person_share: number;
  days_until_deadline: number | null;
  monthly_payment_needed: number;
}

export interface TripMemberProgress {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  share_amount: number;
  total_paid: number;
  remaining: number;
  percent_paid: number;
  status: "paid_in_full" | "on_track" | "slightly_behind" | "behind";
}

export interface TripMilestone {
  id: string;
  outing_id: string;
  milestone_date: string;
  target_amount: number;
  description: string | null;
  created_at: string;
}

export type FlightType = "departure" | "return";

export interface TripFlight {
  id: string;
  outing_id: string;
  user_id: string;
  flight_type: FlightType;
  airline: string | null;
  flight_number: string | null;
  departure_city: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  confirmation_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ============ ACCOMMODATION TYPES ============
export type AccommodationType = "hotel" | "airbnb" | "house" | "other";

export interface TripAccommodation {
  id: string;
  outing_id: string;
  name: string;
  accommodation_type: AccommodationType;
  address: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  confirmation_number: string | null;
  booking_reference: string | null;
  access_code: string | null;
  access_instructions: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  map_link: string | null;
  notes: string | null;
  cost_per_night: number | null;
  total_cost: number | null;
  currency: string;
  booked_by: string | null;
  paid_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  booker?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  payer?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  rooms?: TripRoomAssignment[];
}

export interface TripRoomAssignment {
  id: string;
  accommodation_id: string;
  room_name: string;
  user_ids: string[];
  created_at: string;
  users?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

// ============ ACTIVITY/EXCURSION TYPES ============
export type ActivityStatus = "planned" | "interested" | "booked" | "completed" | "cancelled";
export type ParticipantStatus = "interested" | "in" | "out" | "maybe";

export interface TripActivity {
  id: string;
  outing_id: string;
  name: string;
  description: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  cost_per_person: number;
  total_cost: number | null;
  currency: string;
  is_group_activity: boolean;
  status: ActivityStatus;
  confirmation_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: TripActivityParticipant[];
  participant_count?: number;
}

export interface TripActivityParticipant {
  id: string;
  activity_id: string;
  user_id: string;
  status: ParticipantStatus;
  paid: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ============ ITINERARY TYPES ============
export type ItineraryItemType = "activity" | "meal" | "transport" | "accommodation" | "flight" | "free_time" | "other";
export type ItineraryItemStatus = "planned" | "booked" | "confirmed" | "optional" | "cancelled";
export type ItineraryParticipantStatus = "going" | "maybe" | "not_going";

export interface ItineraryParticipant {
  id: string;
  itinerary_item_id: string;
  user_id: string;
  status: ItineraryParticipantStatus;
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripItineraryItem {
  id: string;
  outing_id: string;
  item_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  address: string | null;
  notes: string | null;
  item_type: ItineraryItemType;
  status: ItineraryItemStatus;
  cost: number | null;
  estimated_cost: number | null;
  currency: string;
  confirmation_number: string | null;
  booking_url: string | null;
  activity_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: ItineraryParticipant[];
  participant_count?: number;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

// ============ TASK TYPES ============
export type TaskStatus = "not_started" | "in_progress" | "done";

export interface TripTask {
  id: string;
  outing_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignees?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

// ============ DOCUMENT TYPES ============
export type DocumentCategory = "flights" | "hotel" | "activities" | "insurance" | "passport" | "other";

export interface TripDocument {
  id: string;
  outing_id: string;
  user_id: string | null;
  title: string;
  file_url: string | null;
  external_url: string | null;
  category: DocumentCategory;
  is_private: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  uploader?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

// ============ PACKING LIST TYPES ============
export type PackingCategory = "clothes" | "toiletries" | "electronics" | "documents" | "misc";

export interface TripPackingItem {
  id: string;
  outing_id: string;
  user_id: string | null;
  item_name: string;
  category: PackingCategory;
  is_packed: boolean;
  is_shared: boolean;
  created_by: string;
  created_at: string;
}

export async function getOutings(groupId: string, type?: OutingType) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("outings")
    .select("*")
    .eq("group_id", groupId)
    .order("event_date", { ascending: false, nullsFirst: false });

  if (type) {
    query = query.eq("outing_type", type);
  }

  const { data: outings, error } = await query;

  if (error) {
    console.error("Error fetching outings:", error);
    return [];
  }

  // Get creator info, photo counts, expense counts, and attendee counts for each outing
  const outingsWithDetails = await Promise.all(
    (outings || []).map(async (outing) => {
      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name")
        .eq("id", outing.created_by)
        .single();

      // Get photo count
      const { count: photoCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("outing_id", outing.id);

      // Get expense count and total for trips
      let expenseCount = 0;
      let totalSpent = 0;
      if (outing.outing_type === "trip") {
        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount")
          .eq("outing_id", outing.id);

        expenseCount = expenses?.length || 0;
        totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      }

      // Get attendee count for trips
      let attendeeCount = 0;
      if (outing.outing_type === "trip") {
        const { count } = await supabase
          .from("trip_attendees")
          .select("*", { count: "exact", head: true })
          .eq("outing_id", outing.id)
          .eq("status", "going");
        attendeeCount = count || 0;
      }

      return {
        ...outing,
        creator,
        photo_count: photoCount || 0,
        expense_count: expenseCount,
        total_spent: totalSpent,
        attendee_count: attendeeCount,
      };
    })
  );

  return outingsWithDetails as Outing[];
}

export async function getOuting(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: outing, error } = await supabase
    .from("outings")
    .select("*")
    .eq("id", outingId)
    .single();

  if (error) {
    console.error("Error fetching outing:", error);
    return null;
  }

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name")
    .eq("id", outing.created_by)
    .single();

  // Get photo count
  const { count: photoCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("outing_id", outingId);

  // Get expense info for trips
  let expenseCount = 0;
  let totalSpent = 0;
  if (outing.outing_type === "trip") {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("outing_id", outingId);

    expenseCount = expenses?.length || 0;
    totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  }

  // Get attendee count for trips
  let attendeeCount = 0;
  if (outing.outing_type === "trip") {
    const { count } = await supabase
      .from("trip_attendees")
      .select("*", { count: "exact", head: true })
      .eq("outing_id", outingId)
      .eq("status", "going");
    attendeeCount = count || 0;
  }

  return {
    ...outing,
    creator,
    photo_count: photoCount || 0,
    expense_count: expenseCount,
    total_spent: totalSpent,
    attendee_count: attendeeCount,
  } as Outing;
}

export async function createOuting(
  groupId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    end_date?: string;
    outing_type?: OutingType;
    budget_goal?: number;
    budget_currency?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!data.title?.trim()) {
    return { error: "Title is required" };
  }

  const { data: outing, error } = await supabase
    .from("outings")
    .insert({
      group_id: groupId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      event_date: data.event_date || null,
      end_date: data.end_date || null,
      outing_type: data.outing_type || "outing",
      budget_goal: data.budget_goal || null,
      budget_currency: data.budget_currency || "USD",
      status: "upcoming",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating outing:", error);
    return { error: error.message };
  }

  // If it's a trip, add the creator as an attendee
  if (data.outing_type === "trip") {
    await supabase.from("trip_attendees").insert({
      outing_id: outing.id,
      user_id: user.id,
      status: "going",
    });
  }

  // Create notifications for all group members
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

    const creatorName = profile?.display_name || profile?.full_name || "Someone";
    const isTrip = data.outing_type === "trip";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: isTrip ? "trip_created" : "outing_created",
      title: isTrip ? "New Trip" : "New Outing",
      message: `${creatorName} created "${data.title}"`,
      link: `/groups/${groupId}/outings/${outing.id}`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/outings`);
  return { success: true, outing };
}

export async function updateOuting(
  outingId: string,
  groupId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    event_date?: string;
    end_date?: string;
    budget_goal?: number;
    budget_currency?: string;
    budget_deadline?: string;
    status?: "upcoming" | "completed";
    cover_image_url?: string | null;
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

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim() || null;
  if (data.location !== undefined) updateData.location = data.location.trim() || null;
  if (data.event_date !== undefined) updateData.event_date = data.event_date || null;
  if (data.end_date !== undefined) updateData.end_date = data.end_date || null;
  if (data.budget_deadline !== undefined) updateData.budget_deadline = data.budget_deadline || null;
  if (data.budget_goal !== undefined) updateData.budget_goal = data.budget_goal || null;
  if (data.budget_currency !== undefined) updateData.budget_currency = data.budget_currency;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.cover_image_url !== undefined) updateData.cover_image_url = data.cover_image_url;

  const { error } = await supabase
    .from("outings")
    .update(updateData)
    .eq("id", outingId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating outing:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings`);
  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function uploadCoverImage(
  outingId: string,
  groupId: string,
  formData: FormData
): Promise<{ success?: boolean; cover_image_url?: string; error?: string }> {
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
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." };
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File too large. Maximum size is 10MB." };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `covers/${groupId}/${outingId}-${Date.now()}.${fileExt}`;

  // Upload to storage
  const { error: uploadError, data: uploadData } = await supabase.storage
    .from("photos")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error("Error uploading cover image to storage:", {
      message: uploadError.message,
      name: uploadError.name,
      cause: uploadError.cause,
    });
    return { error: `Failed to upload image: ${uploadError.message}` };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("photos")
    .getPublicUrl(fileName);

  const coverImageUrl = urlData.publicUrl;

  // Update outing with cover image URL
  const { error: updateError, data: updateData } = await supabase
    .from("outings")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", outingId)
    .select();

  if (updateError) {
    console.error("Error updating outing cover image:", {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });
    return { error: `Failed to save cover image: ${updateError.message}` };
  }

  if (!updateData || updateData.length === 0) {
    console.error("No rows updated - outing may not exist or RLS policy blocking");
    return { error: "Failed to save cover image: Outing not found or access denied" };
  }

  revalidatePath(`/groups/${groupId}/outings`);
  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, cover_image_url: coverImageUrl };
}

export async function removeCoverImage(
  outingId: string,
  groupId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current cover image URL to delete from storage
  const { data: outing } = await supabase
    .from("outings")
    .select("cover_image_url")
    .eq("id", outingId)
    .single();

  if (outing?.cover_image_url) {
    // Extract file path from URL
    const urlParts = outing.cover_image_url.split("/photos/");
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from("photos").remove([filePath]);
    }
  }

  // Clear cover image URL
  const { error } = await supabase
    .from("outings")
    .update({ cover_image_url: null })
    .eq("id", outingId);

  if (error) {
    console.error("Error removing cover image:", error);
    return { error: "Failed to remove cover image" };
  }

  revalidatePath(`/groups/${groupId}/outings`);
  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function deleteOuting(outingId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("outings")
    .delete()
    .eq("id", outingId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting outing:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings`);
  return { success: true };
}

// Trip Attendee functions
export async function getTripAttendees(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: attendees, error } = await supabase
    .from("trip_attendees")
    .select("*")
    .eq("outing_id", outingId)
    .order("joined_at");

  if (error) {
    console.error("Error fetching attendees:", error);
    return [];
  }

  // Get user info for each attendee
  const attendeesWithUsers = await Promise.all(
    (attendees || []).map(async (attendee) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", attendee.user_id)
        .single();
      return { ...attendee, user };
    })
  );

  return attendeesWithUsers as TripAttendee[];
}

export async function updateAttendance(
  outingId: string,
  groupId: string,
  status: AttendeeStatus
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already has attendance record
  const { data: existing } = await supabase
    .from("trip_attendees")
    .select("id")
    .eq("outing_id", outingId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("trip_attendees")
      .update({ status })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating attendance:", error);
      return { error: error.message };
    }
  } else {
    // Create new
    const { error } = await supabase.from("trip_attendees").insert({
      outing_id: outingId,
      user_id: user.id,
      status,
    });

    if (error) {
      console.error("Error creating attendance:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function removeAttendance(outingId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_attendees")
    .delete()
    .eq("outing_id", outingId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing attendance:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Get trip budget summary
export async function getTripBudgetSummary(outingId: string): Promise<TripBudgetSummary | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_trip_budget_summary", {
    p_outing_id: outingId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error getting trip budget summary:", error);
    return null;
  }

  if (data && data.length > 0) {
    return {
      total_spent: Number(data[0].total_spent) || 0,
      budget_goal: Number(data[0].budget_goal) || 0,
      your_share: Number(data[0].your_share) || 0,
      your_paid: Number(data[0].your_paid) || 0,
      your_balance: Number(data[0].your_balance) || 0,
      attendee_count: Number(data[0].attendee_count) || 0,
    };
  }

  return null;
}

// Get trip-linked items
export async function getTripExpenses(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("outing_id", outingId)
    .order("expense_date", { ascending: false });

  if (error) {
    console.error("Error fetching trip expenses:", error);
    return [];
  }

  // Get payer info
  const expensesWithPayers = await Promise.all(
    (expenses || []).map(async (expense) => {
      const { data: payer } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", expense.paid_by)
        .single();
      return { ...expense, payer };
    })
  );

  return expensesWithPayers;
}

export async function getTripPolls(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .eq("outing_id", outingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trip polls:", error);
    return [];
  }

  return polls || [];
}

export async function getTripPhotos(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .eq("outing_id", outingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trip photos:", error);
    return [];
  }

  return photos || [];
}

export async function getTripEvents(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("outing_id", outingId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Error fetching trip events:", error);
    return [];
  }

  return events || [];
}

export async function getTripIdeas(outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: ideas, error } = await supabase
    .from("outing_ideas")
    .select("*")
    .eq("trip_id", outingId)
    .order("vote_count", { ascending: false });

  if (error) {
    console.error("Error fetching trip ideas:", error);
    return [];
  }

  return ideas || [];
}

export async function getOutingsForSelect(groupId: string, type?: OutingType) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("outings")
    .select("id, title, outing_type")
    .eq("group_id", groupId)
    .order("event_date", { ascending: false, nullsFirst: false });

  if (type) {
    query = query.eq("outing_type", type);
  }

  const { data: outings, error } = await query;

  if (error) {
    console.error("Error fetching outings for select:", error);
    return [];
  }

  return outings || [];
}

// ============ TRIP SAVINGS FUNCTIONS ============

// Get trip savings summary
export async function getTripSavingsSummary(outingId: string): Promise<TripSavingsSummary | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_trip_savings_summary", {
    p_outing_id: outingId,
  });

  if (error) {
    console.error("Error getting trip savings summary:", error);
    return null;
  }

  if (data && data.length > 0) {
    return {
      budget_goal: Number(data[0].budget_goal) || 0,
      total_contributed: Number(data[0].total_contributed) || 0,
      percent_funded: Number(data[0].percent_funded) || 0,
      attendee_count: Number(data[0].attendee_count) || 0,
      per_person_share: Number(data[0].per_person_share) || 0,
      days_until_deadline: data[0].days_until_deadline,
      monthly_payment_needed: Number(data[0].monthly_payment_needed) || 0,
    };
  }

  return null;
}

// Get member progress for trip savings
export async function getTripMemberProgress(outingId: string): Promise<TripMemberProgress[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_trip_member_progress", {
    p_outing_id: outingId,
  });

  if (error) {
    console.error("Error getting member progress:", error);
    return [];
  }

  return (data || []).map((row: {
    user_id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
    share_amount: number;
    total_paid: number;
    remaining: number;
    percent_paid: number;
    status: string;
  }) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    share_amount: Number(row.share_amount) || 0,
    total_paid: Number(row.total_paid) || 0,
    remaining: Number(row.remaining) || 0,
    percent_paid: Number(row.percent_paid) || 0,
    status: row.status as TripMemberProgress["status"],
  }));
}

// Get trip payments
export async function getTripPayments(outingId: string): Promise<TripPayment[]> {
  const supabase = await createServerSupabaseClient();

  const { data: payments, error } = await supabase
    .from("trip_payments")
    .select("*")
    .eq("outing_id", outingId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching trip payments:", error);
    return [];
  }

  // Get user info for each payment
  const paymentsWithUsers = await Promise.all(
    (payments || []).map(async (payment) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", payment.user_id)
        .single();
      return { ...payment, user };
    })
  );

  return paymentsWithUsers as TripPayment[];
}

// Add a trip payment
export async function addTripPayment(
  outingId: string,
  groupId: string,
  data: {
    user_id: string;
    amount: number;
    payment_date?: string;
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

  if (data.amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  const { data: payment, error } = await supabase
    .from("trip_payments")
    .insert({
      outing_id: outingId,
      user_id: data.user_id,
      amount: data.amount,
      payment_date: data.payment_date || new Date().toISOString().split("T")[0],
      notes: data.notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding payment:", error);
    return { error: error.message };
  }

  // Notify trip creator if someone else logged the payment
  const { data: outing } = await supabase
    .from("outings")
    .select("created_by, title")
    .eq("id", outingId)
    .single();

  if (outing && outing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", data.user_id)
      .single();

    const payerName = profile?.display_name || profile?.full_name || "Someone";

    await supabase.from("notifications").insert({
      user_id: outing.created_by,
      type: "trip_payment",
      title: "Trip Payment",
      message: `${payerName} contributed $${data.amount.toFixed(2)} to "${outing.title}"`,
      link: `/groups/${groupId}/outings/${outingId}`,
      group_id: groupId,
    });
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, payment };
}

// Delete a trip payment
export async function deleteTripPayment(paymentId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_payments")
    .delete()
    .eq("id", paymentId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting payment:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Get trip milestones
export async function getTripMilestones(outingId: string): Promise<TripMilestone[]> {
  const supabase = await createServerSupabaseClient();

  const { data: milestones, error } = await supabase
    .from("trip_milestones")
    .select("*")
    .eq("outing_id", outingId)
    .order("milestone_date", { ascending: true });

  if (error) {
    console.error("Error fetching milestones:", error);
    return [];
  }

  return milestones as TripMilestone[];
}

// Generate milestones based on payment frequency
export async function generateTripMilestones(
  outingId: string,
  groupId: string
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get outing details
  const { data: outing, error: outingError } = await supabase
    .from("outings")
    .select("budget_goal, budget_deadline, payment_frequency, created_at, created_by")
    .eq("id", outingId)
    .single();

  if (outingError || !outing) {
    return { error: "Outing not found" };
  }

  if (outing.created_by !== user.id) {
    return { error: "Only the trip creator can generate milestones" };
  }

  if (!outing.budget_goal || !outing.budget_deadline) {
    return { error: "Budget goal and deadline are required" };
  }

  // Delete existing milestones
  await supabase.from("trip_milestones").delete().eq("outing_id", outingId);

  // Generate new milestones
  const startDate = new Date(outing.created_at);
  const endDate = new Date(outing.budget_deadline);
  const milestones: { outing_id: string; milestone_date: string; target_amount: number; description: string }[] = [];

  let currentDate = new Date(startDate);
  let milestoneCount = 0;

  while (currentDate < endDate) {
    if (outing.payment_frequency === "monthly") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (outing.payment_frequency === "biweekly") {
      currentDate.setDate(currentDate.getDate() + 14);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (currentDate <= endDate) {
      milestoneCount++;
    }
  }

  // Reset and create milestones with cumulative targets
  currentDate = new Date(startDate);
  let milestoneIndex = 0;

  while (currentDate < endDate) {
    if (outing.payment_frequency === "monthly") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (outing.payment_frequency === "biweekly") {
      currentDate.setDate(currentDate.getDate() + 14);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (currentDate <= endDate) {
      milestoneIndex++;
      const targetAmount = (outing.budget_goal / milestoneCount) * milestoneIndex;

      milestones.push({
        outing_id: outingId,
        milestone_date: currentDate.toISOString().split("T")[0],
        target_amount: Math.round(targetAmount * 100) / 100,
        description: `${outing.payment_frequency === "biweekly" ? "Bi-weekly" : "Monthly"} target #${milestoneIndex}`,
      });
    }
  }

  if (milestones.length > 0) {
    const { error: insertError } = await supabase
      .from("trip_milestones")
      .insert(milestones);

    if (insertError) {
      console.error("Error creating milestones:", insertError);
      return { error: insertError.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, count: milestones.length };
}

// Update trip savings settings
export async function updateTripSavingsSettings(
  outingId: string,
  groupId: string,
  data: {
    budget_deadline?: string;
    payment_frequency?: PaymentFrequency;
    reminder_enabled?: boolean;
    reminder_day?: number;
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

  if (data.budget_deadline !== undefined) updateData.budget_deadline = data.budget_deadline || null;
  if (data.payment_frequency !== undefined) updateData.payment_frequency = data.payment_frequency;
  if (data.reminder_enabled !== undefined) updateData.reminder_enabled = data.reminder_enabled;
  if (data.reminder_day !== undefined) updateData.reminder_day = data.reminder_day;

  const { error } = await supabase
    .from("outings")
    .update(updateData)
    .eq("id", outingId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating savings settings:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ TRIP FLIGHTS FUNCTIONS ============

// Get all flights for a trip
export async function getTripFlights(outingId: string): Promise<TripFlight[]> {
  const supabase = await createServerSupabaseClient();

  const { data: flights, error } = await supabase
    .from("trip_flights")
    .select("*")
    .eq("outing_id", outingId)
    .order("departure_time", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching trip flights:", error);
    return [];
  }

  // Get user info for each flight
  const flightsWithUsers = await Promise.all(
    (flights || []).map(async (flight) => {
      const { data: user } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", flight.user_id)
        .single();
      return { ...flight, user };
    })
  );

  return flightsWithUsers as TripFlight[];
}

// Get flights for a specific user
export async function getUserTripFlights(outingId: string, userId: string): Promise<TripFlight[]> {
  const supabase = await createServerSupabaseClient();

  const { data: flights, error } = await supabase
    .from("trip_flights")
    .select("*")
    .eq("outing_id", outingId)
    .eq("user_id", userId)
    .order("flight_type");

  if (error) {
    console.error("Error fetching user trip flights:", error);
    return [];
  }

  return flights as TripFlight[];
}

// Add or update a trip flight
export async function saveTripFlight(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    flight_type: FlightType;
    airline?: string;
    flight_number?: string;
    departure_city?: string;
    departure_time?: string;
    arrival_time?: string;
    confirmation_number?: string;
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

  const flightData = {
    outing_id: outingId,
    user_id: user.id,
    flight_type: data.flight_type,
    airline: data.airline?.trim() || null,
    flight_number: data.flight_number?.trim() || null,
    departure_city: data.departure_city?.trim() || null,
    departure_time: data.departure_time || null,
    arrival_time: data.arrival_time || null,
    confirmation_number: data.confirmation_number?.trim() || null,
    notes: data.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (data.id) {
    // Update existing flight
    const { data: flight, error } = await supabase
      .from("trip_flights")
      .update(flightData)
      .eq("id", data.id)
      .eq("user_id", user.id) // Ensure user owns this flight
      .select()
      .single();

    if (error) {
      console.error("Error updating flight:", error);
      return { error: error.message };
    }
    result = flight;
  } else {
    // Insert new flight
    const { data: flight, error } = await supabase
      .from("trip_flights")
      .insert(flightData)
      .select()
      .single();

    if (error) {
      console.error("Error creating flight:", error);
      return { error: error.message };
    }
    result = flight;
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, flight: result };
}

// Delete a trip flight
export async function deleteTripFlight(flightId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_flights")
    .delete()
    .eq("id", flightId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting flight:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ ACCOMMODATION FUNCTIONS ============

export async function getTripAccommodations(outingId: string): Promise<TripAccommodation[]> {
  const supabase = await createServerSupabaseClient();

  const { data: accommodations, error } = await supabase
    .from("trip_accommodations")
    .select("*")
    .eq("outing_id", outingId)
    .order("check_in_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching accommodations:", error);
    return [];
  }

  // Get booker info, payer info, and room assignments for each
  const accommodationsWithDetails = await Promise.all(
    (accommodations || []).map(async (acc) => {
      let booker = null;
      if (acc.booked_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", acc.booked_by)
          .single();
        booker = data;
      }

      let payer = null;
      if (acc.paid_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", acc.paid_by)
          .single();
        payer = data;
      }

      // Get room assignments
      const { data: rooms } = await supabase
        .from("trip_room_assignments")
        .select("*")
        .eq("accommodation_id", acc.id);

      // Get user details for each room
      const roomsWithUsers = await Promise.all(
        (rooms || []).map(async (room) => {
          const users = await Promise.all(
            (room.user_ids || []).map(async (userId: string) => {
              const { data } = await supabase
                .from("users")
                .select("id, display_name, full_name, avatar_url")
                .eq("id", userId)
                .single();
              return data;
            })
          );
          return { ...room, users: users.filter(Boolean) };
        })
      );

      return { ...acc, booker, payer, rooms: roomsWithUsers };
    })
  );

  return accommodationsWithDetails as TripAccommodation[];
}

export async function saveTripAccommodation(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    name: string;
    accommodation_type?: AccommodationType;
    address?: string;
    check_in_date?: string;
    check_in_time?: string;
    check_out_date?: string;
    check_out_time?: string;
    confirmation_number?: string;
    booking_reference?: string;
    access_code?: string;
    access_instructions?: string;
    contact_phone?: string;
    contact_email?: string;
    map_link?: string;
    notes?: string;
    cost_per_night?: number;
    total_cost?: number;
    currency?: string;
    booked_by?: string;
    paid_by?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const accData = {
    outing_id: outingId,
    name: data.name.trim(),
    accommodation_type: data.accommodation_type || "hotel",
    address: data.address?.trim() || null,
    check_in_date: data.check_in_date || null,
    check_in_time: data.check_in_time || null,
    check_out_date: data.check_out_date || null,
    check_out_time: data.check_out_time || null,
    confirmation_number: data.confirmation_number?.trim() || null,
    booking_reference: data.booking_reference?.trim() || null,
    access_code: data.access_code?.trim() || null,
    access_instructions: data.access_instructions?.trim() || null,
    contact_phone: data.contact_phone?.trim() || null,
    contact_email: data.contact_email?.trim() || null,
    map_link: data.map_link?.trim() || null,
    notes: data.notes?.trim() || null,
    cost_per_night: data.cost_per_night || null,
    total_cost: data.total_cost || null,
    currency: data.currency || "USD",
    booked_by: data.booked_by || null,
    paid_by: data.paid_by || null,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (data.id) {
    const { data: acc, error } = await supabase
      .from("trip_accommodations")
      .update(accData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating accommodation:", error);
      return { error: error.message };
    }
    result = acc;
  } else {
    const { data: acc, error } = await supabase
      .from("trip_accommodations")
      .insert({ ...accData, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating accommodation:", error);
      return { error: error.message };
    }
    result = acc;
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, accommodation: result };
}

export async function deleteTripAccommodation(accommodationId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_accommodations")
    .delete()
    .eq("id", accommodationId);

  if (error) {
    console.error("Error deleting accommodation:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function saveRoomAssignment(
  accommodationId: string,
  groupId: string,
  outingId: string,
  data: {
    id?: string;
    room_name: string;
    user_ids: string[];
  }
) {
  const supabase = await createServerSupabaseClient();

  if (data.id) {
    const { error } = await supabase
      .from("trip_room_assignments")
      .update({ room_name: data.room_name, user_ids: data.user_ids })
      .eq("id", data.id);

    if (error) {
      console.error("Error updating room assignment:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_room_assignments")
      .insert({
        accommodation_id: accommodationId,
        room_name: data.room_name,
        user_ids: data.user_ids,
      });

    if (error) {
      console.error("Error creating room assignment:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function deleteRoomAssignment(roomId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_room_assignments")
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room assignment:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ ACTIVITY/EXCURSION FUNCTIONS ============

export async function getTripActivities(outingId: string): Promise<TripActivity[]> {
  const supabase = await createServerSupabaseClient();

  const { data: activities, error } = await supabase
    .from("trip_activities")
    .select("*")
    .eq("outing_id", outingId)
    .order("activity_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }

  // Get participants for each activity
  const activitiesWithParticipants = await Promise.all(
    (activities || []).map(async (activity) => {
      const { data: participants } = await supabase
        .from("trip_activity_participants")
        .select("*")
        .eq("activity_id", activity.id);

      const participantsWithUsers = await Promise.all(
        (participants || []).map(async (p) => {
          const { data: user } = await supabase
            .from("users")
            .select("id, display_name, full_name, avatar_url")
            .eq("id", p.user_id)
            .single();
          return { ...p, user };
        })
      );

      return {
        ...activity,
        participants: participantsWithUsers,
        participant_count: participantsWithUsers.filter((p) => p.status === "in").length,
      };
    })
  );

  return activitiesWithParticipants as TripActivity[];
}

export async function saveTripActivity(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    name: string;
    description?: string;
    activity_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    cost_per_person?: number;
    total_cost?: number;
    currency?: string;
    is_group_activity?: boolean;
    status?: ActivityStatus;
    confirmation_number?: string;
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

  const activityData = {
    outing_id: outingId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    activity_date: data.activity_date || null,
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    location: data.location?.trim() || null,
    cost_per_person: data.cost_per_person || 0,
    total_cost: data.total_cost || null,
    currency: data.currency || "USD",
    is_group_activity: data.is_group_activity || false,
    status: data.status || "planned",
    confirmation_number: data.confirmation_number?.trim() || null,
    notes: data.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (data.id) {
    const { data: activity, error } = await supabase
      .from("trip_activities")
      .update(activityData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating activity:", error);
      return { error: error.message };
    }
    result = activity;
  } else {
    const { data: activity, error } = await supabase
      .from("trip_activities")
      .insert({ ...activityData, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      return { error: error.message };
    }
    result = activity;
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, activity: result };
}

export async function deleteTripActivity(activityId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_activities")
    .delete()
    .eq("id", activityId);

  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function updateActivityParticipation(
  activityId: string,
  groupId: string,
  outingId: string,
  status: ParticipantStatus
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("trip_activity_participants")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("trip_activity_participants")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating participation:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_activity_participants")
      .insert({ activity_id: activityId, user_id: user.id, status });

    if (error) {
      console.error("Error creating participation:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ ITINERARY FUNCTIONS ============

export async function getTripItinerary(outingId: string): Promise<TripItineraryItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: items, error } = await supabase
    .from("trip_itinerary_items")
    .select("*")
    .eq("outing_id", outingId)
    .order("item_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching itinerary:", error);
    return [];
  }

  // Fetch participants and creator for each item
  const itemsWithDetails = await Promise.all(
    (items || []).map(async (item) => {
      // Get participants
      const { data: participants } = await supabase
        .from("trip_itinerary_participants")
        .select("*")
        .eq("itinerary_item_id", item.id);

      const participantsWithUsers = await Promise.all(
        (participants || []).map(async (p) => {
          const { data: user } = await supabase
            .from("users")
            .select("id, display_name, full_name, avatar_url")
            .eq("id", p.user_id)
            .single();
          return { ...p, user };
        })
      );

      // Get creator
      let creator = null;
      if (item.created_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", item.created_by)
          .single();
        creator = data;
      }

      return {
        ...item,
        participants: participantsWithUsers,
        participant_count: participantsWithUsers.filter((p) => p.status === "going").length,
        creator,
      };
    })
  );

  return itemsWithDetails as TripItineraryItem[];
}

export async function saveTripItineraryItem(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    item_date: string;
    start_time?: string;
    end_time?: string;
    title: string;
    location?: string;
    address?: string;
    notes?: string;
    item_type?: ItineraryItemType;
    status?: ItineraryItemStatus;
    cost?: number;
    estimated_cost?: number;
    currency?: string;
    confirmation_number?: string;
    booking_url?: string;
    activity_id?: string;
    sort_order?: number;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get max sort_order for the date if not provided
  let sortOrder = data.sort_order;
  if (sortOrder === undefined && !data.id) {
    const { data: maxOrder } = await supabase
      .from("trip_itinerary_items")
      .select("sort_order")
      .eq("outing_id", outingId)
      .eq("item_date", data.item_date)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    sortOrder = (maxOrder?.sort_order ?? -1) + 1;
  }

  const itemData = {
    outing_id: outingId,
    item_date: data.item_date,
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    title: data.title.trim(),
    location: data.location?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
    item_type: data.item_type || "activity",
    status: data.status || "planned",
    cost: data.cost || null,
    estimated_cost: data.estimated_cost || null,
    currency: data.currency || "USD",
    confirmation_number: data.confirmation_number?.trim() || null,
    booking_url: data.booking_url?.trim() || null,
    activity_id: data.activity_id || null,
    sort_order: sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (data.id) {
    const { data: item, error } = await supabase
      .from("trip_itinerary_items")
      .update(itemData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating itinerary item:", error);
      return { error: error.message };
    }
    result = item;
  } else {
    const { data: item, error } = await supabase
      .from("trip_itinerary_items")
      .insert({ ...itemData, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating itinerary item:", error);
      return { error: error.message };
    }
    result = item;
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, item: result };
}

export async function deleteTripItineraryItem(itemId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_itinerary_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting itinerary item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Update itinerary participation
export async function updateItineraryParticipation(
  itemId: string,
  groupId: string,
  outingId: string,
  status: ItineraryParticipantStatus
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("trip_itinerary_participants")
    .select("id")
    .eq("itinerary_item_id", itemId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("trip_itinerary_participants")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating itinerary participation:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_itinerary_participants")
      .insert({
        itinerary_item_id: itemId,
        user_id: user.id,
        status,
      });

    if (error) {
      console.error("Error creating itinerary participation:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Remove itinerary participation
export async function removeItineraryParticipation(
  itemId: string,
  groupId: string,
  outingId: string
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_itinerary_participants")
    .delete()
    .eq("itinerary_item_id", itemId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing itinerary participation:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Reorder itinerary items within a day
export async function reorderItineraryItems(
  outingId: string,
  groupId: string,
  itemDate: string,
  itemIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Update sort_order for each item
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from("trip_itinerary_items")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", itemIds[i])
      .eq("outing_id", outingId)
      .eq("item_date", itemDate);

    if (error) {
      console.error("Error reordering itinerary item:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Move itinerary item to a different day
export async function moveItineraryItem(
  itemId: string,
  groupId: string,
  outingId: string,
  newDate: string,
  newSortOrder?: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get max sort_order for the new date if not provided
  let sortOrder = newSortOrder;
  if (sortOrder === undefined) {
    const { data: maxOrder } = await supabase
      .from("trip_itinerary_items")
      .select("sort_order")
      .eq("outing_id", outingId)
      .eq("item_date", newDate)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    sortOrder = (maxOrder?.sort_order ?? -1) + 1;
  }

  const { error } = await supabase
    .from("trip_itinerary_items")
    .update({
      item_date: newDate,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    console.error("Error moving itinerary item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// Duplicate an itinerary item
export async function duplicateItineraryItem(
  itemId: string,
  groupId: string,
  outingId: string,
  targetDate?: string
): Promise<{ success?: boolean; item?: TripItineraryItem; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get original item
  const { data: original, error: fetchError } = await supabase
    .from("trip_itinerary_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchError || !original) {
    return { error: "Item not found" };
  }

  const newDate = targetDate || original.item_date;

  // Get max sort_order for the date
  const { data: maxOrder } = await supabase
    .from("trip_itinerary_items")
    .select("sort_order")
    .eq("outing_id", outingId)
    .eq("item_date", newDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: newItem, error: insertError } = await supabase
    .from("trip_itinerary_items")
    .insert({
      outing_id: outingId,
      item_date: newDate,
      start_time: original.start_time,
      end_time: original.end_time,
      title: `${original.title} (copy)`,
      location: original.location,
      address: original.address,
      notes: original.notes,
      item_type: original.item_type,
      status: "planned", // Reset status
      cost: original.cost,
      estimated_cost: original.estimated_cost,
      currency: original.currency,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error duplicating itinerary item:", insertError);
    return { error: insertError.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true, item: newItem as TripItineraryItem };
}

// ============ TASK FUNCTIONS ============

export async function getTripTasks(outingId: string): Promise<TripTask[]> {
  const supabase = await createServerSupabaseClient();

  const { data: tasks, error } = await supabase
    .from("trip_tasks")
    .select("*")
    .eq("outing_id", outingId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  // Get assignees for each task
  const tasksWithAssignees = await Promise.all(
    (tasks || []).map(async (task) => {
      const { data: assignments } = await supabase
        .from("trip_task_assignments")
        .select("user_id")
        .eq("task_id", task.id);

      const assignees = await Promise.all(
        (assignments || []).map(async (a) => {
          const { data: user } = await supabase
            .from("users")
            .select("id, display_name, full_name, avatar_url")
            .eq("id", a.user_id)
            .single();
          return user;
        })
      );

      return { ...task, assignees: assignees.filter(Boolean) };
    })
  );

  return tasksWithAssignees as TripTask[];
}

export async function saveTripTask(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    title: string;
    description?: string;
    due_date?: string;
    status?: TaskStatus;
    assignee_ids?: string[];
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const taskData = {
    outing_id: outingId,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    due_date: data.due_date || null,
    status: data.status || "not_started",
    updated_at: new Date().toISOString(),
    completed_at: data.status === "done" ? new Date().toISOString() : null,
  };

  let taskId: string;

  if (data.id) {
    const { data: task, error } = await supabase
      .from("trip_tasks")
      .update(taskData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return { error: error.message };
    }
    taskId = task.id;
  } else {
    const { data: task, error } = await supabase
      .from("trip_tasks")
      .insert({ ...taskData, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return { error: error.message };
    }
    taskId = task.id;
  }

  // Update assignees
  if (data.assignee_ids !== undefined) {
    // Delete existing assignments
    await supabase
      .from("trip_task_assignments")
      .delete()
      .eq("task_id", taskId);

    // Insert new assignments
    if (data.assignee_ids.length > 0) {
      const assignments = data.assignee_ids.map((userId) => ({
        task_id: taskId,
        user_id: userId,
      }));

      await supabase
        .from("trip_task_assignments")
        .insert(assignments);
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function updateTaskStatus(
  taskId: string,
  groupId: string,
  outingId: string,
  status: TaskStatus
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) {
    console.error("Error updating task status:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function deleteTripTask(taskId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    console.error("Error deleting task:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ DOCUMENT FUNCTIONS ============

export async function getTripDocuments(outingId: string): Promise<TripDocument[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: docs, error } = await supabase
    .from("trip_documents")
    .select("*")
    .eq("outing_id", outingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  // Filter: show shared docs + own private docs
  const filteredDocs = (docs || []).filter(
    (doc) => !doc.is_private || doc.created_by === user?.id
  );

  // Get uploader info
  const docsWithUploaders = await Promise.all(
    filteredDocs.map(async (doc) => {
      const { data: uploader } = await supabase
        .from("users")
        .select("id, display_name, full_name")
        .eq("id", doc.created_by)
        .single();
      return { ...doc, uploader };
    })
  );

  return docsWithUploaders as TripDocument[];
}

export async function saveTripDocument(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    title: string;
    file_url?: string;
    external_url?: string;
    category?: DocumentCategory;
    is_private?: boolean;
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

  const docData = {
    outing_id: outingId,
    user_id: data.is_private ? user.id : null,
    title: data.title.trim(),
    file_url: data.file_url || null,
    external_url: data.external_url?.trim() || null,
    category: data.category || "other",
    is_private: data.is_private || false,
    notes: data.notes?.trim() || null,
  };

  if (data.id) {
    const { error } = await supabase
      .from("trip_documents")
      .update(docData)
      .eq("id", data.id)
      .eq("created_by", user.id);

    if (error) {
      console.error("Error updating document:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_documents")
      .insert({ ...docData, created_by: user.id });

    if (error) {
      console.error("Error creating document:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function deleteTripDocument(docId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_documents")
    .delete()
    .eq("id", docId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting document:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

// ============ PACKING LIST FUNCTIONS ============

export async function getTripPackingItems(outingId: string): Promise<{
  shared: TripPackingItem[];
  personal: TripPackingItem[];
}> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items, error } = await supabase
    .from("trip_packing_items")
    .select("*")
    .eq("outing_id", outingId)
    .order("category")
    .order("item_name");

  if (error) {
    console.error("Error fetching packing items:", error);
    return { shared: [], personal: [] };
  }

  const shared = (items || []).filter((item) => item.is_shared);
  const personal = (items || []).filter(
    (item) => !item.is_shared && item.user_id === user?.id
  );

  return { shared, personal };
}

export async function saveTripPackingItem(
  outingId: string,
  groupId: string,
  data: {
    id?: string;
    item_name: string;
    category?: PackingCategory;
    is_shared?: boolean;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (data.id) {
    const { error } = await supabase
      .from("trip_packing_items")
      .update({
        item_name: data.item_name.trim(),
        category: data.category || "misc",
      })
      .eq("id", data.id);

    if (error) {
      console.error("Error updating packing item:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("trip_packing_items")
      .insert({
        outing_id: outingId,
        user_id: data.is_shared ? null : user.id,
        item_name: data.item_name.trim(),
        category: data.category || "misc",
        is_shared: data.is_shared || false,
        created_by: user.id,
      });

    if (error) {
      console.error("Error creating packing item:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function togglePackingItemPacked(
  itemId: string,
  groupId: string,
  outingId: string,
  isPacked: boolean
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_items")
    .update({ is_packed: isPacked })
    .eq("id", itemId);

  if (error) {
    console.error("Error toggling packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}

export async function deleteTripPackingItem(itemId: string, groupId: string, outingId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("trip_packing_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting packing item:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${outingId}`);
  return { success: true };
}
