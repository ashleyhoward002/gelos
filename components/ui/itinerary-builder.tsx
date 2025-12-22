"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TripItineraryItem,
  ItineraryItemType,
  ItineraryItemStatus,
  ItineraryParticipantStatus,
  TripAttendee,
} from "@/lib/outings";
import {
  ITINERARY_CATEGORIES,
  ITINERARY_STATUSES,
  getCategoryConfig,
  getStatusConfig,
  formatTime,
  formatTimeRange,
  formatItineraryDate,
  getDayNumber,
  generateDateRange,
} from "@/lib/itinerary-constants";

interface ItineraryBuilderProps {
  items: TripItineraryItem[];
  tripStartDate: string;
  tripEndDate: string;
  attendees: TripAttendee[];
  groupId: string;
  outingId: string;
  currentUserId?: string;
  currency?: string;
  onAddItem: (date: string) => void;
  onEditItem: (item: TripItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItems: (date: string, itemIds: string[]) => void;
  onUpdateParticipation: (itemId: string, status: ItineraryParticipantStatus) => void;
  onDuplicateItem: (itemId: string, targetDate?: string) => void;
}

export function ItineraryBuilder({
  items,
  tripStartDate,
  tripEndDate,
  attendees,
  groupId,
  outingId,
  currentUserId,
  currency = "USD",
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorderItems,
  onUpdateParticipation,
  onDuplicateItem,
}: ItineraryBuilderProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; index: number } | null>(null);

  // Generate all dates in the trip range
  const tripDates = generateDateRange(tripStartDate, tripEndDate);

  // Group items by date
  const itemsByDate: Record<string, TripItineraryItem[]> = {};
  tripDates.forEach((date) => {
    itemsByDate[date] = items.filter((item) => item.item_date === date);
  });

  // Toggle day expansion
  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Expand all days
  const expandAll = () => {
    setExpandedDays(new Set(tripDates));
  };

  // Collapse all days
  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  // Calculate total cost for a day
  const getDayCost = (dayItems: TripItineraryItem[]): number => {
    return dayItems.reduce((sum, item) => sum + (item.cost || item.estimated_cost || 0), 0);
  };

