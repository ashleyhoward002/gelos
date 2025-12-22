// Packing constants - shared between client and server

export type PackingCategory =
  | "clothes"
  | "toiletries"
  | "electronics"
  | "documents"
  | "beach"
  | "medicine"
  | "snacks"
  | "misc";

export interface CategoryConfig {
  id: PackingCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const PACKING_CATEGORIES: CategoryConfig[] = [
  { id: "clothes", label: "Clothes", icon: "👕", color: "#8B5CF6", bgColor: "#EDE9FE" },
  { id: "toiletries", label: "Toiletries", icon: "🧴", color: "#EC4899", bgColor: "#FCE7F3" },
  { id: "electronics", label: "Electronics", icon: "🔌", color: "#3B82F6", bgColor: "#DBEAFE" },
  { id: "documents", label: "Documents", icon: "📄", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "beach", label: "Beach/Pool", icon: "🏖️", color: "#0EA5E9", bgColor: "#E0F2FE" },
  { id: "medicine", label: "Medicine", icon: "💊", color: "#EF4444", bgColor: "#FEE2E2" },
  { id: "snacks", label: "Snacks", icon: "🍿", color: "#EAB308", bgColor: "#FEF9C3" },
  { id: "misc", label: "Misc", icon: "📦", color: "#6B7280", bgColor: "#F3F4F6" },
];

export function getCategoryConfig(category: PackingCategory): CategoryConfig {
  return PACKING_CATEGORIES.find((c) => c.id === category) || PACKING_CATEGORIES[PACKING_CATEGORIES.length - 1];
}

// Suggested items by trip type
export interface SuggestedItem {
  name: string;
  category: PackingCategory;
  quantity?: number;
}

export const SUGGESTED_ITEMS: Record<string, SuggestedItem[]> = {
  beach: [
    { name: "Sunscreen SPF 50", category: "toiletries" },
    { name: "Swimsuit", category: "clothes", quantity: 2 },
    { name: "Flip flops", category: "clothes" },
    { name: "Beach towel", category: "beach" },
    { name: "Sunglasses", category: "beach" },
    { name: "Hat/Cap", category: "clothes" },
    { name: "Aloe vera gel", category: "toiletries" },
    { name: "Insect repellent", category: "toiletries" },
    { name: "Waterproof phone case", category: "electronics" },
    { name: "Snorkel gear", category: "beach" },
  ],
  ski: [
    { name: "Ski jacket", category: "clothes" },
    { name: "Ski pants", category: "clothes" },
    { name: "Thermal underwear", category: "clothes" },
    { name: "Warm socks", category: "clothes", quantity: 5 },
    { name: "Gloves", category: "clothes" },
    { name: "Beanie", category: "clothes" },
    { name: "Goggles", category: "misc" },
    { name: "Lip balm with SPF", category: "toiletries" },
    { name: "Hand warmers", category: "misc" },
  ],
  city: [
    { name: "Comfortable walking shoes", category: "clothes" },
    { name: "Portable charger", category: "electronics" },
    { name: "Adapter/Converter", category: "electronics" },
    { name: "Day backpack", category: "misc" },
    { name: "Umbrella", category: "misc" },
    { name: "City guide/Maps", category: "documents" },
  ],
  camping: [
    { name: "Tent", category: "misc" },
    { name: "Sleeping bag", category: "misc" },
    { name: "Flashlight/Headlamp", category: "electronics" },
    { name: "First aid kit", category: "medicine" },
    { name: "Insect repellent", category: "toiletries" },
    { name: "Water bottle", category: "misc" },
    { name: "Pocket knife", category: "misc" },
    { name: "Fire starters", category: "misc" },
  ],
  general: [
    { name: "Passport", category: "documents" },
    { name: "Travel insurance", category: "documents" },
    { name: "Phone charger", category: "electronics" },
    { name: "Headphones", category: "electronics" },
    { name: "Toothbrush", category: "toiletries" },
    { name: "Toothpaste", category: "toiletries" },
    { name: "Deodorant", category: "toiletries" },
    { name: "Underwear", category: "clothes", quantity: 7 },
    { name: "Socks", category: "clothes", quantity: 7 },
    { name: "Medications", category: "medicine" },
    { name: "Pain relievers", category: "medicine" },
  ],
};

// Get suggested items for a trip type
export function getSuggestedItems(tripType: string = "general"): SuggestedItem[] {
  const typeItems = SUGGESTED_ITEMS[tripType] || [];
  const generalItems = tripType !== "general" ? SUGGESTED_ITEMS.general : [];

  // Combine specific + general, removing duplicates by name
  const combined = [...typeItems];
  generalItems.forEach((item) => {
    if (!combined.some((i) => i.name.toLowerCase() === item.name.toLowerCase())) {
      combined.push(item);
    }
  });

  return combined;
}

// Calculate packing progress
export interface PackingProgress {
  total: number;
  packed: number;
  percentage: number;
}

export function calculateProgress(items: { is_packed: boolean }[]): PackingProgress {
  const total = items.length;
  const packed = items.filter((i) => i.is_packed).length;
  const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
  return { total, packed, percentage };
}

// Group items by category
export function groupItemsByCategory<T extends { category: PackingCategory }>(
  items: T[]
): Record<PackingCategory, T[]> {
  const grouped: Record<PackingCategory, T[]> = {
    clothes: [],
    toiletries: [],
    electronics: [],
    documents: [],
    beach: [],
    medicine: [],
    snacks: [],
    misc: [],
  };

  items.forEach((item) => {
    const category = item.category || "misc";
    if (grouped[category]) {
      grouped[category].push(item);
    } else {
      grouped.misc.push(item);
    }
  });

  return grouped;
}

// Sort categories by the order defined in PACKING_CATEGORIES
export function sortedCategoryKeys(
  grouped: Record<PackingCategory, unknown[]>
): PackingCategory[] {
  return PACKING_CATEGORIES
    .map((c) => c.id)
    .filter((id) => grouped[id] && grouped[id].length > 0);
}
