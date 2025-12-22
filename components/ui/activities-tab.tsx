"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TripActivity, getActivities } from "@/lib/activities";
import {
  ActivityCategory,
  ActivityStatus,
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
} from "@/lib/activity-constants";
import ActivityCard from "./activity-card";
import ActivityModal from "./activity-modal";

interface ActivitiesTabProps {
  groupId: string;
  tripId: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  currency?: string;
  currentUserId?: string;
}

type FilterType = "all" | ActivityCategory | ActivityStatus;
type SortType = "date" | "status" | "name" | "cost";

export function ActivitiesTab({
  groupId,
  tripId,
  tripStartDate,
  tripEndDate,
  currency = "USD",
  currentUserId,
}: ActivitiesTabProps) {
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("date");
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<TripActivity | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    const data = await getActivities(tripId);
    setActivities(data);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    // Check if filter is a category
    if (ACTIVITY_CATEGORIES.some((c) => c.id === filter)) {
      return activity.category === filter;
    }
    // Check if filter is a status
    if (ACTIVITY_STATUSES.some((s) => s.id === filter)) {
      return activity.status === filter;
    }
    return true;
  });

  // Sort activities
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    switch (sort) {
      case "date":
        if (!a.activity_date && !b.activity_date) return 0;
        if (!a.activity_date) return 1;
        if (!b.activity_date) return -1;
        return a.activity_date.localeCompare(b.activity_date);
      case "status":
        const statusOrder = ACTIVITY_STATUSES.map((s) => s.id);
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      case "name":
        return a.name.localeCompare(b.name);
      case "cost":
        return (b.cost_per_person || 0) - (a.cost_per_person || 0);
      default:
        return 0;
    }
  });

  // Get activity stats
  const stats = {
    total: activities.length,
    ideas: activities.filter((a) => a.status === "idea").length,
    booked: activities.filter((a) => a.status === "booked" || a.status === "confirmed").length,
    myGoing: activities.filter((a) =>
      a.participants?.some((p) => p.user_id === currentUserId && p.status === "going")
    ).length,
  };

  // Open modal for add/edit
  const openModal = (activity?: TripActivity) => {
    setEditingActivity(activity || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingActivity(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Activities & Excursions</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} activities • {stats.booked} booked • {stats.myGoing} you&apos;re going to
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
              ${showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>

          <button onClick={() => openModal()} className="btn-primary text-sm">
            + Add Activity
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
              {/* Category filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      filter === "all" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                  {ACTIVITY_CATEGORIES.map((cat) => {
                    const count = activities.filter((a) => a.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                          filter === cat.id
                            ? ""
                            : "bg-card hover:bg-muted"
                        }`}
                        style={
                          filter === cat.id
                            ? { backgroundColor: cat.bgColor, color: cat.color }
                            : undefined
                        }
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        {count > 0 && (
                          <span className="text-xs opacity-70">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_STATUSES.map((status) => {
                    const count = activities.filter((a) => a.status === status.id).length;
                    return (
                      <button
                        key={status.id}
                        onClick={() => setFilter(status.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                          filter === status.id
                            ? ""
                            : "bg-card hover:bg-muted"
                        }`}
                        style={
                          filter === status.id
                            ? { backgroundColor: status.bgColor, color: status.color }
                            : undefined
                        }
                      >
                        <span>{status.icon}</span>
                        <span>{status.label}</span>
                        {count > 0 && (
                          <span className="text-xs opacity-70">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="input text-sm py-1.5"
                >
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                  <option value="name">Name</option>
                  <option value="cost">Cost (High to Low)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stats cards */}
      {activities.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Activities</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="text-2xl font-bold">{stats.ideas}</div>
            <div className="text-sm text-muted-foreground">Ideas</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="text-2xl font-bold text-green-600">{stats.booked}</div>
            <div className="text-sm text-muted-foreground">Booked</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="text-2xl font-bold text-primary">{stats.myGoing}</div>
            <div className="text-sm text-muted-foreground">You&apos;re Going</div>
          </div>
        </div>
      )}

      {/* Activities list */}
      {activities.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-heading font-semibold text-lg mb-2">No Activities Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add optional activities and excursions that group members can opt into.
            Perfect for trips where not everyone wants to do the same things!
          </p>
          <button onClick={() => openModal()} className="btn-primary">
            Add Your First Activity
          </button>
        </div>
      ) : sortedActivities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No activities match your filters</p>
          <button
            onClick={() => setFilter("all")}
            className="text-sm text-primary hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              groupId={groupId}
              tripId={tripId}
              currentUserId={currentUserId}
              onEdit={() => openModal(activity)}
              onDelete={() => {
                // Delete is handled in the modal
                openModal(activity);
              }}
              onRsvpChange={fetchActivities}
            />
          ))}
        </div>
      )}

      {/* Category legend */}
      {activities.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="flex flex-wrap gap-3">
            {ACTIVITY_CATEGORIES.map((cat) => (
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
      )}

      {/* Activity Modal */}
      <ActivityModal
        isOpen={showModal}
        onClose={closeModal}
        activity={editingActivity}
        groupId={groupId}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        currency={currency}
        onSaved={fetchActivities}
      />
    </div>
  );
}

export default ActivitiesTab;
