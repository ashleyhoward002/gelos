"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export interface CalendarEvent {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  event_type: string;
  created_by: string;
  created_at: string;
}

export interface BirthdayEvent {
  id: string;
  name: string;
  date: string;
  type: "member" | "family";
  relationship?: string;
}

export async function getCalendarEvents(groupId: string, year: number, month: number) {
  const supabase = await createServerSupabaseClient();

  // Get start and end of month
  const startDate = new Date(year, month, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("group_id", groupId)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date")
    .order("event_time");

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return events as CalendarEvent[];
}

export async function getBirthdays(groupId: string, month: number) {
  const supabase = await createServerSupabaseClient();

  // Get group settings
  const { data: group } = await supabase
    .from("groups")
    .select("show_member_birthdays, show_family_birthdays")
    .eq("id", groupId)
    .single();

  if (!group) return [];

  const birthdays: BirthdayEvent[] = [];

  // Get group members
  const { data: members } = await supabase
    .from("group_members")
    .select(`
      user:users (
        id,
        display_name,
        full_name,
        birthday,
        share_birthday
      )
    `)
    .eq("group_id", groupId)
    .is("left_at", null);

  if (group.show_member_birthdays && members) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members.forEach((member: any) => {
      const user = member.user;
      if (user?.birthday && user.share_birthday) {
        const birthdayDate = new Date(user.birthday + "T00:00:00");
        if (birthdayDate.getMonth() === month) {
          birthdays.push({
            id: `member-${user.id}`,
            name: user.display_name || user.full_name || "Member",
            date: user.birthday,
            type: "member",
          });
        }
      }
    });
  }

  // Get family birthdays
  if (group.show_family_birthdays && members) {
    for (const member of members) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = (member as any).user;
      if (!user) continue;

      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id);

      if (familyMembers) {
        familyMembers.forEach((fm: { id: string; name: string; birthday: string; relationship: string }) => {
          const birthdayDate = new Date(fm.birthday + "T00:00:00");
          if (birthdayDate.getMonth() === month) {
            birthdays.push({
              id: `family-${fm.id}`,
              name: fm.name,
              date: fm.birthday,
              type: "family",
              relationship: fm.relationship,
            });
          }
        });
      }
    }
  }

  return birthdays;
}

export async function createEvent(groupId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const eventDate = formData.get("eventDate") as string;
  const eventTime = formData.get("eventTime") as string;
  const endTime = formData.get("endTime") as string;
  const location = formData.get("location") as string;

  if (!title || !eventDate) {
    return { error: "Title and date are required" };
  }

  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      group_id: groupId,
      title: title.trim(),
      description: description?.trim() || null,
      event_date: eventDate,
      event_time: eventTime || null,
      end_time: endTime || null,
      location: location?.trim() || null,
      event_type: "event",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    return { error: error.message };
  }

  // Create notifications for all group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .is("left_at", null)
    .neq("user_id", user.id);

  if (members) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const creatorName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: "event_created",
      title: "New Event",
      message: `${creatorName} created "${title}"`,
      link: `/groups/${groupId}/calendar`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/calendar`);
  return { success: true, event };
}

export async function deleteEvent(eventId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting event:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/calendar`);
  return { success: true };
}

export async function updateGroupBirthdaySettings(
  groupId: string,
  showMemberBirthdays: boolean,
  showFamilyBirthdays: boolean
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("groups")
    .update({
      show_member_birthdays: showMemberBirthdays,
      show_family_birthdays: showFamilyBirthdays,
    })
    .eq("id", groupId);

  if (error) {
    console.error("Error updating birthday settings:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/calendar`);
  return { success: true };
}
