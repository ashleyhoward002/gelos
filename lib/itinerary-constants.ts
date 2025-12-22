// Itinerary constants - shared between client and server

export type ItineraryItemType = "activity" | "meal" | "transport" | "accommodation" | "flight" | "free_time" | "other";
export type ItineraryItemStatus = "planned" | "booked" | "confirmed" | "optional" | "cancelled";

export interface ItineraryCategoryConfig {
  id: ItineraryItemType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface ItineraryStatusConfig {
  id: ItineraryItemStatus;
  label: string;
  color: string;
  bgColor: string;
}

export const ITINERARY_CATEGORIES: ItineraryCategoryConfig[] = [
  { id: "activity", label: "Activity", icon: "🎯", color: "#22C55E", bgColor: "#DCFCE7" },
  { id: "meal", label: "Meal", icon: "🍽️", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "transport", label: "Transport", icon: "🚗", color: "#3B82F6", bgColor: "#DBEAFE" },
  { id: "accommodation", label: "Accommodation", icon: "🏨", color: "#8B5CF6", bgColor: "#EDE9FE" },
  { id: "flight", label: "Flight", icon: "✈️", color: "#06B6D4", bgColor: "#CFFAFE" },
  { id: "free_time", label: "Free Time", icon: "☀️", color: "#EAB308", bgColor: "#FEF9C3" },
  { id: "other", label: "Other", icon: "📌", color: "#6B7280", bgColor: "#F3F4F6" },
];

export const ITINERARY_STATUSES: ItineraryStatusConfig[] = [
  { id: "planned", label: "Planned", color: "#6B7280", bgColor: "#F3F4F6" },
  { id: "booked", label: "Booked", color: "#3B82F6", bgColor: "#DBEAFE" },
  { id: "confirmed", label: "Confirmed", color: "#22C55E", bgColor: "#DCFCE7" },
  { id: "optional", label: "Optional", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "cancelled", label: "Cancelled", color: "#EF4444", bgColor: "#FEE2E2" },
];

export function getCategoryConfig(type: ItineraryItemType): ItineraryCategoryConfig {
  return ITINERARY_CATEGORIES.find((c) => c.id === type) || ITINERARY_CATEGORIES[ITINERARY_CATEGORIES.length - 1];
}

export function getStatusConfig(status: ItineraryItemStatus): ItineraryStatusConfig {
  return ITINERARY_STATUSES.find((s) => s.id === status) || ITINERARY_STATUSES[0];
}

// Format time for display (e.g., "09:00" -> "9:00 AM")
export function formatTime(time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Format time range for display
export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) return "";
  if (startTime && !endTime) return formatTime(startTime);
  if (!startTime && endTime) return `Until ${formatTime(endTime)}`;
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// Format date for display (e.g., "2024-03-15" -> "Fri, Mar 15")
export function formatItineraryDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Get day number relative to trip start
export function getDayNumber(itemDate: string, tripStartDate: string): number {
  const item = new Date(itemDate + "T00:00:00");
  const start = new Date(tripStartDate + "T00:00:00");
  const diffTime = item.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// Generate array of dates between start and end
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
