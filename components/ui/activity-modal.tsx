"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TripActivity } from "@/lib/activities";
import {
  ActivityCategory,
  ActivityStatus,
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
} from "@/lib/activity-constants";
import { createActivity, updateActivity, deleteActivity } from "@/lib/activities";

export interface ActivityFormData {
  name: string;
  description: string;
  category: ActivityCategory;
  activity_date: string;
  start_time: string;
  end_time: string;
  location: string;
  map_link: string;
  cost_per_person: string;
  min_people: string;
  max_people: string;
  status: ActivityStatus;
  booking_url: string;
  confirmation_number: string;
  notes: string;
  is_group_activity: boolean;
  currency: string;
}

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: TripActivity | null;
  groupId: string;
  tripId: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  currency?: string;
  onSaved?: () => void;
}

const initialFormData: ActivityFormData = {
  name: "",
  description: "",
  category: "other",
  activity_date: "",
  start_time: "",
  end_time: "",
  location: "",
  map_link: "",
  cost_per_person: "",
  min_people: "",
  max_people: "",
  status: "idea",
  booking_url: "",
  confirmation_number: "",
  notes: "",
  is_group_activity: false,
  currency: "USD",
};

export function ActivityModal({
  isOpen,
  onClose,
  activity,
  groupId,
  tripId,
  tripStartDate,
  tripEndDate,
  currency = "USD",
  onSaved,
}: ActivityModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<ActivityFormData>({
    ...initialFormData,
    currency,
  });
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name || "",
        description: activity.description || "",
        category: activity.category || "other",
        activity_date: activity.activity_date || "",
        start_time: activity.start_time || "",
        end_time: activity.end_time || "",
        location: activity.location || "",
        map_link: activity.map_link || "",
        cost_per_person: activity.cost_per_person?.toString() || "",
        min_people: activity.min_people?.toString() || "",
        max_people: activity.max_people?.toString() || "",
        status: activity.status || "idea",
        booking_url: activity.booking_url || "",
        confirmation_number: activity.confirmation_number || "",
        notes: activity.notes || "",
        is_group_activity: activity.is_group_activity || false,
        currency: activity.currency || currency,
      });
    } else {
      setFormData({
        ...initialFormData,
        currency,
        activity_date: tripStartDate || "",
      });
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [activity, currency, tripStartDate, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Activity name is required");
      return;
    }

    startTransition(async () => {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        activity_date: formData.activity_date || undefined,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        location: formData.location || undefined,
        map_link: formData.map_link || undefined,
        category: formData.category,
        cost_per_person: formData.cost_per_person ? parseFloat(formData.cost_per_person) : undefined,
        min_people: formData.min_people ? parseInt(formData.min_people) : undefined,
        max_people: formData.max_people ? parseInt(formData.max_people) : undefined,
        is_group_activity: formData.is_group_activity,
        status: formData.status,
        booking_url: formData.booking_url || undefined,
        confirmation_number: formData.confirmation_number || undefined,
        notes: formData.notes || undefined,
        currency: formData.currency,
      };

      let result;
      if (activity) {
        result = await updateActivity(activity.id, groupId, tripId, data);
      } else {
        result = await createActivity(tripId, groupId, data);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onSaved?.();
        onClose();
      }
    });
  };

  const handleDelete = () => {
    if (!activity) return;

    startTransition(async () => {
      const result = await deleteActivity(activity.id, groupId, tripId);
      if (result.error) {
        setError(result.error);
      } else {
        onSaved?.();
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-heading font-semibold text-lg">
              {activity ? "Edit Activity" : "Add Activity"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-5">
              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Snorkeling at Blue Lagoon"
                  className="input w-full"
                  required
                />
              </div>

              {/* Category and Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    {ACTIVITY_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What's this activity about?"
                  className="input w-full resize-none"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    name="activity_date"
                    value={formData.activity_date}
                    onChange={handleChange}
                    min={tripStartDate || undefined}
                    max={tripEndDate || undefined}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Location and Map Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Comino Island"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Map Link</label>
                  <input
                    type="url"
                    name="map_link"
                    value={formData.map_link}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/..."
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Cost and People */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Cost per Person</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formData.currency === "USD" ? "$" : formData.currency}
                    </span>
                    <input
                      type="number"
                      name="cost_per_person"
                      value={formData.cost_per_person}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="input w-full pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Min People</label>
                  <input
                    type="number"
                    name="min_people"
                    value={formData.min_people}
                    onChange={handleChange}
                    min="1"
                    placeholder="Optional"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Max People</label>
                  <input
                    type="number"
                    name="max_people"
                    value={formData.max_people}
                    onChange={handleChange}
                    min="1"
                    placeholder="Optional"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Group activity checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_group_activity"
                  name="is_group_activity"
                  checked={formData.is_group_activity}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="is_group_activity" className="text-sm">
                  Required for everyone (group activity)
                </label>
              </div>

              {/* Booking section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium mb-3">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Booking URL</label>
                    <input
                      type="url"
                      name="booking_url"
                      value={formData.booking_url}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Confirmation #</label>
                    <input
                      type="text"
                      name="confirmation_number"
                      value={formData.confirmation_number}
                      onChange={handleChange}
                      placeholder="e.g., ABC123"
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional info (meeting point, what to bring, etc.)"
                  className="input w-full resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              {activity ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isPending}
                  className="text-sm text-destructive hover:underline"
                >
                  Delete Activity
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
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
                  className="btn-primary"
                >
                  {isPending ? "Saving..." : activity ? "Update Activity" : "Add Activity"}
                </button>
              </div>
            </div>
          </form>

          {/* Delete confirmation overlay */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-card/95 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🗑️</div>
                <h3 className="font-heading font-semibold text-lg mb-2">Delete Activity?</h3>
                <p className="text-muted-foreground mb-4">
                  This will remove &quot;{activity?.name}&quot; and all RSVPs. This cannot be undone.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="btn-primary bg-destructive hover:bg-destructive/90"
                  >
                    {isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ActivityModal;
