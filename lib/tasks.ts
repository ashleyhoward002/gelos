"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { TaskColumnId, TaskLabel, COLUMN_CONFIG } from "./task-constants";

// Re-export types for convenience
export type { TaskColumnId, TaskLabel };

export interface KanbanTask {
  id: string;
  outing_id: string;
  title: string;
  description: string | null;
  column_id: TaskColumnId;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string | null;
  labels: TaskLabel[];
  linked_expense_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  assigner?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  } | null;
}

export interface KanbanColumn {
  id: TaskColumnId;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

export async function getTasks(tripId: string): Promise<KanbanTask[]> {
  const supabase = await createServerSupabaseClient();

  const { data: tasks, error } = await supabase
    .from("trip_tasks")
    .select("*")
    .eq("outing_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  // Fetch user info for each task
  const tasksWithUsers = await Promise.all(
    (tasks || []).map(async (task) => {
      let assignee = null;
      let assigner = null;
      let creator = null;

      if (task.assigned_to) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name, avatar_url")
          .eq("id", task.assigned_to)
          .single();
        assignee = data;
      }

      if (task.assigned_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", task.assigned_by)
          .single();
        assigner = data;
      }

      if (task.created_by) {
        const { data } = await supabase
          .from("users")
          .select("id, display_name, full_name")
          .eq("id", task.created_by)
          .single();
        creator = data;
      }

      return {
        ...task,
        labels: task.labels || [],
        assignee,
        assigner,
        creator,
      } as KanbanTask;
    })
  );

  return tasksWithUsers;
}

export async function getTasksByColumn(tripId: string): Promise<KanbanColumn[]> {
  const tasks = await getTasks(tripId);

  return COLUMN_CONFIG.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.column_id === col.id),
  }));
}

