// Document types and constants - not a server file

export interface GroupDocument {
  id: string;
  group_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: DocumentCategory;
  description?: string | null;
  outing_id?: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  outing?: {
    id: string;
    title: string;
  } | null;
}

export type DocumentCategory =
  | "itinerary"
  | "ticket"
  | "reservation"
  | "receipt"
  | "map"
  | "guide"
  | "contract"
  | "other";

export const documentCategoryLabels: Record<DocumentCategory, { label: string; icon: string }> = {
  itinerary: { label: "Itinerary", icon: "📅" },
  ticket: { label: "Ticket", icon: "🎫" },
  reservation: { label: "Reservation", icon: "🏨" },
  receipt: { label: "Receipt", icon: "🧾" },
  map: { label: "Map", icon: "🗺️" },
  guide: { label: "Guide", icon: "📖" },
  contract: { label: "Contract", icon: "📝" },
  other: { label: "Other", icon: "📄" },
};
