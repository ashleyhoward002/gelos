"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { PackingItem as PackingItemType } from "@/lib/packing";
import { getCategoryConfig } from "@/lib/packing-constants";
import { toggleItemPacked, deletePackingItem, copyItemToPersonalList } from "@/lib/packing";

interface PackingItemProps {
  item: PackingItemType;
  groupId: string;
  tripId: string;
  isSharedList: boolean;
  personalListId?: string;
  onUpdate?: () => void;
  onEdit?: () => void;
  showAdder?: boolean;
}

export function PackingItemRow({
  item,
  groupId,
  tripId,
  isSharedList,
  personalListId,
  onUpdate,
  onEdit,
  showAdder = true,
}: PackingItemProps) {
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [optimisticPacked, setOptimisticPacked] = useState<boolean | null>(null);

  const categoryConfig = getCategoryConfig(item.category);
  const isPacked = optimisticPacked ?? item.is_packed;

  const handleToggle = () => {
    const newState = !isPacked;
    setOptimisticPacked(newState);

    startTransition(async () => {
      const result = await toggleItemPacked(item.id, groupId, tripId);
      if (result.error) {
        setOptimisticPacked(null);
      }
      onUpdate?.();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deletePackingItem(item.id, groupId, tripId);
      onUpdate?.();
    });
    setShowMenu(false);
  };

  const handleCopyToPersonal = () => {
    if (!personalListId) return;

    startTransition(async () => {
      await copyItemToPersonalList(item.id, personalListId, groupId, tripId);
      onUpdate?.();
    });
    setShowMenu(false);
  };

  const adderName = item.adder?.display_name || item.adder?.full_name;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        group flex items-center gap-3 py-2 px-3 rounded-lg transition-all
        ${isPacked ? "bg-green-50/50" : "hover:bg-muted/50"}
        ${isPending ? "opacity-60" : ""}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`
          relative w-5 h-5 rounded border-2 flex items-center justify-center
          transition-all duration-200 shrink-0
          ${isPacked
            ? "bg-green-500 border-green-500 text-white"
            : "border-muted-foreground/30 hover:border-green-500"
          }
        `}
      >
        {isPacked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </button>

      {/* Item name and details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`
              transition-all duration-200
              ${isPacked ? "line-through text-muted-foreground" : ""}
            `}
          >
            {item.item_name}
            {item.quantity > 1 && (
              <span className="text-muted-foreground ml-1">({item.quantity})</span>
            )}
          </span>
        </div>

        {/* Adder info (for shared lists) */}
        {isSharedList && showAdder && adderName && (
          <span className="text-xs text-muted-foreground">
            Added by {adderName}
          </span>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              )}

              {isSharedList && personalListId && (
                <button
                  onClick={handleCopyToPersonal}
                  disabled={isPending}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Copy to My List
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default PackingItemRow;
