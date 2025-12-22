export type ExpenseSplitType = "equal" | "custom" | "percentage";
export type ExpenseCategory = "food" | "transport" | "accommodation" | "activities" | "shopping" | "utilities" | "entertainment" | "other";

export const categoryLabels: Record<ExpenseCategory, { label: string; icon: string }> = {
  food: { label: "Food & Drink", icon: "🍽️" },
  transport: { label: "Transport", icon: "🚗" },
  accommodation: { label: "Accommodation", icon: "🏨" },
  activities: { label: "Activities", icon: "🎯" },
  shopping: { label: "Shopping", icon: "🛍️" },
  utilities: { label: "Utilities", icon: "💡" },
  entertainment: { label: "Entertainment", icon: "🎬" },
  other: { label: "Other", icon: "📦" },
};

export const splitTypeLabels: Record<ExpenseSplitType, { label: string; description: string }> = {
  equal: { label: "Split Equally", description: "Divide evenly among selected people" },
  custom: { label: "Custom Amounts", description: "Enter specific amounts for each person" },
  percentage: { label: "By Percentage", description: "Split by percentage shares" },
};
