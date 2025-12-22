"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getPolls, createPoll, deletePoll, Poll, PollType, PollSettings } from "@/lib/polls";
import Header from "@/components/Header";

const pollTypeLabels: Record<PollType, { label: string; description: string }> = {
  multiple_choice: { label: "Multiple Choice", description: "Vote for one or more options" },
  ranking: { label: "Ranking", description: "Rank options by preference" },
  date_picker: { label: "Date Picker", description: "Find the best date for everyone" },
  lottery: { label: "Lottery", description: "Random pick from suggestions" },
};

export default function PollsPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pollType, setPollType] = useState<PollType>("multiple_choice");
  const [options, setOptions] = useState<{ text: string; date?: string }[]>([
    { text: "" },
    { text: "" },
  ]);
  const [closesAt, setClosesAt] = useState("");
  const [settings, setSettings] = useState<PollSettings>({
    allow_member_options: true,
    multi_select: false,
    anonymous: false,
    show_results: true,
  });

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

      const pollsData = await getPolls(groupId);
      setPolls(pollsData);
    } catch (error) {
      console.error("Error loading polls:", error);
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setPollType("multiple_choice");
    setOptions([{ text: "" }, { text: "" }]);
    setClosesAt("");
    setSettings({
      allow_member_options: true,
      multi_select: false,
      anonymous: false,
      show_results: true,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      alert("Please add at least 2 options");
      return;
    }

    setCreating(true);

    const result = await createPoll(groupId, {
      title,
      description,
      poll_type: pollType,
      settings,
      closes_at: closesAt || undefined,
      options: validOptions,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowCreateModal(false);
      resetForm();
      loadData();
    }

    setCreating(false);
  }

  async function handleDelete(pollId: string) {
    if (!confirm("Are you sure you want to delete this poll?")) return;

    const result = await deletePoll(pollId, groupId);
    if (result.success) {
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } else {
      alert(result.error);
    }
  }

  function addOption() {
    setOptions([...options, { text: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string, date?: string) {
    const newOptions = [...options];
    newOptions[index] = { text: value, date };
    setOptions(newOptions);
  }

  const activePolls = polls.filter((p) => !p.is_closed);
  const closedPolls = polls.filter((p) => p.is_closed);

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Polls"
        subtitle="Group decisions"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-medium">
              Create polls to make decisions together
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Poll
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-12 card">
            <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-electric-cyan"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">
              No polls yet
            </h3>
            <p className="text-slate-medium mb-4">
              Create a poll to start making group decisions!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create First Poll
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Polls */}
            {activePolls.length > 0 && (
              <div>
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-electric-cyan rounded-full"></span>
                  Active Polls
                </h2>
                <div className="space-y-4">
                  {activePolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      groupId={groupId}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Closed Polls */}
            {closedPolls.length > 0 && (
              <div>
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  Closed Polls
                </h2>
                <div className="space-y-4">
                  {closedPolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      groupId={groupId}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                Create Poll
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Poll Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-2">
                  Poll Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(pollTypeLabels) as PollType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPollType(type)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        pollType === type
                          ? "border-electric-cyan bg-electric-cyan/5"
                          : "border-gray-200 hover:border-electric-cyan/50"
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-dark">
                        {pollTypeLabels[type].label}
                      </div>
                      <div className="text-xs text-slate-medium">
                        {pollTypeLabels[type].description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What would you like to ask?"
                  className="input"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more context (optional)"
                  rows={2}
                  className="input"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-2">
                  Options *
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      {pollType === "date_picker" ? (
                        <input
                          type="date"
                          value={option.date || ""}
                          onChange={(e) =>
                            updateOption(index, e.target.value, e.target.value)
                          }
                          className="input flex-1"
                          placeholder="Select date"
                        />
                      ) : (
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="input flex-1"
                        />
                      )}
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-slate-medium hover:text-red-500"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-electric-cyan hover:text-electric-cyan-600 flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Option
                </button>
              </div>

              {/* Settings */}
              {pollType === "multiple_choice" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="multi_select"
                    checked={settings.multi_select}
                    onChange={(e) =>
                      setSettings({ ...settings, multi_select: e.target.checked })
                    }
                    className="rounded border-gray-300 text-electric-cyan focus:ring-electric-cyan"
                  />
                  <label htmlFor="multi_select" className="text-sm text-slate-dark">
                    Allow selecting multiple options
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={settings.anonymous}
                  onChange={(e) =>
                    setSettings({ ...settings, anonymous: e.target.checked })
                  }
                  className="rounded border-gray-300 text-electric-cyan focus:ring-electric-cyan"
                />
                <label htmlFor="anonymous" className="text-sm text-slate-dark">
                  Anonymous voting
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow_member_options"
                  checked={settings.allow_member_options !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, allow_member_options: e.target.checked })
                  }
                  className="rounded border-gray-300 text-electric-cyan focus:ring-electric-cyan"
                />
                <label htmlFor="allow_member_options" className="text-sm text-slate-dark">
                  Allow members to add options
                </label>
              </div>

              {/* Closes At */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Close poll on (optional)
                </label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
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
                  {creating ? "Creating..." : "Create Poll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PollCard({
  poll,
  groupId,
  currentUserId,
  onDelete,
}: {
  poll: Poll;
  groupId: string;
  currentUserId: string;
  onDelete: (id: string) => void;
}) {
  const typeInfo = pollTypeLabels[poll.poll_type];

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <Link
          href={`/groups/${groupId}/polls/${poll.id}`}
          className="flex-1"
        >
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-semibold text-lg hover:text-electric-cyan transition-colors">
              {poll.title}
            </h3>
            <span className="px-2 py-0.5 bg-soft-lavender text-slate-dark rounded-full text-xs">
              {typeInfo.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-medium mb-2">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {poll.vote_count} vote{poll.vote_count !== 1 ? "s" : ""}
            </span>
            {poll.closes_at && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Closes {new Date(poll.closes_at).toLocaleDateString()}
              </span>
            )}
            {poll.has_voted && (
              <span className="flex items-center gap-1 text-green-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Voted
              </span>
            )}
          </div>
          {poll.description && (
            <p className="text-slate-medium text-sm line-clamp-2">
              {poll.description}
            </p>
          )}
        </Link>

        {poll.created_by === currentUserId && (
          <button
            onClick={() => onDelete(poll.id)}
            className="p-2 text-slate-medium hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
  );
}
