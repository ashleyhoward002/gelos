// Task constants - shared between client and server

export type TaskColumnId = "todo" | "in-progress" | "booked" | "confirmed";
export type TaskLabel = "urgent" | "flights" | "hotel" | "activities" | "transport" | "food" | "admin" | "optional";

export const COLUMN_CONFIG: { id: TaskColumnId; title: string; color: string }[] = [
  { id: "todo", title: "To Do", color: "#9CA3AF" },
  { id: "in-progress", title: "In Progress", color: "#FFD54F" },
  { id: "booked", title: "Booked", color: "#FFAB91" },
  { id: "confirmed", title: "Confirmed", color: "#81C784" },
];

export const LABEL_CONFIG: { id: TaskLabel; label: string; color: string; icon: string }[] = [
  { id: "urgent", label: "Urgent", color: "#EF4444", icon: "🔴" },
  { id: "flights", label: "Flights", color: "#3B82F6", icon: "✈️" },
  { id: "hotel", label: "Hotel", color: "#8B5CF6", icon: "🏨" },
  { id: "activities", label: "Activities", color: "#22C55E", icon: "🎯" },
  { id: "transport", label: "Transport", color: "#F97316", icon: "🚗" },
  { id: "food", label: "Food", color: "#EAB308", icon: "🍽️" },
  { id: "admin", label: "Admin", color: "#6B7280", icon: "📋" },
  { id: "optional", label: "Optional", color: "#F9A8D4", icon: "⭐" },
];
