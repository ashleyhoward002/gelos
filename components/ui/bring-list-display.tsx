"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BringList,
  BringListItem,
  BringListCategory,
  getBringList,
  addCategory,
  deleteCategory,
} from "@/lib/bring-list";
import { calculateListStats, DEFAULT_CATEGORIES } from "@/lib/bring-list-constants";
import BringListItemComponent from "./bring-list-item";
import {
  ClaimItemModal,
  SuggestItemModal,
  AddEditItemModal,
} from "./bring-list-modals";

interface BringListDisplayProps {
  eventId?: string;
  outingId?: string;
  groupId: string;
  currentUserId: string;
}

export function BringListDisplay({
  eventId,
  outingId,
  groupId,
  currentUserId,
}: BringListDisplayProps) {
  const [bringList, setBringList] = useState<BringList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [claimingItem, setClaimingItem] = useState<BringListItem | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BringListItem | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Fetch bring list
  const fetchBringList = useCallback(async () => {
    const data = await getBringList({ eventId, outingId });
    setBringList(data);
    setLoading(false);
  }, [eventId, outingId]);

  useEffect(() => {
    fetchBringList();
  }, [fetchBringList]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!bringList) {
    return null;
  }

  const isHost = bringList.host_id === currentUserId;
  const hostName =
    bringList.host?.display_name || bringList.host?.full_name || "Host";

  // Group items by category
  const itemsByCategory = new Map<string | null, BringListItem[]>();
  bringList.items
    .filter((i) => i.suggestion_approved)
    .forEach((item) => {
      const catId = item.category_id;
      if (!itemsByCategory.has(catId)) {
        itemsByCategory.set(catId, []);
      }
      itemsByCategory.get(catId)!.push(item);
    });

  // Calculate stats
  const stats = calculateListStats(bringList.items.filter((i) => i.suggestion_approved));

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const handleAddCategory = (name: string, icon: string) => {
    startTransition(async () => {
      await addCategory(bringList.id, groupId, { name, icon });
      fetchBringList();
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              {bringList.title}
            </h3>
            {bringList.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {bringList.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.claimedItems}/{stats.totalItems}
            </div>
            <div className="text-xs text-muted-foreground">items claimed</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentComplete}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          />
        </div>

        {/* Host providing */}
        {bringList.host_providing && (
          <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span>👩‍🍳</span>
              {isHost ? "You're" : `${hostName} is`} providing:
            </div>
            <p className="text-sm mt-1">{bringList.host_providing}</p>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {bringList.categories.map((category) => {
          const categoryItems = itemsByCategory.get(category.id) || [];
          const isCollapsed = collapsedCategories.has(category.id);
          const claimedCount = categoryItems.filter((i) => i.claimed_by).length;

          return (
            <div
              key={category.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Category Header */}
              <div
                className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({claimedCount}/{categoryItems.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isHost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingToCategory(category.id);
                        setShowAddItemModal(true);
                      }}
                      className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
                    >
                      + Add Item
                    </button>
                  )}
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Category Items */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {categoryItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3 text-center italic">
                          No items yet
                        </p>
                      ) : (
                        categoryItems.map((item) => (
                          <BringListItemComponent
                            key={item.id}
                            item={item}
                            groupId={groupId}
                            currentUserId={currentUserId}
                            isHost={isHost}
                            onClaimClick={setClaimingItem}
                            onEditClick={isHost ? setEditingItem : undefined}
                            onRefresh={fetchBringList}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Uncategorized Items */}
        {itemsByCategory.has(null) && (itemsByCategory.get(null)?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <span className="font-medium">Other</span>
                <span className="text-sm text-muted-foreground">
                  ({itemsByCategory.get(null)?.filter((i) => i.claimed_by).length}/
                  {itemsByCategory.get(null)?.length})
                </span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {itemsByCategory.get(null)?.map((item) => (
                <BringListItemComponent
                  key={item.id}
                  item={item}
                  groupId={groupId}
                  currentUserId={currentUserId}
                  isHost={isHost}
                  onClaimClick={setClaimingItem}
                  onEditClick={isHost ? setEditingItem : undefined}
                  onRefresh={fetchBringList}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggest Item */}
      <div className="flex items-center justify-center pt-2">
        <button
          onClick={() => setShowSuggestModal(true)}
          className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <span className="text-lg">💡</span>
          Want to bring something else? Suggest an item
        </button>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setAddingToCategory(null);
                setShowAddItemModal(true);
              }}
              className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              + Add Item
            </button>
            <AddCategoryButton
              categories={bringList.categories}
              onAdd={handleAddCategory}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {claimingItem && (
        <ClaimItemModal
          isOpen={!!claimingItem}
          onClose={() => setClaimingItem(null)}
          item={claimingItem}
          groupId={groupId}
          onClaimed={fetchBringList}
        />
      )}

      <SuggestItemModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        listId={bringList.id}
        groupId={groupId}
        categories={bringList.categories}
        onSuggested={fetchBringList}
      />

      <AddEditItemModal
        isOpen={showAddItemModal || !!editingItem}
        onClose={() => {
          setShowAddItemModal(false);
          setEditingItem(null);
          setAddingToCategory(null);
        }}
        listId={bringList.id}
        groupId={groupId}
        categories={bringList.categories}
        item={editingItem}
        onSaved={fetchBringList}
      />
    </div>
  );
}

// ============================================
// ADD CATEGORY BUTTON
// ============================================

function AddCategoryButton({
  categories,
  onAdd,
  isPending,
}: {
  categories: BringListCategory[];
  onAdd: (name: string, icon: string) => void;
  isPending: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Get categories that aren't already added
  const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
  const availableCategories = DEFAULT_CATEGORIES.filter(
    (c) => !existingNames.has(c.name.toLowerCase())
  );

  if (availableCategories.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isPending}
        className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors"
      >
        + Add Category
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
            >
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onAdd(cat.name, cat.icon);
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BringListDisplay;
