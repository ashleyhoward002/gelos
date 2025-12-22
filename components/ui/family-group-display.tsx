"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TripDependent,
  FamilyUnitData,
  getFamilyUnits,
  getPreviousTripsWithDependents,
  copyDependentsFromTrip,
  addMultipleDependents,
} from "@/lib/dependents";
import {
  DependentType,
  AgeGroup,
  getAgeGroupConfig,
  getDependentTypeConfig,
} from "@/lib/dependent-constants";
import AddDependentModal from "./add-dependent-modal";

interface FamilyGroupDisplayProps {
  tripId: string;
  groupId: string;
  currentUserId: string;
  members: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

export function FamilyGroupDisplay({
  tripId,
  groupId,
  currentUserId,
  members,
}: FamilyGroupDisplayProps) {
  const [familyUnits, setFamilyUnits] = useState<FamilyUnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDependent, setEditingDependent] = useState<TripDependent | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCopyFrom, setShowCopyFrom] = useState(false);
  const [previousTrips, setPreviousTrips] = useState<{ id: string; title: string; dependentCount: number }[]>([]);

  // Quick add form state
  const [quickAddNames, setQuickAddNames] = useState("");
  const [quickAddType, setQuickAddType] = useState<DependentType>("child");
  const [quickAddAgeGroup, setQuickAddAgeGroup] = useState<AgeGroup>("child");

  // Fetch family units
  const fetchFamilyUnits = useCallback(async () => {
    const data = await getFamilyUnits(tripId, groupId);
    setFamilyUnits(data);
    setLoading(false);
  }, [tripId, groupId]);

  useEffect(() => {
    fetchFamilyUnits();
  }, [fetchFamilyUnits]);

  // Fetch previous trips for copy feature
  useEffect(() => {
    if (showCopyFrom) {
      getPreviousTripsWithDependents(groupId, tripId).then(setPreviousTrips);
    }
  }, [showCopyFrom, groupId, tripId]);

  // Calculate totals
  const totalPeople = familyUnits.reduce((sum, fu) => sum + fu.totalPeople, 0);
  const totalDependents = familyUnits.reduce((sum, fu) => sum + fu.dependents.length, 0);

  // Handle quick add
  const handleQuickAdd = () => {
    const names = quickAddNames
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    startTransition(async () => {
      await addMultipleDependents(
        tripId,
        groupId,
        names.map((name) => ({
          name,
          type: quickAddType,
          age_group: quickAddAgeGroup,
        }))
      );
      setQuickAddNames("");
      setShowQuickAdd(false);
      fetchFamilyUnits();
    });
  };

  // Handle copy from previous trip
  const handleCopyFromTrip = (sourceTripId: string) => {
    startTransition(async () => {
      await copyDependentsFromTrip(sourceTripId, tripId, groupId);
      setShowCopyFrom(false);
      fetchFamilyUnits();
    });
  };

  // Open edit modal
  const openEdit = (dependent: TripDependent) => {
    setEditingDependent(dependent);
    setShowAddModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowAddModal(false);
    setEditingDependent(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            Who&apos;s Coming
            <span className="text-sm font-normal text-muted-foreground">
              ({totalPeople} {totalPeople === 1 ? "person" : "people"})
            </span>
          </h3>
          {totalDependents > 0 && (
            <p className="text-sm text-muted-foreground">
              {members.length} members + {totalDependents} additional
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Add
            </button>

            <AnimatePresence>
              {showQuickAdd && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowQuickAdd(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-20 p-4"
                  >
                    <h4 className="font-medium mb-3">Quick Add People</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Names (comma-separated)</label>
                        <input
                          type="text"
                          value={quickAddNames}
                          onChange={(e) => setQuickAddNames(e.target.value)}
                          placeholder="Emma, Jake, Lily"
                          className="input w-full mt-1"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={quickAddType}
                          onChange={(e) => setQuickAddType(e.target.value as DependentType)}
                          className="input flex-1 text-sm"
                        >
                          <option value="child">My Kids</option>
                          <option value="spouse">Spouse</option>
                          <option value="friend">Friends</option>
                          <option value="friends_child">Friends&apos; Kids</option>
                        </select>
                        <select
                          value={quickAddAgeGroup}
                          onChange={(e) => setQuickAddAgeGroup(e.target.value as AgeGroup)}
                          className="input flex-1 text-sm"
                        >
                          <option value="adult">Adult</option>
                          <option value="teen">Teen</option>
                          <option value="child">Child</option>
                          <option value="infant">Infant</option>
                        </select>
                      </div>
                      <button
                        onClick={handleQuickAdd}
                        disabled={isPending || !quickAddNames.trim()}
                        className="btn-primary w-full text-sm"
                      >
                        {isPending ? "Adding..." : "Add All"}
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <button
                        onClick={() => {
                          setShowQuickAdd(false);
                          setShowCopyFrom(true);
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        Copy from Previous Trip
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-sm"
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* Copy from previous trip modal */}
      <AnimatePresence>
        {showCopyFrom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCopyFrom(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 p-6"
            >
              <h3 className="font-heading font-semibold text-lg mb-4">Copy from Previous Trip</h3>

              {previousTrips.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No previous trips with dependents found.
                </p>
              ) : (
                <div className="space-y-2">
                  {previousTrips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleCopyFromTrip(trip.id)}
                      disabled={isPending}
                      className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="font-medium">{trip.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {trip.dependentCount} {trip.dependentCount === 1 ? "person" : "people"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowCopyFrom(false)}
                className="btn-secondary w-full mt-4"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Family Units */}
      <div className="space-y-3">
        {familyUnits.map((unit) => {
          const memberName = unit.member?.display_name || unit.member?.full_name || "Member";
          const isCurrentUser = unit.member?.id === currentUserId;

          return (
            <div
              key={unit.member?.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              {/* Member header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {unit.member?.avatar_url ? (
                    <img
                      src={unit.member.avatar_url}
                      alt={memberName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {memberName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {memberName}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {unit.totalPeople} {unit.totalPeople === 1 ? "person" : "people"}
                    </div>
                  </div>
                </div>

                {isCurrentUser && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    + Add
                  </button>
                )}
              </div>

              {/* Dependents */}
              {unit.dependents.length > 0 ? (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-muted space-y-2">
                  {unit.dependents.map((dep) => {
                    const ageConfig = getAgeGroupConfig(dep.age_group);
                    const typeConfig = getDependentTypeConfig(dep.type);

                    return (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between group py-1"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: ageConfig.bgColor, color: ageConfig.color }}
                          >
                            {typeConfig.icon}
                          </span>
                          <span>
                            {dep.name}
                            <span className="text-muted-foreground ml-1">
                              ({ageConfig.shortLabel.toLowerCase()}
                              {dep.age ? `, ${dep.age}` : ""})
                            </span>
                          </span>
                        </div>

                        {(isCurrentUser || dep.responsible_member === currentUserId) && (
                          <button
                            onClick={() => openEdit(dep)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 ml-4 text-sm text-muted-foreground italic">
                  (just {isCurrentUser ? "yourself" : "themselves"})
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {familyUnits.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
          <p className="text-muted-foreground mb-4">
            Add family members, friends, and kids traveling with the group.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add First Person
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddDependentModal
        isOpen={showAddModal}
        onClose={closeModal}
        tripId={tripId}
        groupId={groupId}
        members={members}
        currentUserId={currentUserId}
        dependent={editingDependent}
        onSaved={fetchFamilyUnits}
      />
    </div>
  );
}

export default FamilyGroupDisplay;
