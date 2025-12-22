// Bring List Constants
// Categories, templates, and helper functions

// ============================================
// DEFAULT CATEGORIES
// ============================================

export interface BringListCategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const DEFAULT_CATEGORIES: BringListCategoryConfig[] = [
  { id: "main", name: "Main Dishes", icon: "🍖", color: "#dc2626", bgColor: "#fef2f2" },
  { id: "sides", name: "Sides", icon: "🥗", color: "#16a34a", bgColor: "#f0fdf4" },
  { id: "drinks", name: "Drinks", icon: "🥤", color: "#2563eb", bgColor: "#eff6ff" },
  { id: "desserts", name: "Desserts", icon: "🍰", color: "#db2777", bgColor: "#fdf2f8" },
  { id: "appetizers", name: "Appetizers & Snacks", icon: "🧀", color: "#ea580c", bgColor: "#fff7ed" },
  { id: "supplies", name: "Supplies", icon: "🧻", color: "#6b7280", bgColor: "#f9fafb" },
  { id: "decorations", name: "Decorations", icon: "🎈", color: "#8b5cf6", bgColor: "#f5f3ff" },
  { id: "other", name: "Other", icon: "📦", color: "#78716c", bgColor: "#fafaf9" },
];

export function getCategoryConfig(categoryId: string): BringListCategoryConfig {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}

export function getCategoryByName(name: string): BringListCategoryConfig | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}


// ============================================
// TEMPLATES
// ============================================

export interface BringListTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  hostProviding?: string;
  categories: {
    name: string;
    icon: string;
    items: string[];
  }[];
}

export const BRING_LIST_TEMPLATES: BringListTemplate[] = [
  {
    id: "bbq",
    name: "BBQ / Cookout",
    icon: "🍖",
    description: "Classic backyard BBQ essentials",
    hostProviding: "Burgers, hot dogs, buns, and condiments",
    categories: [
      { name: "Sides", icon: "🥗", items: ["Pasta Salad", "Coleslaw", "Baked Beans", "Corn on the Cob", "Potato Salad"] },
      { name: "Drinks", icon: "🥤", items: ["Beer (case)", "Soda variety", "Water bottles", "Lemonade", "Juice boxes"] },
      { name: "Desserts", icon: "🍰", items: ["Brownies", "Cookies", "Watermelon", "Ice cream"] },
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Chips & Dip", "Veggie tray", "Fruit tray"] },
      { name: "Supplies", icon: "🧻", items: ["Ice (2 bags)", "Paper plates", "Napkins", "Plastic utensils", "Cups"] },
    ],
  },
  {
    id: "party",
    name: "Party",
    icon: "🎉",
    description: "General party supplies and food",
    categories: [
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Chips & Salsa", "Cheese platter", "Veggie tray", "Dip variety"] },
      { name: "Drinks", icon: "🥤", items: ["Wine", "Beer", "Soda", "Sparkling water", "Mixers"] },
      { name: "Desserts", icon: "🍰", items: ["Cake", "Cupcakes", "Cookies", "Candy"] },
      { name: "Supplies", icon: "🧻", items: ["Plates", "Napkins", "Cups", "Ice"] },
      { name: "Decorations", icon: "🎈", items: ["Balloons", "Streamers", "Table decorations"] },
    ],
  },
  {
    id: "gameday",
    name: "Game Day",
    icon: "🏈",
    description: "Perfect for watching the big game",
    hostProviding: "TV and seating",
    categories: [
      { name: "Main Dishes", icon: "🍖", items: ["Wings", "Sliders", "Pizza"] },
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Chips & Dip", "Nachos", "Pretzels", "Popcorn", "Buffalo dip"] },
      { name: "Drinks", icon: "🥤", items: ["Beer", "Soda", "Energy drinks", "Water"] },
      { name: "Desserts", icon: "🍰", items: ["Brownies", "Cookies"] },
      { name: "Supplies", icon: "🧻", items: ["Napkins", "Paper plates", "Toothpicks"] },
    ],
  },
  {
    id: "holiday",
    name: "Holiday Dinner",
    icon: "🦃",
    description: "Thanksgiving, Christmas, or holiday feast",
    hostProviding: "Turkey/Ham and gravy",
    categories: [
      { name: "Sides", icon: "🥗", items: ["Mashed potatoes", "Green bean casserole", "Stuffing", "Cranberry sauce", "Sweet potatoes", "Rolls"] },
      { name: "Desserts", icon: "🍰", items: ["Pumpkin pie", "Apple pie", "Pecan pie", "Cheesecake", "Whipped cream"] },
      { name: "Drinks", icon: "🥤", items: ["Wine", "Apple cider", "Sparkling cider", "Coffee", "Tea"] },
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Cheese board", "Crackers", "Olives", "Deviled eggs"] },
      { name: "Supplies", icon: "🧻", items: ["Nice napkins", "Candles"] },
    ],
  },
  {
    id: "birthday",
    name: "Birthday Party",
    icon: "🎂",
    description: "Birthday celebration essentials",
    hostProviding: "Birthday cake",
    categories: [
      { name: "Main Dishes", icon: "🍖", items: ["Pizza", "Sandwiches", "Hot dogs"] },
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Chips", "Popcorn", "Fruit tray", "Veggie tray"] },
      { name: "Drinks", icon: "🥤", items: ["Juice boxes", "Soda", "Water bottles", "Lemonade"] },
      { name: "Desserts", icon: "🍰", items: ["Ice cream", "Cupcakes", "Candy", "Cookies"] },
      { name: "Supplies", icon: "🧻", items: ["Party plates", "Napkins", "Cups", "Party hats", "Goodie bags"] },
      { name: "Decorations", icon: "🎈", items: ["Balloons", "Streamers", "Banner", "Tablecloth"] },
    ],
  },
  {
    id: "potluck",
    name: "Potluck",
    icon: "🍲",
    description: "Everyone brings a dish to share",
    categories: [
      { name: "Main Dishes", icon: "🍖", items: ["Casserole", "Pasta dish", "Meat dish", "Vegetarian main"] },
      { name: "Sides", icon: "🥗", items: ["Salad", "Bread/Rolls", "Rice dish", "Vegetable dish"] },
      { name: "Desserts", icon: "🍰", items: ["Pie", "Cake", "Cookies", "Fruit dessert"] },
      { name: "Drinks", icon: "🥤", items: ["Drinks", "Ice"] },
      { name: "Supplies", icon: "🧻", items: ["Serving utensils", "Plates", "Napkins"] },
    ],
  },
  {
    id: "picnic",
    name: "Picnic",
    icon: "🧺",
    description: "Outdoor picnic in the park",
    categories: [
      { name: "Main Dishes", icon: "🍖", items: ["Sandwiches", "Fried chicken", "Wraps"] },
      { name: "Sides", icon: "🥗", items: ["Potato salad", "Coleslaw", "Pasta salad", "Fresh fruit"] },
      { name: "Appetizers & Snacks", icon: "🧀", items: ["Cheese & crackers", "Chips", "Nuts", "Veggies"] },
      { name: "Drinks", icon: "🥤", items: ["Lemonade", "Iced tea", "Water", "Juice boxes"] },
      { name: "Desserts", icon: "🍰", items: ["Brownies", "Cookies", "Watermelon"] },
      { name: "Supplies", icon: "🧻", items: ["Blanket", "Plates", "Napkins", "Utensils", "Cooler", "Ice packs"] },
    ],
  },
  {
    id: "blank",
    name: "Start Fresh",
    icon: "📝",
    description: "Create your own custom list",
    categories: [],
  },
];