  // Get total trip cost
  const getTotalCost = (): number => {
    return items.reduce((sum, item) => sum + (item.cost || item.estimated_cost || 0), 0);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, date: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ date, index });
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    if (!draggedItem || !dropTarget) return;

    const draggedItemData = items.find((i) => i.id === draggedItem);
    if (!draggedItemData) return;

    // Get items for the target date
    const targetItems = [...(itemsByDate[date] || [])];

    // If moving within the same date
    if (draggedItemData.item_date === date) {
      const currentIndex = targetItems.findIndex((i) => i.id === draggedItem);
      if (currentIndex !== dropTarget.index) {
        // Remove from current position
        targetItems.splice(currentIndex, 1);
        // Insert at new position
        const newIndex = dropTarget.index > currentIndex ? dropTarget.index - 1 : dropTarget.index;
        targetItems.splice(newIndex, 0, draggedItemData);
        // Update order
        onReorderItems(date, targetItems.map((i) => i.id));
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Get user's participation status for an item
  const getUserParticipation = (item: TripItineraryItem): ItineraryParticipantStatus | null => {
    if (!currentUserId) return null;
    const participant = item.participants?.find((p) => p.user_id === currentUserId);
    return participant?.status || null;
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-heading font-semibold text-lg">Trip Itinerary</h3>
          {getTotalCost() > 0 && (
            <span className="text-sm text-muted-foreground">
              Est. total: {currency} {getTotalCost().toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-3">
        {tripDates.map((date, dayIndex) => {
          const dayItems = itemsByDate[date] || [];
          const dayNumber = getDayNumber(date, tripStartDate);
          const isExpanded = expandedDays.has(date);
          const dayCost = getDayCost(dayItems);

          return (
            <div
              key={date}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Day header */}
              <button
                onClick={() => toggleDay(date)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-heading font-bold text-primary">
                      {dayNumber}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{formatItineraryDate(date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {dayItems.length} {dayItems.length === 1 ? "item" : "items"}
                      {dayCost > 0 && ` - ${currency} ${dayCost.toFixed(2)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Category indicators */}
                  <div className="flex -space-x-1">
                    {Array.from(new Set(dayItems.map((i) => i.item_type)))
                      .slice(0, 3)
                      .map((type) => {
                        const config = getCategoryConfig(type as ItineraryItemType);
                        return (
                          <span
                            key={type}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: config.bgColor }}
                          >
                            {config.icon}
                          </span>
                        );
                      })}
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Day content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border"
                  >
                    <div className="p-4">
                      {dayItems.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">📅</div>
                          <p className="text-muted-foreground mb-3">No activities planned</p>
                          <button
                            onClick={() => onAddItem(date)}
                            className="btn-primary text-sm"
                          >
                            Add Activity
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayItems.map((item, index) => (
                            <ItineraryItemCard
                              key={item.id}
                              item={item}
                              index={index}
                              currency={currency}
                              currentUserId={currentUserId}
                              userParticipation={getUserParticipation(item)}
                              isDragging={draggedItem === item.id}
                              isDropTarget={dropTarget?.date === date && dropTarget?.index === index}
                              onEdit={() => onEditItem(item)}
                              onDelete={() => onDeleteItem(item.id)}
                              onDuplicate={() => onDuplicateItem(item.id)}
                              onParticipationChange={(status) => onUpdateParticipation(item.id, status)}
                              onDragStart={(e) => handleDragStart(e, item.id)}
                              onDragOver={(e) => handleDragOver(e, date, index)}
                              onDragEnd={handleDragEnd}
                              onDrop={(e) => handleDrop(e, date)}
                            />
                          ))}
                          {/* Add item button */}
                          <button
                            onClick={() => onAddItem(date)}
                            className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                          >
                            + Add Activity
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-border">
        <div className="flex flex-wrap gap-3">
          {ITINERARY_CATEGORIES.map((cat) => (
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
    </div>
  );
}

// Itinerary Item Card Component
interface ItineraryItemCardProps {
  item: TripItineraryItem;
  index: number;
  currency: string;
  currentUserId?: string;
  userParticipation: ItineraryParticipantStatus | null;
  isDragging: boolean;
  isDropTarget: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onParticipationChange: (status: ItineraryParticipantStatus) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function ItineraryItemCard({
  item,
  index,
  currency,
  currentUserId,
  userParticipation,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onDuplicate,
  onParticipationChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: ItineraryItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const categoryConfig = getCategoryConfig(item.item_type);
  const statusConfig = getStatusConfig(item.status);
  const timeRange = formatTimeRange(item.start_time, item.end_time);
  const cost = item.cost || item.estimated_cost;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`
        relative rounded-lg border p-3 transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? "opacity-50 border-primary" : "border-border"}
        ${isDropTarget ? "border-primary border-2" : ""}
        hover:shadow-sm
      `}
      style={{
        backgroundColor: isDragging ? categoryConfig.bgColor : undefined,
      }}
    >
      {/* Timeline indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: categoryConfig.color }} />

      <div className="pl-3 flex gap-3">
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
          style={{ backgroundColor: categoryConfig.bgColor }}
        >
          {categoryConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Title and time */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{item.title}</h4>
                {timeRange && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {timeRange}
                  </span>
                )}
              </div>

              {/* Location */}
              {item.location && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  📍 {item.location}
                </p>
              )}

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Status badge */}
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                >
                  {statusConfig.label}
                </span>

                {/* Category badge */}
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: categoryConfig.bgColor, color: categoryConfig.color }}
                >
                  {categoryConfig.label}
                </span>

                {/* Cost */}
                {cost && cost > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {currency} {cost.toFixed(2)}
                  </span>
                )}

                {/* Participants */}
                {item.participants && item.participants.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {item.participants
                        .filter((p) => p.status === "going")
                        .slice(0, 3)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium"
                            title={p.user?.display_name || p.user?.full_name || ""}
                          >
                            {(p.user?.display_name || p.user?.full_name || "?")[0].toUpperCase()}
                          </div>
                        ))}
                    </div>
                    {(item.participant_count || 0) > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{(item.participant_count || 0) - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onDuplicate();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      Duplicate
                    </button>
                    {currentUserId && (
                      <>
                        <hr className="my-1 border-border" />
                        <button
                          onClick={() => {
                            onParticipationChange("going");
                            setShowMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                            userParticipation === "going" ? "text-green-600 font-medium" : ""
                          }`}
                        >
                          {userParticipation === "going" ? "✓ " : ""}I'm going
                        </button>
                        <button
                          onClick={() => {
                            onParticipationChange("maybe");
                            setShowMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                            userParticipation === "maybe" ? "text-yellow-600 font-medium" : ""
                          }`}
                        >
                          {userParticipation === "maybe" ? "✓ " : ""}Maybe
                        </button>
                        <button
                          onClick={() => {
                            onParticipationChange("not_going");
                            setShowMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                            userParticipation === "not_going" ? "text-red-600 font-medium" : ""
                          }`}
                        >
                          {userParticipation === "not_going" ? "✓ " : ""}Not going
                        </button>
                      </>
                    )}
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes preview */}
          {item.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {item.notes}
            </p>
          )}

          {/* Confirmation number */}
          {item.confirmation_number && (
            <p className="text-xs text-muted-foreground mt-1">
              Confirmation: {item.confirmation_number}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItineraryBuilder;
