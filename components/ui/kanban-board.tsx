"use client";

import { useState, useRef, DragEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { KanbanTask, KanbanColumn } from "@/lib/tasks";
import {
  TaskColumnId,
  TaskLabel,
  LABEL_CONFIG,
  COLUMN_CONFIG,
} from "@/lib/task-constants";

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onTaskMove: (
    taskId: string,
    fromColumnId: TaskColumnId,
    toColumnId: TaskColumnId,
    newIndex: number
  ) => void;
  onTaskClick: (task: KanbanTask) => void;
  onTaskAdd: (columnId: TaskColumnId, title: string) => void;
  currentUserId: string;
}

interface TaskCardProps {
  task: KanbanTask;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
}

function TaskCard({ task, onClick, onDragStart, isDragging }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const assigneeName =
    task.assignee?.display_name || task.assignee?.full_name || null;
  const assigneeInitial = assigneeName?.charAt(0).toUpperCase() || "?";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? "shadow-lg opacity-50 rotate-2 scale-102" : ""
      }`}
      style={{
        transform: isDragging ? "rotate(3deg) scale(1.02)" : undefined,
      }}
    >
      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((labelId) => {
            const label = LABEL_CONFIG.find((l) => l.id === labelId);
            if (!label) return null;
            return (
              <span
                key={labelId}
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.icon} {label.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-slate-dark line-clamp-2 mb-2">
        {task.title}
      </p>

      {/* Footer: Due date and assignee */}
      <div className="flex items-center justify-between text-xs">
        {task.due_date ? (
          <span
            className={`flex items-center gap-1 ${
              isOverdue ? "text-red-500 font-medium" : "text-slate-medium"
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {new Date(task.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span />
        )}

        {assigneeName && (
          <div className="flex items-center gap-1" title={assigneeName}>
            {task.assignee?.avatar_url ? (
              <img
                src={task.assignee.avatar_url}
                alt={assigneeName}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full bg-neon-purple/20 text-neon-purple flex items-center justify-center text-xs font-medium"
              >
                {assigneeInitial}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ColumnProps {
  column: KanbanColumn;
  onTaskMove: KanbanBoardProps["onTaskMove"];
  onTaskClick: KanbanBoardProps["onTaskClick"];
  onTaskAdd: KanbanBoardProps["onTaskAdd"];
  draggedTask: { taskId: string; fromColumnId: TaskColumnId } | null;
  setDraggedTask: (task: { taskId: string; fromColumnId: TaskColumnId } | null) => void;
  dragOverColumn: TaskColumnId | null;
  setDragOverColumn: (columnId: TaskColumnId | null) => void;
  dropIndex: number;
  setDropIndex: (index: number) => void;
}

function Column({
  column,
  onTaskMove,
  onTaskClick,
  onTaskAdd,
  draggedTask,
  setDraggedTask,
  dragOverColumn,
  setDragOverColumn,
  dropIndex,
  setDropIndex,
}: ColumnProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverColumn(column.id);

    // Calculate drop index based on mouse position
    if (columnRef.current) {
      const cards = columnRef.current.querySelectorAll("[data-task-id]");
      let newIndex = column.tasks.length;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY && newIndex === column.tasks.length) {
          newIndex = index;
        }
      });

      setDropIndex(newIndex);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely
    const rect = columnRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedTask) {
      onTaskMove(
        draggedTask.taskId,
        draggedTask.fromColumnId,
        column.id,
        dropIndex
      );
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onTaskAdd(column.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setShowAddInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    } else if (e.key === "Escape") {
      setNewTaskTitle("");
      setShowAddInput(false);
    }
  };

  const isDropTarget = dragOverColumn === column.id && draggedTask;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] w-full">
      {/* Column Header */}
      <div
        className="flex items-center gap-2 mb-3 px-2"
        style={{ color: column.color }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="font-heading font-bold text-slate-dark">{column.title}</h3>
        <span className="text-sm text-slate-medium ml-1">
          {column.tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={columnRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors ${
          isDropTarget
            ? "bg-electric-cyan/10 border-2 border-dashed border-electric-cyan"
            : "bg-gray-50"
        }`}
      >
        <AnimatePresence>
          {column.tasks.map((task, index) => (
            <div key={task.id} data-task-id={task.id}>
              {/* Drop indicator */}
              {isDropTarget && dropIndex === index && (
                <div className="h-1 bg-electric-cyan rounded-full mb-2 mx-2" />
              )}
              <TaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDraggedTask({ taskId: task.id, fromColumnId: column.id });
                }}
                isDragging={draggedTask?.taskId === task.id}
              />
            </div>
          ))}
        </AnimatePresence>

        {/* Drop indicator at end */}
        {isDropTarget && dropIndex === column.tasks.length && (
          <div className="h-1 bg-electric-cyan rounded-full mx-2" />
        )}

        {/* Add Card Input */}
        {showAddInput ? (
          <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTaskTitle.trim()) {
                  setShowAddInput(false);
                }
              }}
              placeholder="Enter a title..."
              className="w-full text-sm px-2 py-1 border-none focus:outline-none focus:ring-0"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddTask}
                className="px-3 py-1 bg-electric-cyan text-white text-sm rounded-lg hover:bg-electric-cyan-600 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setNewTaskTitle("");
                  setShowAddInput(false);
                }}
                className="px-3 py-1 text-slate-medium text-sm hover:text-slate-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowAddInput(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-medium hover:text-slate-dark hover:bg-white/50 rounded-lg transition-colors flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  columns,
  onTaskMove,
  onTaskClick,
  onTaskAdd,
  currentUserId,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<{
    taskId: string;
    fromColumnId: TaskColumnId;
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumnId | null>(null);
  const [dropIndex, setDropIndex] = useState<number>(0);

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4"
      onDragEnd={handleDragEnd}
    >
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          onTaskMove={onTaskMove}
          onTaskClick={onTaskClick}
          onTaskAdd={onTaskAdd}
          draggedTask={draggedTask}
          setDraggedTask={setDraggedTask}
          dragOverColumn={dragOverColumn}
          setDragOverColumn={setDragOverColumn}
          dropIndex={dropIndex}
          setDropIndex={setDropIndex}
        />
      ))}
    </div>
  );
}

// Export task detail modal component
interface TaskDetailModalProps {
  task: KanbanTask;
  attendees: { user_id: string; user?: { id: string; display_name: string | null; full_name: string | null; avatar_url?: string | null } | null }[];
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string;
    column_id?: TaskColumnId;
    assigned_to?: string | null;
    due_date?: string | null;
    labels?: TaskLabel[];
  }) => void;
  onDelete: () => void;
  saving: boolean;
}

export function TaskDetailModal({
  task,
  attendees,
  onClose,
  onSave,
  onDelete,
  saving,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [columnId, setColumnId] = useState<TaskColumnId>(task.column_id);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [labels, setLabels] = useState<TaskLabel[]>(task.labels || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      column_id: columnId,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      labels,
    });
  };

  const toggleLabel = (labelId: TaskLabel) => {
    setLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((l) => l !== labelId)
        : [...prev, labelId]
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-heading font-bold text-slate-dark flex-1 focus:outline-none focus:ring-0 border-none p-0"
              placeholder="Task title..."
              required
            />
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-medium hover:text-slate-dark rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input w-full resize-none"
                placeholder="Add a more detailed description..."
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Assigned to
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input w-full"
              >
                <option value="">Unassigned</option>
                {attendees.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.user?.display_name || a.user?.full_name || "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-2">
                Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {LABEL_CONFIG.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      labels.includes(label.id)
                        ? "text-white ring-2 ring-offset-2"
                        : "text-white/80 opacity-60 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: label.color,
                      // @ts-expect-error CSS variable for ring color
                      "--tw-ring-color": label.color,
                    }}
                  >
                    {label.icon} {label.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Status
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as TaskColumnId)}
                className="input w-full"
              >
                {COLUMN_CONFIG.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              Delete Task
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
