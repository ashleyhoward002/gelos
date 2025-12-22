"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackingList,
  PackingItem,
  getPackingLists,
  getOrCreateDefaultLists,
  addPackingItem,
  updatePackingItem,
  addSuggestedItems,
} from "@/lib/packing";
import {
  PackingCategory,
  PACKING_CATEGORIES,
  getSuggestedItems,
  SuggestedItem,
  calculateProgress,
} from "@/lib/packing-constants";
import PackingListComponent from "./packing-list";

interface PackingTabProps {
  groupId: string;
  tripId: string;
  tripType?: string; // beach, ski, city, camping, etc.
}

export function PackingTab({
  groupId,
  tripId,
  tripType = "general",
}: PackingTabProps) {
  const [lists, setLists] = useState<PackingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Form state
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<PackingCategory>("misc");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");

  // Fetch lists
  const fetchLists = useCallback(async () => {
    // First, ensure default lists exist
    await getOrCreateDefaultLists(tripId, groupId);

    // Then fetch all lists
    const data = await getPackingLists(tripId);
    setLists(data);
    setLoading(false);
  }, [tripId, groupId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Get shared and personal lists
  const sharedList = lists.find((l) => l.is_shared);
  const personalList = lists.find((l) => !l.is_shared);

  // Calculate overall progress
  const allItems = lists.flatMap((l) => l.items || []);
  const overallProgress = calculateProgress(allItems);

  // Get suggested items
  const suggestedItems = getSuggestedItems(tripType);

  // Handle add suggested items
  const handleAddSuggested = (listId: string, items: SuggestedItem[]) => {
    startTransition(async () => {
      await addSuggestedItems(
        listId,
        groupId,
        tripId,
        items.map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
        }))
      );
      fetchLists();
    });
  };

  // Open modal for add/edit
  const openItemModal = (listId: string, item?: PackingItem) => {
    setSelectedListId(listId);
    if (item) {
      setEditingItem(item);
      setItemName(item.item_name);
      setItemCategory(item.category);
      setItemQuantity(item.quantity.toString());
      setItemNotes(item.notes || "");
    } else {
      setEditingItem(null);
      setItemName("");
      setItemCategory("misc");
      setItemQuantity("1");
      setItemNotes("");
    }
    setShowItemModal(true);
  };

  // Handle save item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !selectedListId) return;

    startTransition(async () => {
      if (editingItem) {
        await updatePackingItem(editingItem.id, groupId, tripId, {
          item_name: itemName,
          category: itemCategory,
          quantity: parseInt(itemQuantity) || 1,
          notes: itemNotes || null,
        });
      } else {
        await addPackingItem(selectedListId, groupId, tripId, {
          item_name: itemName,
          category: itemCategory,
          quantity: parseInt(itemQuantity) || 1,
          notes: itemNotes || undefined,
        });
      }
      setShowItemModal(false);
      fetchLists();
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Packing Lists</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Don&apos;t forget the essentials!
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall progress */}
          {allItems.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <div className="w-20 h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress.percentage}%` }}
                  className="h-full bg-green-500 rounded-full"
                />
              </div>
              <span className="text-sm font-medium">
                {overallProgress.packed}/{overallProgress.total}
              </span>
            </div>
          )}

          {/* Suggestions button */}
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`
              px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
              ${showSuggestions ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}
            `}
          >
            <span>💡</span>
            Suggestions
          </button>
        </div>
      </div>

      {/* Suggestions panel */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  <span className="font-medium">Suggested Items</span>
                  <span className="text-sm text-muted-foreground">for your trip</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedItems.slice(0, 12).map((item, idx) => {
                  // Check if already added
                  const alreadyAdded = allItems.some(
                    (i) => i.item_name.toLowerCase() === item.name.toLowerCase()
                  );

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!alreadyAdded && sharedList) {
                          handleAddSuggested(sharedList.id, [item]);
                        }
                      }}
                      disabled={alreadyAdded || isPending}
                      className={`
                        px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all
                        ${alreadyAdded
                          ? "bg-green-100 text-green-700 cursor-default"
                          : "bg-white hover:bg-amber-100 border border-amber-200"
                        }
                      `}
                    >
                      {alreadyAdded ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>+</span>
                      )}
                      {item.name}
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-muted-foreground">({item.quantity})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {sharedList && (
                <div className="mt-3 pt-3 border-t border-amber-200 flex justify-end">
                  <button
                    onClick={() => handleAddSuggested(sharedList.id, suggestedItems)}
                    disabled={isPending}
                    className="text-sm text-amber-700 hover:text-amber-800 font-medium"
                  >
                    Add All Suggestions to Group List
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared list */}
      {sharedList && (
        <PackingListComponent
          list={sharedList}
          groupId={groupId}
          tripId={tripId}
          personalListId={personalList?.id}
          onUpdate={fetchLists}
          onEditItem={(item) => openItemModal(sharedList.id, item)}
        />
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-background text-sm text-muted-foreground">
            Your Personal List
          </span>
        </div>
      </div>

      {/* Personal list */}
      {personalList && (
        <PackingListComponent
          list={personalList}
          groupId={groupId}
          tripId={tripId}
          onUpdate={fetchLists}
          onEditItem={(item) => openItemModal(personalList.id, item)}
        />
      )}

      {/* Category legend */}
      <div className="pt-4 border-t border-border">
        <div className="flex flex-wrap gap-3">
          {PACKING_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5 text-sm">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: cat.bgColor }}
              >
                {cat.icon}
              </span>
              <span className="text-muted-foreground">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Item modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-black/50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4"
            >
              <div className="p-6">
                <h3 className="font-heading font-semibold text-lg mb-4">
                  {editingItem ? "Edit Item" : "Add Packing Item"}
                </h3>

                <form onSubmit={handleSaveItem} className="space-y-4">
                  {/* Item name */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Item Name</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Sunscreen SPF 50"
                      className="input w-full"
                      autoFocus
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PACKING_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setItemCategory(cat.id)}
                          className={`
                            p-2 rounded-lg text-center transition-all
                            ${itemCategory === cat.id
                              ? "ring-2 ring-primary ring-offset-1"
                              : "hover:bg-muted"
                            }
                          `}
                          style={{
                            backgroundColor: itemCategory === cat.id ? cat.bgColor : undefined,
                          }}
                        >
                          <div className="text-lg">{cat.icon}</div>
                          <div className="text-xs mt-0.5">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Quantity</label>
                    <input
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      min="1"
                      className="input w-24"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                    <input
                      type="text"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="e.g., The reef-safe kind"
                      className="input w-full"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowItemModal(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !itemName.trim()}
                      className="btn-primary"
                    >
                      {isPending ? "Saving..." : editingItem ? "Update" : "Add Item"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PackingTab;
