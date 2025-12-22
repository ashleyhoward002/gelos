// Activity constants - shared between client and server

export type ActivityCategory = "water" | "adventure" | "relaxation" | "food" | "nightlife" | "culture" | "tour" | "other";
export type ActivityStatus = "idea" | "interested" | "booked" | "confirmed" | "completed" | "cancelled";
export type ParticipantStatus = "interested" | "going" | "not_going" | "maybe";

export interface CategoryConfig {
  id: ActivityCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface StatusConfig {
  id: ActivityStatus;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface ParticipantStatusConfig {
  id: ParticipantStatus;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const ACTIVITY_CATEGORIES: CategoryConfig[] = [
  { id: "water", label: "Water", icon: "🌊", color: "#0EA5E9", bgColor: "#E0F2FE" },
  { id: "adventure", label: "Adventure", icon: "🪂", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "relaxation", label: "Relaxation", icon: "💆", color: "#A855F7", bgColor: "#F3E8FF" },
  { id: "food", label: "Food & Drink", icon: "🍽️", color: "#EAB308", bgColor: "#FEF9C3" },
  { id: "nightlife", label: "Nightlife", icon: "🎉", color: "#EC4899", bgColor: "#FCE7F3" },
  { id: "culture", label: "Culture", icon: "🏛️", color: "#8B5CF6", bgColor: "#EDE9FE" },
  { id: "tour", label: "Tours", icon: "🚌", color: "#22C55E", bgColor: "#DCFCE7" },
  { id: "other", label: "Other", icon: "📸", color: "#6B7280", bgColor: "#F3F4F6" },
];

export const ACTIVITY_STATUSES: StatusConfig[] = [
  { id: "idea", label: "Idea", icon: "💡", color: "#6B7280", bgColor: "#F3F4F6" },
  { id: "interested", label: "Interested", icon: "👀", color: "#3B82F6", bgColor: "#DBEAFE" },
  { id: "booked", label: "Booked", icon: "📝", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "confirmed", label: "Confirmed", icon: "✅", color: "#22C55E", bgColor: "#DCFCE7" },
  { id: "completed", label: "Completed", icon: "✓", color: "#166534", bgColor: "#BBF7D0" },
  { id: "cancelled", label: "Cancelled", icon: "❌", color: "#EF4444", bgColor: "#FEE2E2" },
];

export const PARTICIPANT_STATUSES: ParticipantStatusConfig[] = [
  { id: "going", label: "I'm In", shortLabel: "Going", icon: "✓", color: "#22C55E", bgColor: "#DCFCE7" },
  { id: "maybe", label: "Maybe", shortLabel: "Maybe", icon: "?", color: "#EAB308", bgColor: "#FEF9C3" },
  { id: "not_going", label: "Can't Go", shortLabel: "Not Going", icon: "✗", color: "#6B7280", bgColor: "#F3F4F6" },
  { id: "interested", label: "Interested", shortLabel: "Interested", icon: "👀", color: "#3B82F6", bgColor: "#DBEAFE" },
];

export function getCategoryConfig(category: ActivityCategory): CategoryConfig {
  return ACTIVITY_CATEGORIES.find((c) => c.id === category) || ACTIVITY_CATEGORIES[ACTIVITY_CATEGORIES.length - 1];
}

export function getStatusConfig(status: ActivityStatus): StatusConfig {
  return ACTIVITY_STATUSES.find((s) => s.id === status) || ACTIVITY_STATUSES[0];
}

export function getParticipantStatusConfig(status: ParticipantStatus): ParticipantStatusConfig {
  return PARTICIPANT_STATUSES.find((s) => s.id === status) || PARTICIPANT_STATUSES[0];
}

// Format date for display (e.g., "2024-06-06" -> "Fri, Jun 6")
export function formatActivityDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format time for display (e.g., "09:00" -> "9:00 AM")
export function formatActivityTime(time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Format time range
export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return "";
  const start = formatActivityTime(startTime);
  if (!endTime) return start;
  const end = formatActivityTime(endTime);
  return `${start} - ${end}`;
}

// Format currency
export function formatCurrency(amount: number | null, currency: string = "USD"): string {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Get participant counts
export interface ParticipantCounts {
  going: number;
  maybe: number;
  notGoing: number;
  interested: number;
  total: number;
}

export function getParticipantCounts(participants: { status: ParticipantStatus }[]): ParticipantCounts {
  return {
    going: participants.filter((p) => p.status === "going").length,
    maybe: participants.filter((p) => p.status === "maybe").length,
    notGoing: participants.filter((p) => p.status === "not_going").length,
    interested: participants.filter((p) => p.status === "interested").length,
    total: participants.length,
  };
}

// Check if minimum people requirement is met
export function isMinPeopleMet(goingCount: number, minPeople: number | null): boolean {
  if (!minPeople) return true;
  return goingCount >= minPeople;
}

// Get spots remaining
export function getSpotsRemaining(goingCount: number, maxPeople: number | null): number | null {
  if (!maxPeople) return null;
  return Math.max(0, maxPeople - goingCount);
}

// Check if activity is full
export function isActivityFull(goingCount: number, maxPeople: number | null): boolean {
  if (!maxPeople) return false;
  return goingCount >= maxPeople;
}
