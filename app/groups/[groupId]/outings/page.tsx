"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getOutings, createOuting, deleteOuting, Outing, OutingType } from "@/lib/outings";
import { createBringList } from "@/lib/bring-list";
import Header from "@/components/Header";

export default function OutingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [outings, setOutings] = useState<Outing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Modal states
  const [showOutingModal, setShowOutingModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Outing form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [addBringList, setAddBringList] = useState(false);
  const [hostProviding, setHostProviding] = useState("");

  // Trip form state
  const [tripTitle, setTripTitle] = useState("");
  const [tripDescription, setTripDescription] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripBudget, setTripBudget] = useState("");

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const outingsData = await getOutings(groupId);
      setOutings(outingsData);
    } catch (error) {
      console.error("[OutingsPage] Error loading data:", error);
    }

    setLoading(false);
  }

  async function handleCreateOuting(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);

    const result = await createOuting(groupId, {
      title,
      description,
      location,
      event_date: eventDate,
      outing_type: "outing",
    });

    if (result.error) {
      alert(result.error);
    } else {
      // Create bring list if option was checked
      if (addBringList && result.outing) {
        await createBringList({
          outingId: result.outing.id,
          groupId,
          title: `${title} - What to Bring`,
          hostProviding: hostProviding || undefined,
        });
      }

      setShowOutingModal(false);
      resetOutingForm();

      // Navigate to the new outing
      if (result.outing) {
        router.push(`/groups/${groupId}/outings/${result.outing.id}`);
      } else {
        loadData();
      }
    }

    setCreating(false);
  }

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!tripTitle.trim()) return;

    setCreating(true);

    const result = await createOuting(groupId, {
      title: tripTitle,
      description: tripDescription,
      location: tripDestination,
      event_date: tripStartDate,
      end_date: tripEndDate,
      outing_type: "trip",
      budget_goal: tripBudget ? parseFloat(tripBudget) : undefined,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowTripModal(false);
      resetTripForm();
      if (result.outing) {
        router.push(`/groups/${groupId}/outings/${result.outing.id}`);
      }
    }

    setCreating(false);
  }

  function resetOutingForm() {
    setTitle("");
    setDescription("");
    setLocation("");
    setEventDate("");
    setAddBringList(false);
    setHostProviding("");
  }

  function resetTripForm() {
    setTripTitle("");
    setTripDescription("");
    setTripDestination("");
    setTripStartDate("");
    setTripEndDate("");
    setTripBudget("");
  }

  async function handleDelete(outingId: string) {
    if (!confirm("Are you sure you want to delete this? Photos attached to it will not be deleted.")) return;

    const result = await deleteOuting(outingId, groupId);
    if (result.success) {
      setOutings((prev) => prev.filter((o) => o.id !== outingId));
    } else {
      alert(result.error);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "No date set";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateRange(start: string | null, end: string | null) {
    if (!start) return "Dates TBD";
    const startDate = new Date(start + "T00:00:00");
    const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!end) return startStr;
    const endDate = new Date(end + "T00:00:00");
    const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return `${startStr} - ${endStr}`;
  }

  // Separate trips and outings
  const trips = outings.filter((o) => o.outing_type === "trip");
  const regularOutings = outings.filter((o) => o.outing_type === "outing" || !o.outing_type);

  const upcomingTrips = trips.filter((o) => o.status === "upcoming");
  const completedTrips = trips.filter((o) => o.status === "completed");
  const upcomingOutings = regularOutings.filter((o) => o.status === "upcoming");
  const completedOutings = regularOutings.filter((o) => o.status === "completed");

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Adventures"
        subtitle="Trips & outings together"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : outings.length === 0 ? (
          <div className="text-center py-12 card">
            <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">No adventures yet!</h3>
            <p className="text-slate-medium mb-6">Plan a trip or create an outing to get started.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowTripModal(true)} className="btn-primary">
                Plan a Trip
              </button>
              <button onClick={() => setShowOutingModal(true)} className="btn-secondary">
                New Outing
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Trips Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                  <span className="text-2xl">✈️</span>
                  Trips
                </h2>
                <button
                  onClick={() => setShowTripModal(true)}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Plan a Trip
                </button>
              </div>

              {trips.length === 0 ? (
                <div className="card bg-gradient-to-br from-soft-lavender/20 to-electric-cyan/10 border-dashed border-2 border-electric-cyan/30 text-center py-8">
                  <p className="text-slate-medium mb-3">No trips planned yet.</p>
                  <button
                    onClick={() => setShowTripModal(true)}
                    className="text-electric-cyan font-medium hover:underline"
                  >
                    Start planning your next adventure
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingTrips.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-medium mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-electric-cyan rounded-full"></span>
                        Upcoming
                      </h3>
                      <div className="space-y-4">
                        {upcomingTrips.map((trip) => (
                          <TripCard
                            key={trip.id}
                            trip={trip}
                            groupId={groupId}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            formatDateRange={formatDateRange}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTrips.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-medium mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                        Past Trips
                      </h3>
                      <div className="space-y-4">
                        {completedTrips.map((trip) => (
                          <TripCard
                            key={trip.id}
                            trip={trip}
                            groupId={groupId}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            formatDateRange={formatDateRange}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Outings Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  Outings
                </h2>
                <button
                  onClick={() => setShowOutingModal(true)}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Outing
                </button>
              </div>

              {regularOutings.length === 0 ? (
                <div className="card border-dashed border-2 border-gray-300 text-center py-8">
                  <p className="text-slate-medium mb-3">No outings yet.</p>
                  <button
                    onClick={() => setShowOutingModal(true)}
                    className="text-electric-cyan font-medium hover:underline"
                  >
                    Create your first outing
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingOutings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-medium mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-electric-cyan rounded-full"></span>
                        Upcoming
                      </h3>
                      <div className="space-y-3">
                        {upcomingOutings.map((outing) => (
                          <OutingCard
                            key={outing.id}
                            outing={outing}
                            groupId={groupId}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedOutings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-medium mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                        Completed
                      </h3>
                      <div className="space-y-3">
                        {completedOutings.map((outing) => (
                          <OutingCard
                            key={outing.id}
                            outing={outing}
                            groupId={groupId}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Quick Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href={`/groups/${groupId}/photos`}
                className="card hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-soft-lavender/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">All Photos</h3>
                  <p className="text-sm text-slate-medium">Browse the gallery</p>
                </div>
              </Link>

              <Link
                href={`/groups/${groupId}/ideas`}
                className="card hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-golden-sun/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-golden-sun-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Ideas</h3>
                  <p className="text-sm text-slate-medium">Things to do together</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Create Outing Modal */}
      {showOutingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">New Outing</h3>
              <button
                onClick={() => setShowOutingModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-medium mb-4">
              Simple events like brunch, game night, or a movie.
            </p>

            <form onSubmit={handleCreateOuting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Beach Day, Birthday Party, etc."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where is it happening?"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the plan?"
                  rows={2}
                  className="input resize-none"
                />
              </div>

              {/* Bring List Toggle */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addBringList}
                    onChange={(e) => setAddBringList(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-slate-dark flex items-center gap-2">
                      <span>🍽️</span> Add a sign-up list
                    </span>
                    <p className="text-sm text-slate-medium mt-0.5">
                      Let guests sign up to bring food, drinks, or supplies
                    </p>
                  </div>
                </label>

                {addBringList && (
                  <div className="mt-3 pl-8">
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      What are you providing as host?
                    </label>
                    <input
                      type="text"
                      value={hostProviding}
                      onChange={(e) => setHostProviding(e.target.value)}
                      placeholder="I'll have burgers, buns, and the grill ready"
                      className="input w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOutingModal(false);
                    resetOutingForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || creating}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Outing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Trip Modal */}
      {showTripModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Plan a Trip</h3>
              <button
                onClick={() => setShowTripModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-medium mb-4">
              Multi-day adventures with budget tracking, itinerary, and more.
            </p>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Trip Name *</label>
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  placeholder="Cancun 2025, Ski Weekend, etc."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Destination</label>
                <input
                  type="text"
                  value={tripDestination}
                  onChange={(e) => setTripDestination(e.target.value)}
                  placeholder="Where are you going?"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Start Date</label>
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">End Date</label>
                  <input
                    type="date"
                    value={tripEndDate}
                    onChange={(e) => setTripEndDate(e.target.value)}
                    min={tripStartDate}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Budget Goal (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tripBudget}
                    onChange={(e) => setTripBudget(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7"
                  />
                </div>
                <p className="text-xs text-slate-medium mt-1">Set a target budget for the trip</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Description</label>
                <textarea
                  value={tripDescription}
                  onChange={(e) => setTripDescription(e.target.value)}
                  placeholder="What's the trip about?"
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTripModal(false);
                    resetTripForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tripTitle.trim() || creating}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Start Planning"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TripCard({
  trip,
  groupId,
  currentUserId,
  onDelete,
  formatDateRange,
}: {
  trip: Outing;
  groupId: string;
  currentUserId: string;
  onDelete: (id: string) => void;
  formatDateRange: (start: string | null, end: string | null) => string;
}) {
  const budgetProgress = trip.budget_goal && trip.total_spent
    ? Math.min((trip.total_spent / trip.budget_goal) * 100, 100)
    : 0;

  return (
    <div className="card bg-gradient-to-br from-white to-soft-lavender/5 hover:shadow-lg transition-shadow">
      <Link href={`/groups/${groupId}/outings/${trip.id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-lg hover:text-electric-cyan transition-colors">
              {trip.title}
            </h3>
            <p className="text-sm text-slate-medium">{trip.location || "Destination TBD"}</p>
          </div>
          {trip.created_by === currentUserId && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(trip.id);
              }}
              className="p-2 text-slate-medium hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-slate-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDateRange(trip.event_date, trip.end_date)}
          </span>

          {(trip.attendee_count || 0) > 0 && (
            <span className="flex items-center gap-1.5 text-slate-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m12 5.197v-1a6 6 0 00-9-5.197" />
              </svg>
              {trip.attendee_count} going
            </span>
          )}

          {(trip.photo_count || 0) > 0 && (
            <span className="flex items-center gap-1.5 text-slate-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {trip.photo_count}
            </span>
          )}
        </div>

        {/* Budget Progress */}
        {trip.budget_goal && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-medium">Budget</span>
              <span className="font-medium">
                ${(trip.total_spent || 0).toFixed(0)} / ${trip.budget_goal.toFixed(0)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetProgress >= 100 ? "bg-red-500" : budgetProgress >= 80 ? "bg-gold" : "bg-electric-cyan"
                }`}
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
          </div>
        )}
      </Link>
    </div>
  );
}

function OutingCard({
  outing,
  groupId,
  currentUserId,
  onDelete,
  formatDate,
}: {
  outing: Outing;
  groupId: string;
  currentUserId: string;
  onDelete: (id: string) => void;
  formatDate: (date: string | null) => string;
}) {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <Link href={`/groups/${groupId}/outings/${outing.id}`} className="flex-1">
          <h3 className="font-heading font-semibold text-lg mb-1 hover:text-electric-cyan transition-colors">
            {outing.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-medium">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(outing.event_date)}
            </span>
            {outing.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {outing.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {outing.photo_count} photo{outing.photo_count !== 1 ? "s" : ""}
            </span>
          </div>
        </Link>

        {outing.created_by === currentUserId && (
          <button
            onClick={() => onDelete(outing.id)}
            className="p-2 text-slate-medium hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
