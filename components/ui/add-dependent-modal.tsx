"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TripDependent } from "@/lib/dependents";
import {
  DependentType,
  AgeGroup,
  DEPENDENT_TYPES,
  AGE_GROUPS,
  defaultAgeGroupForType,
  inferAgeGroup,
} from "@/lib/dependent-constants";
import { addDependent, updateDependent, deleteDependent } from "@/lib/dependents";

interface AddDependentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  groupId: string;
  members: {
    id: string;
    display_name: string | null;
    full_name: string | null;
  }[];
  currentUserId: string;
  dependent?: TripDependent | null;
  onSaved?: () => void;
}

export function AddDependentModal({
  isOpen,
  onClose,
  tripId,
  groupId,
  members,
  currentUserId,
  dependent,
  onSaved,
}: AddDependentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<DependentType>("child");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("child");
  const [age, setAge] = useState("");
  const [responsibleMember, setResponsibleMember] = useState(currentUserId);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (dependent) {
      setName(dependent.name);
      setType(dependent.type);
      setAgeGroup(dependent.age_group);
      setAge(dependent.age?.toString() || "");
      setResponsibleMember(dependent.responsible_member);
      setNotes(dependent.notes || "");
    } else {
      setName("");
      setType("child");
      setAgeGroup("child");
      setAge("");
      setResponsibleMember(currentUserId);
      setNotes("");
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [dependent, currentUserId, isOpen]);

  // Auto-update age group when type changes
  const handleTypeChange = (newType: DependentType) => {
    setType(newType);
    // Only auto-set age group if not editing and no age entered
    if (!dependent && !age) {
      setAgeGroup(defaultAgeGroupForType(newType));
    }
  };

  // Auto-update age group when age changes
  const handleAgeChange = (newAge: string) => {
    setAge(newAge);
    const ageNum = parseInt(newAge);
    if (!isNaN(ageNum) && ageNum >= 0) {
      setAgeGroup(inferAgeGroup(ageNum));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    startTransition(async () => {
      const data = {
        name: name.trim(),
        type,
        age_group: ageGroup,
        age: age ? parseInt(age) : null,
        responsible_member: responsibleMember,
        notes: notes.trim() || undefined,
      };

      let result;
      if (dependent) {
        result = await updateDependent(dependent.id, groupId, tripId, data);
      } else {
        result = await addDependent(tripId, groupId, data);
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
    if (!dependent) return;

    startTransition(async () => {
      const result = await deleteDependent(dependent.id, groupId, tripId);
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
          className="relative bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-heading font-semibold text-lg">
              {dependent ? "Edit Person" : "Add Person to Trip"}
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Emma, Jake, Lisa"
                  className="input w-full"
                  autoFocus
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPENDENT_TYPES.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTypeChange(t.id)}
                      className={`
                        p-3 rounded-lg text-left transition-all border
                        ${type === t.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/30"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{t.icon}</span>
                        <span className="text-sm font-medium">{t.shortLabel}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-sm font-medium mb-2">Age Group</label>
                <div className="flex gap-2">
                  {AGE_GROUPS.map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setAgeGroup(ag.id)}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-center transition-all
                        ${ageGroup === ag.id
                          ? "ring-2 ring-offset-1"
                          : "hover:opacity-80"
                        }
                      `}
                      style={{
                        backgroundColor: ageGroup === ag.id ? ag.bgColor : "#f3f4f6",
                        color: ageGroup === ag.id ? ag.color : "#6b7280",
                        ...(ageGroup === ag.id && { ringColor: ag.color }),
                      }}
                    >
                      <div className="text-sm font-medium">{ag.label}</div>
                      <div className="text-xs opacity-75">{ag.ageRange}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age (optional) */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Age <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="e.g., 8"
                  min="0"
                  max="120"
                  className="input w-24"
                />
              </div>

              {/* Responsible Member */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Who&apos;s responsible for payment?
                </label>
                <select
                  value={responsibleMember}
                  onChange={(e) => setResponsibleMember(e.target.value)}
                  className="input w-full"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.full_name}
                      {m.id === currentUserId ? " (You)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  This person will be responsible for paying for expenses
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Vickie's friend's daughter"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              {dependent ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isPending}
                  className="text-sm text-destructive hover:underline"
                >
                  Remove Person
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
                  {isPending ? "Saving..." : dependent ? "Update" : "Add Person"}
                </button>
              </div>
            </div>
          </form>

          {/* Delete confirmation overlay */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-card/95 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-4xl mb-3">👋</div>
                <h3 className="font-heading font-semibold text-lg mb-2">Remove Person?</h3>
                <p className="text-muted-foreground mb-4">
                  Remove &quot;{dependent?.name}&quot; from this trip? This will also remove them from any expense splits.
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
                    {isPending ? "Removing..." : "Remove"}
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

export default AddDependentModal;
