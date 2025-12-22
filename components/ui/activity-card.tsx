"use client";

import { useState, useTransition } from "react";
import { TripActivity } from "@/lib/activities";
import {
  getCategoryConfig,
  getStatusConfig,
  getParticipantStatusConfig,
  formatActivityDate,
  formatTimeRange,
  formatCurrency,
  isMinPeopleMet,
  getSpotsRemaining,
  isActivityFull,
  ParticipantStatus,
  PARTICIPANT_STATUSES,
} from "@/lib/activity-constants";
import { respondToActivity, removeRsvp } from "@/lib/activities";

interface ActivityCardProps {
  activity: TripActivity;
  groupId: string;
  tripId: string;
  currentUserId?: string;
  onEdit: () => void;
  onDelete: () => void;
  onRsvpChange?: () => void;
}

export function ActivityCard({
  activity,
  groupId,
  tripId,
  currentUserId,
  onEdit,
  onDelete,
  onRsvpChange,
}: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<ParticipantStatus | null>(null);

  const categoryConfig = getCategoryConfig(activity.category);
  const statusConfig = getStatusConfig(activity.status);

  // Find current user's RSVP
  const myParticipant = activity.participants?.find(
    (p) => p.user_id === currentUserId
  );
  const currentRsvpStatus = optimisticStatus ?? myParticipant?.status ?? null;

  // Get counts
  const counts = activity.participant_counts || {
    going: 0,
    maybe: 0,
    not_going: 0,
    interested: 0,
  };

  // Check requirements
  const minMet = isMinPeopleMet(counts.going, activity.min_people);
  const spotsLeft = getSpotsRemaining(counts.going, activity.max_people);
  const isFull = isActivityFull(counts.going, activity.max_people);

  // Is creator?
  const isCreator = currentUserId === activity.created_by;

  // Handle RSVP
  const handleRsvp = (status: ParticipantStatus) => {
    if (!currentUserId) return;

    // If clicking same status, remove RSVP
    if (status === currentRsvpStatus) {
      setOptimisticStatus(null);
      startTransition(async () => {
        const result = await removeRsvp(activity.id, groupId, tripId);
        if (result.error) {
          setOptimisticStatus(currentRsvpStatus);
        }
        onRsvpChange?.();
      });
    } else {
      setOptimisticStatus(status);
      startTransition(async () => {
        const result = await respondToActivity(activity.id, groupId, tripId, status);
        if (result.error) {
          setOptimisticStatus(currentRsvpStatus);
        }
        onRsvpChange?.();
      });
    }
  };

  // Format time
  const timeDisplay = formatTimeRange(activity.start_time, activity.end_time);
  const dateDisplay = formatActivityDate(activity.activity_date);

  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all hover:shadow-md
        ${isPending ? "opacity-75" : ""}
        border-border bg-card
      `}
    >
      {/* Category color strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg"
        style={{ backgroundColor: categoryConfig.color }}
      />

      <div className="pl-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Category icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
              style={{ backgroundColor: categoryConfig.bgColor }}
            >
              {categoryConfig.icon}
            </div>

            {/* Title, price, badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-base truncate">{activity.name}</h4>
                {activity.cost_per_person && activity.cost_per_person > 0 && (
                  <span className="text-sm font-medium text-primary">
                    {formatCurrency(activity.cost_per_person, activity.currency)}/pp
                  </span>
                )}
              </div>

              {/* Status and category badges */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                >
                  <span>{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: categoryConfig.bgColor, color: categoryConfig.color }}
                >
                  {categoryConfig.label}
                </span>

                {/* Booking indicator */}
                {activity.confirmation_number && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                    Booked
                  </span>
                )}

                {/* Min people warning */}
                {activity.min_people && !minMet && (
                  <span className="text-xs text-amber-600">
                    Need {activity.min_people - counts.going} more
                  </span>
                )}

                {/* Spots remaining */}
                {spotsLeft !== null && spotsLeft > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                  </span>
                )}

                {isFull && (
                  <span className="text-xs text-red-600 font-medium">Full</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          {isCreator && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
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
          )}
        </div>

        {/* Description */}
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Date, time, location row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
          {dateDisplay && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">📅</span>
              {dateDisplay}
              {timeDisplay && <span className="text-muted-foreground">at {timeDisplay}</span>}
            </span>
          )}
          {activity.location && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">📍</span>
              {activity.map_link ? (
                <a
                  href={activity.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {activity.location}
                </a>
              ) : (
                activity.location
              )}
            </span>
          )}
        </div>

        {/* Participants summary + avatars */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            {/* Count badges */}
            <div className="flex items-center gap-2 text-sm">
              {counts.going > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>{counts.going} going</span>
                </span>
              )}
              {counts.maybe > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span>{counts.maybe} maybe</span>
                </span>
              )}
              {counts.interested > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>{counts.interested} interested</span>
                </span>
              )}
            </div>

            {/* Participant avatars */}
            {activity.participants && activity.participants.length > 0 && (
              <div className="flex -space-x-2">
                {activity.participants
                  .filter((p) => p.status === "going" || p.status === "maybe")
                  .slice(0, 5)
                  .map((p) => {
                    const statusConf = getParticipantStatusConfig(p.status);
                    const name = p.user?.display_name || p.user?.full_name || "?";
                    return (
                      <div
                        key={p.id}
                        className="relative"
                        title={`${name} - ${statusConf.shortLabel}`}
                      >
                        {p.user?.avatar_url ? (
                          <img
                            src={p.user.avatar_url}
                            alt={name}
                            className="w-7 h-7 rounded-full border-2 border-background object-cover"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium"
                            style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                          >
                            {name[0].toUpperCase()}
                          </div>
                        )}
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-background flex items-center justify-center text-[8px]"
                          style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                        >
                          {statusConf.icon}
                        </span>
                      </div>
                    );
                  })}
                {activity.participants.filter((p) => p.status === "going" || p.status === "maybe").length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                    +{activity.participants.filter((p) => p.status === "going" || p.status === "maybe").length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick RSVP buttons */}
        {currentUserId && (
          <div className="flex items-center gap-2 mt-3">
            {PARTICIPANT_STATUSES.filter((s) => s.id !== "interested").map((status) => {
              const isActive = currentRsvpStatus === status.id;
              const isDisabled = isFull && status.id === "going" && !isActive;

              return (
                <button
                  key={status.id}
                  onClick={() => !isDisabled && handleRsvp(status.id)}
                  disabled={isPending || isDisabled}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                    flex items-center justify-center gap-1.5
                    ${isActive
                      ? "ring-2 ring-offset-1"
                      : "hover:opacity-80"
                    }
                    ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                  style={{
                    backgroundColor: isActive ? status.bgColor : "#f3f4f6",
                    color: isActive ? status.color : "#6b7280",
                    ...(isActive && { ringColor: status.color }),
                  }}
                >
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Booking info */}
        {(activity.booking_url || activity.confirmation_number) && (
          <div className="mt-3 pt-3 border-t border-border text-sm">
            <div className="flex items-center gap-4 flex-wrap">
              {activity.booking_url && (
                <a
                  href={activity.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Booking
                </a>
              )}
              {activity.confirmation_number && (
                <span className="text-muted-foreground">
                  Confirmation: <span className="font-mono">{activity.confirmation_number}</span>
                </span>
              )}
              {activity.booker && (
                <span className="text-muted-foreground">
                  Booked by {activity.booker.display_name || activity.booker.full_name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityCard;