export function getTemplate(templateId: string): BringListTemplate | undefined {
  return BRING_LIST_TEMPLATES.find((t) => t.id === templateId);
}


// ============================================
// ITEM STATUS HELPERS
// ============================================

export type ItemStatus = "unclaimed" | "partially_claimed" | "claimed" | "received";

export function getItemStatus(item: { quantity_needed: number; quantity_claimed: number; claimed_by: string | null; is_received: boolean }): ItemStatus {
  if (item.is_received) return "received";
  if (item.claimed_by || item.quantity_claimed >= item.quantity_needed) return "claimed";
  if (item.quantity_claimed > 0) return "partially_claimed";
  return "unclaimed";
}

export function getItemStatusConfig(status: ItemStatus): { label: string; color: string; bgColor: string; icon: string } {
  switch (status) {
    case "received":
      return { label: "Received", color: "#16a34a", bgColor: "#dcfce7", icon: "✅" };
    case "claimed":
      return { label: "Claimed", color: "#2563eb", bgColor: "#dbeafe", icon: "☑️" };
    case "partially_claimed":
      return { label: "Partially Claimed", color: "#ea580c", bgColor: "#fed7aa", icon: "⏳" };
    case "unclaimed":
      return { label: "Unclaimed", color: "#6b7280", bgColor: "#f3f4f6", icon: "☐" };
  }
}


// ============================================
// SUMMARY HELPERS
// ============================================

export interface BringListStats {
  totalItems: number;
  claimedItems: number;
  unclaimedItems: number;
  receivedItems: number;
  percentComplete: number;
}

export function calculateListStats(items: { claimed_by: string | null; is_received: boolean }[]): BringListStats {
  const totalItems = items.length;
  const claimedItems = items.filter((i) => i.claimed_by !== null).length;
  const receivedItems = items.filter((i) => i.is_received).length;
  const unclaimedItems = totalItems - claimedItems;
  const percentComplete = totalItems > 0 ? Math.round((claimedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    claimedItems,
    unclaimedItems,
    receivedItems,
    percentComplete,
  };
}

export interface ContributorSummary {
  userId: string;
  userName: string;
  items: string[];
}

export function groupItemsByContributor(
  items: { claimed_by: string | null; claimed_by_name: string | null; item_name: string }[]
): ContributorSummary[] {
  const contributorMap = new Map<string, ContributorSummary>();

  items.forEach((item) => {
    if (item.claimed_by) {
      const existing = contributorMap.get(item.claimed_by);
      if (existing) {
        existing.items.push(item.item_name);
      } else {
        contributorMap.set(item.claimed_by, {
          userId: item.claimed_by,
          userName: item.claimed_by_name || "Someone",
          items: [item.item_name],
        });
      }
    }
  });

  return Array.from(contributorMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
}
