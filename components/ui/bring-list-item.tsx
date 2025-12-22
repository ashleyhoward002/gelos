"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BringListItem as BringListItemType } from "@/lib/bring-list";
import { claimItem, unclaimItem, deleteItem, markItemReceived } from "@/lib/bring-list";
import { getItemStatus, getItemStatusConfig } from "@/lib/bring-list-constants";

interface BringListItemProps {
  item: BringListItemType;
  groupId: string;
  currentUserId: string;
  isHost: boolean;
  onClaimClick: (item: BringListItemType) => void;
  onEditClick?: (item: BringListItemType) => void;
  onRefresh: () => void;
}

export function BringListItemComponent({
  item,
  groupId,
  currentUserId,
  isHost,
  onClaimClick,
  onEditClick,
  onRefresh,
}: BringListItemProps) {
  const [isPending, startTransition] = useTransition();
  const [showActions, setShowActions] = useState(false);

  const status = getItemStatus(item);
  const statusConfig = getItemStatusConfig(status);
  const isClaimedByMe = item.claimed_by === currentUserId;

  const handleUnclaim = () => {
    startTransition(async () => {
      await unclaimItem(item.id, groupId);
      onRefresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("Remove this item from the list?")) return;
    startTransition(async () => {
      await deleteItem(item.id, groupId);
      onRefresh();
    });
  };

  const handleMarkReceived = (received: boolean) => {
    startTransition(async () => {
      await markItemReceived(item.id, groupId, received);
      onRefresh();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group relative flex items-center gap-3 p-3 rounded-lg transition-all
        ${item.is_received ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-muted/50"}
        ${isPending ? "opacity-50" : ""}
      `}
    >
      {/* Status Icon */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm"
        style={{ backgroundColor: statusConfig.bgColor }}
      >
        {statusConfig.icon}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${
              item.is_received ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.item_name}
          </span>
          {item.quantity_needed > 1 && (
            <span className="text-xs text-muted-foreground">
              {item.quantity_claimed > 0 && !item.claimed_by
                ? `(${item.quantity_claimed} of ${item.quantity_needed})`
                : `(need ${item.quantity_needed})`}
            </span>
          )}
          {item.is_suggestion && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              suggested
            </span>
          )}
        </div>

        {/* Claimed by info */}
        {item.claimed_by && (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="text-primary">
              {isClaimedByMe ? "You're" : `${item.claimed_by_name} is`} bringing
            </span>
            {item.claim_note && (
              <span className="italic">- "{item.claim_note}"</span>
            )}
          </div>
        )}

        {/* Notes */}
        {item.notes && !item.claimed_by && (
          <div className="text-xs text-muted-foreground italic">{item.notes}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Unclaimed - Show claim button */}
        {!item.claimed_by && (
          <button
            onClick={() => onClaimClick(item)}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow"
          >
            I'll Bring This!
          </button>
        )}

        {/* Claimed by me - Show cancel */}
        {isClaimedByMe && !item.is_received && (
          <button
            onClick={handleUnclaim}
            disabled={isPending}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
                  >
                    {onEditClick && (
                      <button
                        onClick={() => {
                          setShowActions(false);
                          onEditClick(item);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                    )}

                    {item.claimed_by && !item.is_received && (
                      <button
                        onClick={() => {
                          setShowActions(false);
                          handleMarkReceived(true);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-green-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark Received
                      </button>
                    )}

                    {item.is_received && (
                      <button
                        onClick={() => {
                          setShowActions(false);
                          handleMarkReceived(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Undo Received
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowActions(false);
                        handleDelete();
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default BringListItemComponent;
