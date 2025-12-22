"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BringListItem, BringListCategory } from "@/lib/bring-list";
import { claimItem, suggestItem, addItem, updateItem } from "@/lib/bring-list";
import { DEFAULT_CATEGORIES } from "@/lib/bring-list-constants";

// ============================================
// CLAIM ITEM MODAL
// ============================================

interface ClaimItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BringListItem;
  groupId: string;
  onClaimed: () => void;
}

export function ClaimItemModal({
  isOpen,
  onClose,
  item,
  groupId,
  onClaimed,
}: ClaimItemModalProps) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await claimItem(item.id, groupId, note || undefined);
      onClaimed();
      onClose();
      setNote("");
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-lg">
                  You're bringing:
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xl font-medium text-amber-700 dark:text-amber-400 mt-1">
                {item.item_name}
              </p>
              {item.notes && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  Note: {item.notes}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Any notes? <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="I'll make my grandma's recipe!"
                  className="input w-full"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isPending ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


// ============================================
// SUGGEST ITEM MODAL
// ============================================

interface SuggestItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  groupId: string;
  categories: BringListCategory[];
  onSuggested: () => void;
}

export function SuggestItemModal({
  isOpen,
  onClose,
  listId,
  groupId,
  categories,
  onSuggested,
}: SuggestItemModalProps) {
  const [isPending, startTransition] = useTransition();
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [claimIt, setClaimIt] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    startTransition(async () => {
      await suggestItem(listId, groupId, {
        itemName,
        categoryId: categoryId || undefined,
        notes: notes || undefined,
        claimIt,
      });
      onSuggested();
      onClose();
      setItemName("");
      setCategoryId("");
      setNotes("");
      setClaimIt(true);
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-lg">
                  Suggest Something to Bring
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What would you like to bring? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Guacamole"
                  className="input w-full"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Homemade!"
                  className="input w-full"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={claimIt}
                  onChange={(e) => setClaimIt(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm">I'll bring this</span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !itemName.trim()}
                className="btn-primary"
              >
                {isPending ? "Adding..." : "Add to List"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


// ============================================
// ADD/EDIT ITEM MODAL (Host)
// ============================================

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  groupId: string;
  categories: BringListCategory[];
  item?: BringListItem | null;
  onSaved: () => void;
}

export function AddEditItemModal({
  isOpen,
  onClose,
  listId,
  groupId,
  categories,
  item,
  onSaved,
}: AddEditItemModalProps) {
  const [isPending, startTransition] = useTransition();
  const [itemName, setItemName] = useState(item?.item_name || "");
  const [categoryId, setCategoryId] = useState<string>(item?.category_id || "");
  const [quantityNeeded, setQuantityNeeded] = useState(item?.quantity_needed || 1);
  const [notes, setNotes] = useState(item?.notes || "");

  // Reset form when modal opens with different item
  useState(() => {
    if (isOpen) {
      setItemName(item?.item_name || "");
      setCategoryId(item?.category_id || "");
      setQuantityNeeded(item?.quantity_needed || 1);
      setNotes(item?.notes || "");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    startTransition(async () => {
      if (item) {
        await updateItem(item.id, groupId, {
          itemName,
          categoryId: categoryId || undefined,
          quantityNeeded,
          notes: notes || undefined,
        });
      } else {
        await addItem(listId, groupId, {
          itemName,
          categoryId: categoryId || undefined,
          quantityNeeded,
          notes: notes || undefined,
        });
      }
      onSaved();
      onClose();
      setItemName("");
      setCategoryId("");
      setQuantityNeeded(1);
      setNotes("");
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-lg">
                  {item ? "Edit Item" : "Add Item"}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Pasta Salad"
                  className="input w-full"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity Needed</label>
                <input
                  type="number"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(parseInt(e.target.value) || 1)}
                  min="1"
                  max="99"
                  className="input w-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No nuts please, enough for 10 people"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !itemName.trim()}
                className="btn-primary"
              >
                {isPending ? "Saving..." : item ? "Update" : "Add Item"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