export async function createTask(
  tripId: string,
  groupId: string,
  data: {
    title: string;
    description?: string;
    column_id?: TaskColumnId;
    assigned_to?: string;
    due_date?: string;
    labels?: TaskLabel[];
  }
): Promise<{ success?: boolean; task?: KanbanTask; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get max sort_order in the target column
  const columnId = data.column_id || "todo";
  const { data: maxOrder } = await supabase
    .from("trip_tasks")
    .select("sort_order")
    .eq("outing_id", tripId)
    .eq("column_id", columnId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data: task, error } = await supabase
    .from("trip_tasks")
    .insert({
      outing_id: tripId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      column_id: columnId,
      assigned_to: data.assigned_to || null,
      assigned_by: data.assigned_to ? user.id : null,
      due_date: data.due_date || null,
      labels: data.labels || [],
      sort_order: sortOrder,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating task:", error);
    return { error: error.message };
  }

  // Send notification if assigned to someone else
  if (data.assigned_to && data.assigned_to !== user.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const assignerName = profile?.display_name || profile?.full_name || "Someone";

    await supabase.from("notifications").insert({
      user_id: data.assigned_to,
      type: "task_assigned",
      title: "Task Assigned",
      message: `${assignerName} assigned you a task: "${data.title}"`,
      link: `/groups/${groupId}/outings/${tripId}?tab=tasks`,
      group_id: groupId,
    });
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true, task: task as KanbanTask };
}

export async function updateTask(
  taskId: string,
  groupId: string,
  tripId: string,
  data: {
    title?: string;
    description?: string;
    column_id?: TaskColumnId;
    assigned_to?: string | null;
    due_date?: string | null;
    labels?: TaskLabel[];
    linked_expense_id?: string | null;
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current task to check if assignee changed
  const { data: currentTask } = await supabase
    .from("trip_tasks")
    .select("assigned_to, title")
    .eq("id", taskId)
    .single();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.column_id !== undefined) updateData.column_id = data.column_id;
  if (data.due_date !== undefined) updateData.due_date = data.due_date || null;
  if (data.labels !== undefined) updateData.labels = data.labels;
  if (data.linked_expense_id !== undefined) updateData.linked_expense_id = data.linked_expense_id || null;

  if (data.assigned_to !== undefined) {
    updateData.assigned_to = data.assigned_to || null;
    // Update assigned_by if changing assignee
    if (data.assigned_to && data.assigned_to !== currentTask?.assigned_to) {
      updateData.assigned_by = user.id;
    }
  }

  const { error } = await supabase
    .from("trip_tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    console.error("Error updating task:", error);
    return { error: error.message };
  }

  // Send notification if assigned to new person
  if (
    data.assigned_to &&
    data.assigned_to !== currentTask?.assigned_to &&
    data.assigned_to !== user.id
  ) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const assignerName = profile?.display_name || profile?.full_name || "Someone";
    const taskTitle = data.title || currentTask?.title || "a task";

    await supabase.from("notifications").insert({
      user_id: data.assigned_to,
      type: "task_assigned",
      title: "Task Assigned",
      message: `${assignerName} assigned you a task: "${taskTitle}"`,
      link: `/groups/${groupId}/outings/${tripId}?tab=tasks`,
      group_id: groupId,
    });
  }

  // Notify when task moved to confirmed
  if (data.column_id === "confirmed" && currentTask) {
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

      const userName = profile?.display_name || profile?.full_name || "Someone";

      const notifications = members.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: "task_confirmed",
        title: "Task Confirmed",
        message: `${userName} marked "${currentTask.title}" as confirmed`,
        link: `/groups/${groupId}/outings/${tripId}?tab=tasks`,
        group_id: groupId,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

export async function deleteTask(
  taskId: string,
  groupId: string,
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("trip_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    console.error("Error deleting task:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

export async function moveTask(
  taskId: string,
  groupId: string,
  tripId: string,
  newColumnId: TaskColumnId,
  newSortOrder: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current task info
  const { data: currentTask } = await supabase
    .from("trip_tasks")
    .select("column_id, title")
    .eq("id", taskId)
    .single();

  if (!currentTask) {
    return { error: "Task not found" };
  }

  const oldColumnId = currentTask.column_id;

  // Shift tasks in target column to make room
  await supabase
    .from("trip_tasks")
    .update({ sort_order: supabase.rpc("increment_sort", { inc: 1 }) })
    .eq("outing_id", tripId)
    .eq("column_id", newColumnId)
    .gte("sort_order", newSortOrder)
    .neq("id", taskId);

  // Alternative: manual shift if rpc doesn't exist
  const { data: tasksToShift } = await supabase
    .from("trip_tasks")
    .select("id, sort_order")
    .eq("outing_id", tripId)
    .eq("column_id", newColumnId)
    .gte("sort_order", newSortOrder)
    .neq("id", taskId)
    .order("sort_order", { ascending: false });

  if (tasksToShift) {
    for (const task of tasksToShift) {
      await supabase
        .from("trip_tasks")
        .update({ sort_order: task.sort_order + 1 })
        .eq("id", task.id);
    }
  }

  // Update the moved task
  const { error } = await supabase
    .from("trip_tasks")
    .update({
      column_id: newColumnId,
      sort_order: newSortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    console.error("Error moving task:", error);
    return { error: error.message };
  }

  // Compact old column if different
  if (oldColumnId !== newColumnId) {
    const { data: oldColumnTasks } = await supabase
      .from("trip_tasks")
      .select("id")
      .eq("outing_id", tripId)
      .eq("column_id", oldColumnId)
      .order("sort_order", { ascending: true });

    if (oldColumnTasks) {
      for (let i = 0; i < oldColumnTasks.length; i++) {
        await supabase
          .from("trip_tasks")
          .update({ sort_order: i })
          .eq("id", oldColumnTasks[i].id);
      }
    }
  }

  // Notify when task moved to confirmed
  if (newColumnId === "confirmed" && oldColumnId !== "confirmed") {
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

      const userName = profile?.display_name || profile?.full_name || "Someone";

      const notifications = members.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: "task_confirmed",
        title: "Task Confirmed",
        message: `${userName} marked "${currentTask.title}" as confirmed`,
        link: `/groups/${groupId}/outings/${tripId}?tab=tasks`,
        group_id: groupId,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

export async function reorderTasks(
  tripId: string,
  groupId: string,
  columnId: TaskColumnId,
  taskIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Update sort_order for each task
  for (let i = 0; i < taskIds.length; i++) {
    const { error } = await supabase
      .from("trip_tasks")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", taskIds[i])
      .eq("outing_id", tripId)
      .eq("column_id", columnId);

    if (error) {
      console.error("Error reordering task:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}/outings/${tripId}`);
  return { success: true };
}

// Helper to get task counts by column
export async function getTaskCounts(tripId: string): Promise<Record<TaskColumnId, number>> {
  const supabase = await createServerSupabaseClient();

  const { data: tasks } = await supabase
    .from("trip_tasks")
    .select("column_id")
    .eq("outing_id", tripId);

  const counts: Record<TaskColumnId, number> = {
    "todo": 0,
    "in-progress": 0,
    "booked": 0,
    "confirmed": 0,
  };

  if (tasks) {
    for (const task of tasks) {
      const colId = task.column_id as TaskColumnId;
      if (colId in counts) {
        counts[colId]++;
      }
    }
  }

  return counts;
}
