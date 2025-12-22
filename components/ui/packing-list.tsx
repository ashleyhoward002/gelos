"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PackingList as PackingListType, PackingItem } from "@/lib/packing";
import {
  PackingCategory,
  PACKING_CATEGORIES,
  getCategoryConfig,
  groupItemsByCategory,
  sortedCategoryKeys,
  calculateProgress,
} from "@/lib/packing-constants";
import { addPackingItem, markCategoryPacked } from "@/lib/packing";
import PackingItemRow from "./packing-item";

interface PackingListProps {
  list: PackingListType;
  groupId: string;
  tripId: string;
  personalListId?: string;
  onUpdate?: () => void;
  onEditItem?: (item: PackingItem) => void;
}

export function PackingListComponent({
  list,
  groupId,
  tripId,
  personalListId,
  onUpdate,
  onEditItem,
}: PackingListProps) {
  const [isPending, startTransition] = useTransition();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<PackingCategory>("misc");
  const [filter, setFilter] = useState<"all" | "packed" | "unpacked">("all");

  const items = list.items || [];
  const progress = calculateProgress(items);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === "packed") return item.is_packed;
    if (filter === "unpacked") return !item.is_packed;
    return true;
  });

  // Group by category
  const groupedItems = groupItemsByCategory(filteredItems);
  const categoryKeys = sortedCategoryKeys(groupedItems);

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle quick add
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    startTransition(async () => {
      await addPackingItem(list.id, groupId, tripId, {
        item_name: newItemName,
        category: newItemCategory,
      });
      setNewItemName("");
      onUpdate?.();
    });
  };

  // Handle mark all in category
  const handleMarkAllInCategory = (category: PackingCategory, packed: boolean) => {
    startTransition(async () => {
      await markCategoryPacked(list.id, category, packed, groupId, tripId);
      onUpdate?.();
    });
  };

  const isShared = list.is_shared;
  const icon = isShared ? "📦" : "🎒";
  const title = list.title;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-heading font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {isShared ? "Items everyone should remember to bring" : "Only you can see this list"}
              </p>
            </div>
          </div>

          {/* Progress badge */}
          <div className="text-right">
            <div className="text-lg font-semibold">
              {progress.packed}/{progress.total}
              <span className="text-sm text-muted-foreground ml-1">packed</span>
            </div>
            <div className="text-sm text-muted-foreground">{progress.percentage}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm text-muted-foreground">Show:</span>
          {(["all", "unpacked", "packed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 rounded-full text-sm transition-colors
                ${filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
                }
              `}
            >
              {f === "all" ? "All" : f === "packed" ? "Packed" : "To Pack"}
            </button>
          ))}
        </div>
      </div>

      {/* Items by category */}
      <div className="p-4 space-y-4">
        {categoryKeys.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">{icon}</div>
            <p className="text-muted-foreground mb-4">
              {filter !== "all"
                ? `No ${filter} items`
                : "No items yet. Start adding!"}
            </p>
          </div>
        ) : (
          categoryKeys.map((category) => {
            const categoryConfig = getCategoryConfig(category);
            const categoryItems = groupedItems[category] || [];
            const isCollapsed = collapsedCategories.has(category);
            const categoryProgress = calculateProgress(categoryItems);
            const allPacked = categoryProgress.packed === categoryProgress.total;

            return (
              <div key={category} className="space-y-1">
                {/* Category header */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 py-1 hover:opacity-80 transition-opacity"
                  >
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-sm"
                      style={{ backgroundColor: categoryConfig.bgColor }}
                    >
                      {categoryConfig.icon}
                    </span>
                    <span className="font-medium">{categoryConfig.label}</span>
                    <span className="text-sm text-muted-foreground">
                      ({categoryProgress.packed}/{categoryProgress.total})
                    </span>
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mark all button */}
                  {categoryItems.length > 0 && (
                    <button
                      onClick={() => handleMarkAllInCategory(category, !allPacked)}
                      disabled={isPending}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {allPacked ? "Unpack All" : "Pack All"}
                    </button>
                  )}
                </div>

                {/* Category items */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="ml-3 pl-3 border-l-2 space-y-0.5"
                        style={{ borderColor: categoryConfig.bgColor }}
                      >
                        {categoryItems.map((item) => (
                          <PackingItemRow
                            key={item.id}
                            item={item}
                            groupId={groupId}
                            tripId={tripId}
                            isSharedList={isShared}
                            personalListId={personalListId}
                            onUpdate={onUpdate}
                            onEdit={onEditItem ? () => onEditItem(item) : undefined}
                            showAdder={isShared}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}

        {/* Quick add form */}
        {showAddForm ? (
          <form onSubmit={handleQuickAdd} className="flex gap-2 mt-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name..."
              className="input flex-1 text-sm"
              autoFocus
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as PackingCategory)}
              className="input text-sm w-32"
            >
              {PACKING_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending || !newItemName.trim()}
              className="btn-primary text-sm px-4"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewItemName("");
              }}
              className="btn-secondary text-sm px-3"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            + Add Item to {isShared ? "Group List" : "My List"}
          </button>
        )}
      </div>
    </div>
  );
}

export default PackingListComponent;
