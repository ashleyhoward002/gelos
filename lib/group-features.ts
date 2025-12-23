export type GroupType = "social" | "trip" | "study" | "family" | "custom";

export type Feature =
  | "calendar" | "polls" | "expenses" | "pool" | "photos" | "outings"
  | "scrapbook" | "notes" | "ideas"
  | "study_sessions" | "resources" | "flashcards";

// Features for each preset group type (based on app-plan.md)
export const featuresByType: Record<GroupType, Feature[]> = {
  social: ["calendar", "polls", "expenses", "photos", "outings", "scrapbook", "ideas"],
  trip: ["calendar", "polls", "expenses", "pool", "photos", "outings", "scrapbook", "ideas"],
  study: ["study_sessions", "resources", "flashcards", "polls", "notes"],
  family: ["calendar", "polls", "expenses", "photos", "outings", "scrapbook", "ideas"],
  custom: [], // User picks their own
};

// All available features with their display info
export const allFeatures: { value: Feature; label: string; description: string }[] = [
  { value: "calendar", label: "Calendar", description: "Schedule and track group events" },
  { value: "polls", label: "Polls", description: "Make group decisions together" },
  { value: "expenses", label: "Expenses", description: "Track spending and split costs" },
  { value: "pool", label: "Contribution Pool", description: "Save together toward a shared goal" },
  { value: "photos", label: "Photos", description: "Upload and organize photos" },
  { value: "outings", label: "Outings", description: "Plan and organize group outings" },
  { value: "ideas", label: "Ideas", description: "Discover and save things to do together" },
  { value: "scrapbook", label: "Scrapbook", description: "Create beautiful memory pages" },
  { value: "notes", label: "Shared Notes", description: "Collaborative note-taking" },
  { value: "study_sessions", label: "Study Sessions", description: "Schedule group study sessions with RSVP" },
  { value: "resources", label: "Resources", description: "Share notes, links, and study materials" },
  { value: "flashcards", label: "Flashcards", description: "Create and study flashcard decks together" },
];
