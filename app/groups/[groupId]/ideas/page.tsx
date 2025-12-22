"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getIdeas,
  createIdea,
  deleteIdea,
  voteIdea,
  planIdea,
  Idea,
  IdeaCategory,
  IdeaStatus,
} from "@/lib/ideas";
import { categoryLabels } from "@/lib/idea-constants";
import Header from "@/components/Header";

const categories: { value: IdeaCategory | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "✨" },
  { value: "food", label: "Food & Drink", icon: "🍽️" },
  { value: "activities", label: "Activities", icon: "🎯" },
  { value: "outdoors", label: "Outdoors", icon: "🌲" },
  { value: "events", label: "Events", icon: "🎉" },
  { value: "nightlife", label: "Nightlife", icon: "🌙" },
  { value: "arts", label: "Arts & Culture", icon: "🎨" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
];

const sortOptions = [
  { value: "votes", label: "Most Votes" },
  { value: "newest", label: "Newest" },
  { value: "category", label: "By Category" },
];

export default function IdeasPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"votes" | "newest" | "category">("votes");
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("idea");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  // Add form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCategory, setNewCategory] = useState<IdeaCategory>("activities");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Plan form state
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId, selectedCategory, sortBy, statusFilter]);

  async function loadData() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    const ideasData = await getIdeas(groupId, {
      category: selectedCategory,
      status: statusFilter,
      search: searchQuery || undefined,
      sortBy,
    });
    setIdeas(ideasData);
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);

    const result = await createIdea(groupId, {
      title: newTitle,
      description: newDescription,
      location: newLocation,
      category: newCategory,
      source_url: newSourceUrl,
      image_url: newImageUrl,
    });

    if (result.error) {
      alert(result.error);
    } else {
      resetAddForm();
      setShowAddModal(false);
      loadData();
    }

    setCreating(false);
  }

  function resetAddForm() {
    setNewTitle("");
    setNewDescription("");
    setNewLocation("");
    setNewCategory("activities");
    setNewSourceUrl("");
    setNewImageUrl("");
  }

  async function handleVote(ideaId: string) {
    const result = await voteIdea(ideaId, groupId);

    if (result.error) {
      alert(result.error);
    } else {
      // Update local state
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                has_voted: result.voted,
                vote_count: idea.vote_count + (result.voted ? 1 : -1),
              }
            : idea
        )
      );
    }
  }

  async function handleDelete(ideaId: string) {
    if (!confirm("Are you sure you want to delete this idea?")) return;

    const result = await deleteIdea(ideaId, groupId);

    if (result.error) {
      alert(result.error);
    } else {
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    }
  }

  function openPlanModal(idea: Idea) {
    setSelectedIdea(idea);
    setPlanTitle(idea.title);
    setPlanDescription(idea.description || "");
    setPlanLocation(idea.location || "");
    setPlanDate("");
    setShowPlanModal(true);
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIdea || !planTitle.trim()) return;

    setPlanning(true);

    const result = await planIdea(selectedIdea.id, groupId, {
      title: planTitle,
      description: planDescription,
      location: planLocation,
      event_date: planDate,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowPlanModal(false);
      setSelectedIdea(null);
      // Navigate to the new outing
      router.push(`/groups/${groupId}/outings/${result.outing?.id}`);
    }

    setPlanning(false);
  }

  // Separate ideas by status
  const activeIdeas = ideas.filter((i) => i.status === "idea");
  const plannedIdeas = ideas.filter((i) => i.status === "planned");
  const completedIdeas = ideas.filter((i) => i.status === "completed");

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Find Things To Do"
        subtitle="Discover & save ideas together"
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword or location..."
              className="input w-full pl-10 pr-4"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-medium"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  loadData();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Category Filters */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-electric-cyan text-white"
                    : "bg-white text-slate-dark hover:bg-soft-lavender/20"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Status Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(["idea", "planned", "completed"] as IdeaStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-slate-dark text-white"
                    : "bg-white text-slate-dark hover:bg-gray-200"
                }`}
              >
                {status === "idea" ? "Ideas" : status === "planned" ? "Planned" : "Done"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "votes" | "newest" | "category")}
              className="input py-1.5 text-sm"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Idea Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add an Idea
        </button>

        {/* Ideas List */}
        {loading ? (
          <div className="text-center py-12 text-slate-medium">Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="font-heading font-semibold text-lg mb-2">No ideas yet!</h3>
            <p className="text-slate-medium mb-4">
              {statusFilter === "idea"
                ? "Start adding places you want to go and things you want to do together."
                : statusFilter === "planned"
                ? "No ideas are being planned yet."
                : "No ideas have been completed yet."}
            </p>
            {statusFilter !== "idea" && (
              <button onClick={() => setStatusFilter("idea")} className="text-electric-cyan hover:underline">
                View all ideas
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                currentUserId={currentUserId}
                onVote={() => handleVote(idea.id)}
                onDelete={() => handleDelete(idea.id)}
                onPlan={() => openPlanModal(idea)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Idea Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl">Add an Idea</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  What's the idea? *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Try the new ramen place downtown"
                  className="input w-full"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories
                    .filter((c) => c.value !== "all")
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewCategory(cat.value as IdeaCategory)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          newCategory === cat.value
                            ? "border-electric-cyan bg-electric-cyan/5"
                            : "border-gray-200 hover:border-electric-cyan/50"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="text-sm">{cat.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What makes this a great idea?"
                  rows={2}
                  className="input w-full resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., 123 Main St or Downtown"
                  className="input w-full"
                />
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="input w-full"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="input w-full"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAddForm();
                    setShowAddModal(false);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Idea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan This Modal */}
      {showPlanModal && selectedIdea && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPlanModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl">Plan This Outing</h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-golden-sun/30 rounded-lg p-3 mb-6 flex items-start gap-3">
              <span className="text-2xl">{categoryLabels[selectedIdea.category].icon}</span>
              <div>
                <p className="font-medium text-slate-dark">{selectedIdea.title}</p>
                {selectedIdea.location && (
                  <p className="text-sm text-slate-medium">{selectedIdea.location}</p>
                )}
              </div>
            </div>

            <form onSubmit={handlePlan} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Outing Title *
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  When? (optional)
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={planLocation}
                  onChange={(e) => setPlanLocation(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Details (optional)
                </label>
                <textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Add any details for the group..."
                  rows={2}
                  className="input w-full resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planning || !planTitle.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {planning ? "Creating..." : "Create Outing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  currentUserId,
  onVote,
  onDelete,
  onPlan,
}: {
  idea: Idea;
  currentUserId: string;
  onVote: () => void;
  onDelete: () => void;
  onPlan: () => void;
}) {
  const [voting, setVoting] = useState(false);
  const isOwner = idea.suggested_by === currentUserId;
  const category = categoryLabels[idea.category];

  async function handleVote() {
    setVoting(true);
    await onVote();
    setVoting(false);
  }

  return (
    <div className="card">
      <div className="flex gap-4">
        {/* Vote Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleVote}
            disabled={voting}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
              idea.has_voted
                ? "bg-electric-cyan text-white"
                : "bg-bright-white text-slate-dark hover:bg-electric-cyan/10 hover:text-electric-cyan"
            }`}
          >
            <svg
              className={`w-5 h-5 transition-transform ${idea.has_voted ? "scale-110" : ""}`}
              fill={idea.has_voted ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span className="text-sm font-bold">{idea.vote_count}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {/* Category Icon */}
            <span
              className="w-8 h-8 rounded-lg bg-soft-lavender/20 flex items-center justify-center flex-shrink-0"
              title={category.label}
            >
              {category.icon}
            </span>

            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-slate-dark truncate">
                {idea.title}
              </h3>
              {idea.location && (
                <p className="text-sm text-slate-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {idea.location}
                </p>
              )}
            </div>

            {/* Status Badge */}
            {idea.status !== "idea" && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  idea.status === "planned"
                    ? "bg-golden-sun/30 text-golden-sun-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {idea.status === "planned" ? "Planned" : "Done"}
              </span>
            )}
          </div>

          {/* Description */}
          {idea.description && (
            <p className="text-sm text-slate-medium line-clamp-2 mb-2">{idea.description}</p>
          )}

          {/* Image */}
          {idea.image_url && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img
                src={idea.image_url}
                alt={idea.title}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-medium">
              <span>
                by{" "}
                {idea.suggester?.display_name || idea.suggester?.full_name || "Unknown"}
              </span>
              {idea.source_url && (
                <>
                  <span>•</span>
                  <a
                    href={idea.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-cyan hover:underline flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Link
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Plan This Button */}
              {idea.status === "idea" && (
                <button
                  onClick={onPlan}
                  className="text-electric-cyan hover:bg-electric-cyan/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Plan This
                </button>
              )}

              {/* View Outing Link */}
              {idea.status === "planned" && idea.outing_id && (
                <a
                  href={`/groups/${idea.group_id}/outings/${idea.outing_id}`}
                  className="text-electric-cyan hover:bg-electric-cyan/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  View Outing
                </a>
              )}

              {/* Delete Button */}
              {isOwner && (
                <button
                  onClick={onDelete}
                  className="text-slate-medium hover:text-red-500 p-1.5 rounded-lg transition-colors"
                  title="Delete idea"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
