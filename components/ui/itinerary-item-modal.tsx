"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TripItineraryItem,
  ItineraryItemType,
  ItineraryItemStatus,
  TripAttendee,
} from "@/lib/outings";
import {
  ITINERARY_CATEGORIES,
  ITINERARY_STATUSES,
  getCategoryConfig,
  getStatusConfig,
  formatItineraryDate,
} from "@/lib/itinerary-constants";

interface ItineraryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ItineraryItemFormData) => Promise<void>;
  editingItem: TripItineraryItem | null;
  defaultDate: string;
  tripStartDate: string;
  tripEndDate: string;
  attendees: TripAttendee[];
  currency?: string;
}

export interface ItineraryItemFormData {
  id?: string;
  item_date: string;
  start_time?: string;
  end_time?: string;
  title: string;
  location?: string;
  address?: string;
  notes?: string;
  item_type: ItineraryItemType;
  status: ItineraryItemStatus;
  cost?: number;
  estimated_cost?: number;
  confirmation_number?: string;
  booking_url?: string;
}

export function ItineraryItemModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  defaultDate,
  tripStartDate,
  tripEndDate,
  attendees,
  currency = "USD",
}: ItineraryItemModalProps) {
  const [formData, setFormData] = useState<ItineraryItemFormData>({
    item_date: defaultDate,
    title: "",
    item_type: "activity",
    status: "planned",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "cost" | "booking">("details");

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (editingItem) {
      setFormData({
        id: editingItem.id,
        item_date: editingItem.item_date,
        start_time: editingItem.start_time || "",
        end_time: editingItem.end_time || "",
        title: editingItem.title,
        location: editingItem.location || "",
        address: editingItem.address || "",
        notes: editingItem.notes || "",
        item_type: editingItem.item_type,
        status: editingItem.status,
        cost: editingItem.cost || undefined,
        estimated_cost: editingItem.estimated_cost || undefined,
        confirmation_number: editingItem.confirmation_number || "",
        booking_url: editingItem.booking_url || "",
      });
    } else {
      setFormData({
        item_date: defaultDate,
        title: "",
        start_time: "",
        end_time: "",
        location: "",
        address: "",
        notes: "",
        item_type: "activity",
        status: "planned",
        cost: undefined,
        estimated_cost: undefined,
        confirmation_number: "",
        booking_url: "",
      });
    }
    setActiveTab("details");
  }, [editingItem, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.item_date) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving itinerary item:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof ItineraryItemFormData>(
    field: K,
    value: ItineraryItemFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate date options for the trip
  const generateDateOptions = () => {
    const dates: string[] = [];
    const start = new Date(tripStartDate + "T00:00:00");
    const end = new Date(tripEndDate + "T00:00:00");
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold">
              {editingItem ? "Edit Activity" : "Add to Itinerary"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-border">
            <div className="flex gap-4">
              {(["details", "cost", "booking"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "details" ? "Details" : tab === "cost" ? "Cost" : "Booking"}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g., Visit the Colosseum"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ITINERARY_CATEGORIES.map((cat) => {
                      const isSelected = formData.item_type === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => updateField("item_type", cat.id)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div className="text-xs mt-1">{cat.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Date *</label>
                    <select
                      value={formData.item_date}
                      onChange={(e) => updateField("item_date", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      {generateDateOptions().map((date) => (
                        <option key={date} value={date}>
                          {formatItineraryDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => updateField("status", e.target.value as ItineraryItemStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ITINERARY_STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time || ""}
                      onChange={(e) => updateField("start_time", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time || ""}
                      onChange={(e) => updateField("end_time", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Location</label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g., Rome, Italy"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Address</label>
                  <input
                    type="text"
                    value={formData.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full address for maps"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Additional details, tips, etc."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* Cost Tab */}
            {activeTab === "cost" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Track costs for this activity. You can enter the actual cost if known, or an estimate for budgeting.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Actual Cost ({currency})</label>
                    <input
                      type="number"
                      value={formData.cost || ""}
                      onChange={(e) => updateField("cost", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Estimated Cost ({currency})</label>
                    <input
                      type="number"
                      value={formData.estimated_cost || ""}
                      onChange={(e) => updateField("estimated_cost", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Tip: Use estimated cost for planning, then update with actual cost after booking.</p>
                </div>
              </div>
            )}

            {/* Booking Tab */}
            {activeTab === "booking" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Save your booking details here for easy reference during your trip.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirmation Number</label>
                  <input
                    type="text"
                    value={formData.confirmation_number || ""}
                    onChange={(e) => updateField("confirmation_number", e.target.value)}
                    placeholder="e.g., ABC123XYZ"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Booking URL</label>
                  <input
                    type="url"
                    value={formData.booking_url || ""}
                    onChange={(e) => updateField("booking_url", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {formData.status !== "booked" && formData.status !== "confirmed" && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Tip: Update the status to "Booked" or "Confirmed" to indicate this is finalized.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.title.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : editingItem ? "Update" : "Add to Itinerary"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ItineraryItemModal;
