import { IdeaCategory } from "./ideas";

export const categoryLabels: Record<IdeaCategory, { label: string; icon: string }> = {
  food: { label: "Food & Drink", icon: "🍽️" },
  activities: { label: "Activities", icon: "🎯" },
  outdoors: { label: "Outdoors", icon: "🌲" },
  events: { label: "Events", icon: "🎉" },
  nightlife: { label: "Nightlife", icon: "🌙" },
  arts: { label: "Arts & Culture", icon: "🎨" },
  shopping: { label: "Shopping", icon: "🛍️" },
};
