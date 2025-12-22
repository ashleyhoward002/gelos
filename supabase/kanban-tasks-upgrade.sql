-- Kanban Task Board Enhancement
-- Run this in Supabase SQL Editor to upgrade the existing trip_tasks table

-- ============ ADD COLUMNS TO EXISTING TABLE ============

-- Add column_id for Kanban columns (with backwards compatibility)
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS column_id TEXT DEFAULT 'todo'
CHECK (column_id IN ('todo', 'in-progress', 'booked', 'confirmed'));

-- Migrate existing status to column_id
UPDATE trip_tasks SET column_id =
  CASE
    WHEN status = 'not_started' THEN 'todo'
    WHEN status = 'in_progress' THEN 'in-progress'
    WHEN status = 'done' THEN 'confirmed'
    ELSE 'todo'
  END
WHERE column_id IS NULL OR column_id = 'todo';

-- Add assigned_to (single assignee for simplicity)
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_by (who assigned the task)
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add labels array
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Add linked_expense_id
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS linked_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

-- Add sort_order for ordering within columns
ALTER TABLE trip_tasks
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_trip_tasks_column_id ON trip_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_assigned_to ON trip_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_labels ON trip_tasks USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_sort_order ON trip_tasks(outing_id, column_id, sort_order);

-- ============ FUNCTION: Move task and reorder ============

CREATE OR REPLACE FUNCTION move_task(
  p_task_id UUID,
  p_new_column_id TEXT,
  p_new_sort_order INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_outing_id UUID;
  v_old_column_id TEXT;
BEGIN
  -- Get current task info
  SELECT outing_id, column_id INTO v_outing_id, v_old_column_id
  FROM trip_tasks WHERE id = p_task_id;

  -- Shift tasks in the target column to make room
  UPDATE trip_tasks
  SET sort_order = sort_order + 1
  WHERE outing_id = v_outing_id
    AND column_id = p_new_column_id
    AND sort_order >= p_new_sort_order
    AND id != p_task_id;

  -- Update the task
  UPDATE trip_tasks
  SET column_id = p_new_column_id,
      sort_order = p_new_sort_order,
      updated_at = NOW()
  WHERE id = p_task_id;

  -- Compact sort orders in old column if different
  IF v_old_column_id != p_new_column_id THEN
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
      FROM trip_tasks
      WHERE outing_id = v_outing_id AND column_id = v_old_column_id
    )
    UPDATE trip_tasks t
    SET sort_order = r.new_order
    FROM ranked r
    WHERE t.id = r.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ FUNCTION: Reorder tasks in column ============

CREATE OR REPLACE FUNCTION reorder_tasks(
  p_column_id TEXT,
  p_outing_id UUID,
  p_task_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  i INTEGER := 0;
  task_id UUID;
BEGIN
  FOREACH task_id IN ARRAY p_task_ids
  LOOP
    UPDATE trip_tasks
    SET sort_order = i, updated_at = NOW()
    WHERE id = task_id AND outing_id = p_outing_id AND column_id = p_column_id;
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ COMMENT: Label values ============
-- Available labels: 'urgent', 'flights', 'hotel', 'activities', 'transport', 'food', 'admin', 'optional'
