"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getPoll,
  votePoll,
  closePoll,
  drawLottery,
  getLotteryResult,
  addPollOption,
  Poll,
  PollOption,
  LotteryResult,
} from "@/lib/polls";
import Header from "@/components/Header";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const pollId = params.pollId as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null);

  // Voting state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [rankings, setRankings] = useState<Record<string, number>>({});
  const [availability, setAvailability] = useState<
    Record<string, "available" | "maybe" | "unavailable">
  >({});

  // Add option state
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");
  const [newOptionDate, setNewOptionDate] = useState("");
  const [addingOption, setAddingOption] = useState(false);

  useEffect(() => {
    loadData();
  }, [pollId]);

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

      const pollData = await getPoll(pollId);
      setPoll(pollData);

      if (pollData?.poll_type === "lottery") {
        const result = await getLotteryResult(pollId);
        setLotteryResult(result);
      }

      // Set existing votes if user has voted
      if (pollData && user) {
        const userVotes =
          pollData.options?.flatMap((o) =>
            o.votes?.filter((v) => v.user_id === user.id) || []
          ) || [];

        if (userVotes.length > 0) {
          if (pollData.poll_type === "multiple_choice" || pollData.poll_type === "lottery") {
            setSelectedOptions(userVotes.map((v) => v.option_id));
          } else if (pollData.poll_type === "ranking") {
            const ranks: Record<string, number> = {};
            userVotes.forEach((v) => {
              if (v.rank !== null) {
                ranks[v.option_id] = v.rank;
              }
            });
            setRankings(ranks);
          } else if (pollData.poll_type === "date_picker") {
            const avail: Record<string, "available" | "maybe" | "unavailable"> =
              {};
            userVotes.forEach((v) => {
              if (v.availability) {
                avail[v.option_id] = v.availability as
                  | "available"
                  | "maybe"
                  | "unavailable";
              }
            });
            setAvailability(avail);
          }
        }
      }
    } catch (error) {
      console.error("Error loading poll:", error);
    }
    setLoading(false);
  }

  async function handleAddOption() {
    if (!poll) return;
    const text = poll.poll_type === "date_picker" ? newOptionDate : newOptionText;
    if (!text.trim()) return;

    setAddingOption(true);

    const result = await addPollOption(pollId, groupId, {
      text: text.trim(),
      date: poll.poll_type === "date_picker" ? newOptionDate : undefined,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setNewOptionText("");
      setNewOptionDate("");
      setShowAddOption(false);
      loadData();
    }

    setAddingOption(false);
  }

  async function handleVote() {
    if (!poll) return;

    setVoting(true);

    let votes: { option_id: string; rank?: number; availability?: string }[] =
      [];

    if (poll.poll_type === "multiple_choice" || poll.poll_type === "lottery") {
      votes = selectedOptions.map((optionId) => ({ option_id: optionId }));
    } else if (poll.poll_type === "ranking") {
      votes = Object.entries(rankings).map(([optionId, rank]) => ({
        option_id: optionId,
        rank,
      }));
    } else if (poll.poll_type === "date_picker") {
      votes = Object.entries(availability).map(([optionId, avail]) => ({
        option_id: optionId,
        availability: avail,
      }));
    }

    if (votes.length === 0) {
      alert("Please make a selection");
      setVoting(false);
      return;
    }

    const result = await votePoll(pollId, groupId, votes);

    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }

    setVoting(false);
  }

  async function handleClosePoll() {
    if (!confirm("Are you sure you want to close this poll?")) return;

    const result = await closePoll(pollId, groupId);
    if (result.success) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleDrawLottery() {
    if (!confirm("Are you sure you want to draw the lottery? This will close the poll and randomly select a winner.")) return;

    const result = await drawLottery(pollId, groupId);
    if (result.success) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  function toggleOption(optionId: string) {
    if (poll?.settings?.multi_select || poll?.poll_type === "lottery") {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  }

  function setRanking(optionId: string, rank: number) {
    setRankings((prev) => {
      const newRankings = { ...prev };
      // Remove this rank from any other option
      Object.keys(newRankings).forEach((key) => {
        if (newRankings[key] === rank) {
          delete newRankings[key];
        }
      });
      if (rank === 0) {
        delete newRankings[optionId];
      } else {
        newRankings[optionId] = rank;
      }
      return newRankings;
    });
  }

  function setOptionAvailability(
    optionId: string,
    avail: "available" | "maybe" | "unavailable"
  ) {
    setAvailability((prev) => ({ ...prev, [optionId]: avail }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header
          showBack
          backHref={`/groups/${groupId}/polls`}
          title="Poll"
          subtitle="Loading..."
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header
          showBack
          backHref={`/groups/${groupId}/polls`}
          title="Poll"
          subtitle="Not found"
        />
        <div className="text-center py-12">
          <p>Poll not found</p>
        </div>
      </div>
    );
  }

  const isCreator = poll.created_by === currentUserId;
  const canVote = !poll.is_closed && !poll.has_voted;
  const showResults = poll.is_closed || poll.has_voted || poll.settings?.show_results;
  const canAddOptions = !poll.is_closed && (isCreator || poll.settings?.allow_member_options !== false);

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}/polls`}
        title={poll.title}
        subtitle={poll.is_closed ? "Closed" : "Active"}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Poll Info */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-soft-lavender/30 text-slate-dark rounded-full text-xs font-medium">
              {poll.poll_type === "multiple_choice"
                ? "Multiple Choice"
                : poll.poll_type === "ranking"
                ? "Ranking"
                : poll.poll_type === "date_picker"
                ? "Date Picker"
                : "Lottery"}
            </span>
            {poll.is_closed && (
              <span className="px-2 py-0.5 bg-gray-100 text-slate-medium rounded-full text-xs">
                Closed
              </span>
            )}
          </div>

          {poll.description && (
            <p className="text-slate-medium mb-4">{poll.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-medium">
            <span>
              Created by{" "}
              {poll.creator?.display_name || poll.creator?.full_name || "Unknown"}
            </span>
            <span>{poll.vote_count} vote{poll.vote_count !== 1 ? "s" : ""}</span>
            {poll.closes_at && (
              <span>Closes {new Date(poll.closes_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Lottery Winner Banner */}
        {poll.poll_type === "lottery" && lotteryResult && (
          <div className="card mb-6 bg-golden-sunen-sun/30 border-2 border-golden-sun">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-golden-sun rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-heading font-semibold text-lg">
                  Selected: {lotteryResult.winning_option?.option_text}
                </div>
                {lotteryResult.suggester && (
                  <div className="text-sm text-slate-medium">
                    Suggested by{" "}
                    {lotteryResult.suggester.display_name ||
                      lotteryResult.suggester.full_name ||
                      "Unknown"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Voting Interface */}
        {canVote && (
          <div className="card mb-6">
            <h3 className="font-heading font-semibold mb-4">
              {poll.poll_type === "ranking"
                ? "Rank the options (1 = first choice)"
                : poll.poll_type === "date_picker"
                ? "Mark your availability"
                : poll.poll_type === "lottery"
                ? "Add your suggestions"
                : poll.settings?.multi_select
                ? "Select all that apply"
                : "Select one option"}
            </h3>

            <div className="space-y-3">
              {poll.options?.map((option) => (
                <VotingOption
                  key={option.id}
                  option={option}
                  pollType={poll.poll_type}
                  multiSelect={poll.settings?.multi_select || poll.poll_type === "lottery"}
                  isSelected={selectedOptions.includes(option.id)}
                  rank={rankings[option.id]}
                  availability={availability[option.id]}
                  totalOptions={poll.options?.length || 0}
                  onToggle={() => toggleOption(option.id)}
                  onRankChange={(rank) => setRanking(option.id, rank)}
                  onAvailabilityChange={(avail) =>
                    setOptionAvailability(option.id, avail)
                  }
                />
              ))}
            </div>

            {/* Add Option */}
            {canAddOptions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {showAddOption ? (
                  <div className="space-y-3">
                    {poll.poll_type === "date_picker" ? (
                      <input
                        type="date"
                        value={newOptionDate}
                        onChange={(e) => setNewOptionDate(e.target.value)}
                        className="input w-full"
                        placeholder="Select a date"
                      />
                    ) : (
                      <input
                        type="text"
                        value={newOptionText}
                        onChange={(e) => setNewOptionText(e.target.value)}
                        className="input w-full"
                        placeholder={
                          poll.poll_type === "lottery"
                            ? "Add your suggestion..."
                            : "Add an option..."
                        }
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddOption(false);
                          setNewOptionText("");
                          setNewOptionDate("");
                        }}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        disabled={addingOption || (poll.poll_type === "date_picker" ? !newOptionDate : !newOptionText.trim())}
                        className="btn-primary flex-1 disabled:opacity-50"
                      >
                        {addingOption ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddOption(true)}
                    className="text-electric-cyan hover:text-electric-cyan-600 text-sm flex items-center gap-1"
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
                    {poll.poll_type === "lottery"
                      ? "Add Your Suggestion"
                      : poll.poll_type === "date_picker"
                      ? "Suggest Another Date"
                      : "Add Your Option"}
                  </button>
                )}
              </div>
            )}

            {poll.poll_type !== "lottery" && (
              <button
                onClick={handleVote}
                disabled={voting}
                className="btn-primary w-full mt-4 disabled:opacity-50"
              >
                {voting ? "Submitting..." : "Submit Vote"}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="card mb-6">
            <h3 className="font-heading font-semibold mb-4">Results</h3>

            {poll.poll_type === "multiple_choice" && (
              <MultipleChoiceResults options={poll.options || []} />
            )}

            {poll.poll_type === "ranking" && (
              <RankingResults options={poll.options || []} />
            )}

            {poll.poll_type === "date_picker" && (
              <DatePickerResults
                options={poll.options || []}
                isAnonymous={poll.settings?.anonymous}
              />
            )}

            {poll.poll_type === "lottery" && !lotteryResult && (
              <LotteryEntries options={poll.options || []} />
            )}
          </div>
        )}

        {/* Creator Actions */}
        {isCreator && !poll.is_closed && (
          <div className="card">
            <h3 className="font-heading font-semibold mb-4">Poll Actions</h3>
            <div className="flex gap-3">
              {poll.poll_type === "lottery" ? (
                <button
                  onClick={handleDrawLottery}
                  className="btn-primary flex-1"
                >
                  Draw Winner
                </button>
              ) : (
                <button
                  onClick={handleClosePoll}
                  className="btn-secondary flex-1"
                >
                  Close Poll
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function VotingOption({
  option,
  pollType,
  multiSelect,
  isSelected,
  rank,
  availability,
  totalOptions,
  onToggle,
  onRankChange,
  onAvailabilityChange,
}: {
  option: PollOption;
  pollType: string;
  multiSelect?: boolean;
  isSelected: boolean;
  rank?: number;
  availability?: "available" | "maybe" | "unavailable";
  totalOptions: number;
  onToggle: () => void;
  onRankChange: (rank: number) => void;
  onAvailabilityChange: (avail: "available" | "maybe" | "unavailable") => void;
}) {
  const displayText =
    pollType === "date_picker" && option.option_date
      ? new Date(option.option_date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : option.option_text;

  const suggesterName = option.suggester?.display_name || option.suggester?.full_name;

  if (pollType === "ranking") {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg border-gray-200">
        <select
          value={rank || ""}
          onChange={(e) => onRankChange(parseInt(e.target.value) || 0)}
          className="input w-20"
        >
          <option value="">-</option>
          {Array.from({ length: totalOptions }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <div className="flex-1">
          <span>{displayText}</span>
          {suggesterName && (
            <span className="text-xs text-slate-medium ml-2">
              by {suggesterName}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (pollType === "date_picker") {
    return (
      <div className="p-3 border rounded-lg border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">{displayText}</span>
          {suggesterName && (
            <span className="text-xs text-slate-medium">by {suggesterName}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAvailabilityChange("available")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              availability === "available"
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => onAvailabilityChange("maybe")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              availability === "maybe"
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            Maybe
          </button>
          <button
            type="button"
            onClick={() => onAvailabilityChange("unavailable")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              availability === "unavailable"
                ? "bg-red-500 text-white"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            Unavailable
          </button>
        </div>
      </div>
    );
  }

  // Multiple choice / Lottery
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-colors ${
        isSelected
          ? "border-electric-cyan bg-electric-cyan/5"
          : "border-gray-200 hover:border-electric-cyan/50"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-${
          multiSelect ? "md" : "full"
        } border-2 flex items-center justify-center flex-shrink-0 ${
          isSelected ? "border-electric-cyan bg-electric-cyan" : "border-gray-300"
        }`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 text-left">
        <span>{displayText}</span>
        {suggesterName && (
          <span className="text-xs text-slate-medium ml-2">by {suggesterName}</span>
        )}
      </div>
    </button>
  );
}

function MultipleChoiceResults({ options }: { options: PollOption[] }) {
  const totalVotes = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const percentage =
          totalVotes > 0 ? ((option.vote_count || 0) / totalVotes) * 100 : 0;
        const suggesterName = option.suggester?.display_name || option.suggester?.full_name;
        return (
          <div key={option.id}>
            <div className="flex justify-between mb-1">
              <div>
                <span className="font-medium">{option.option_text}</span>
                {suggesterName && (
                  <span className="text-xs text-slate-medium ml-2">by {suggesterName}</span>
                )}
              </div>
              <span className="text-slate-medium">
                {option.vote_count || 0} ({Math.round(percentage)}%)
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-electric-cyan rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingResults({ options }: { options: PollOption[] }) {
  // Calculate average rank for each option
  const optionsWithAvgRank = options.map((option) => {
    const ranks =
      option.votes?.map((v) => v.rank).filter((r) => r !== null) || [];
    const avgRank =
      ranks.length > 0
        ? ranks.reduce((sum, r) => sum + (r || 0), 0) / ranks.length
        : Infinity;
    return { ...option, avgRank };
  });

  // Sort by average rank (lower is better)
  const sorted = [...optionsWithAvgRank].sort((a, b) => a.avgRank - b.avgRank);

  return (
    <div className="space-y-3">
      {sorted.map((option, index) => {
        const suggesterName = option.suggester?.display_name || option.suggester?.full_name;
        return (
          <div
            key={option.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                index === 0
                  ? "bg-golden-sun text-white"
                  : index === 1
                  ? "bg-gray-300 text-white"
                  : index === 2
                  ? "bg-soft-lavender text-slate-dark"
                  : "bg-gray-200 text-slate-dark"
              }`}
            >
              {index + 1}
            </div>
            <div className="flex-1">
              <div>
                <span className="font-medium">{option.option_text}</span>
                {suggesterName && (
                  <span className="text-xs text-slate-medium ml-2">by {suggesterName}</span>
                )}
              </div>
              <div className="text-sm text-slate-medium">
                Avg rank:{" "}
                {option.avgRank === Infinity
                  ? "No votes"
                  : option.avgRank.toFixed(1)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DatePickerResults({
  options,
  isAnonymous,
}: {
  options: PollOption[];
  isAnonymous?: boolean;
}) {
  return (
    <div className="space-y-4">
      {options.map((option) => {
        const available =
          option.votes?.filter((v) => v.availability === "available").length ||
          0;
        const maybe =
          option.votes?.filter((v) => v.availability === "maybe").length || 0;
        const unavailable =
          option.votes?.filter((v) => v.availability === "unavailable").length ||
          0;
        const suggesterName = option.suggester?.display_name || option.suggester?.full_name;

        const displayDate = option.option_date
          ? new Date(option.option_date + "T00:00:00").toLocaleDateString(
              "en-US",
              {
                weekday: "short",
                month: "short",
                day: "numeric",
              }
            )
          : option.option_text;

        return (
          <div key={option.id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium">{displayDate}</span>
              {suggesterName && (
                <span className="text-xs text-slate-medium">by {suggesterName}</span>
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">{available} available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">{maybe} maybe</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">{unavailable} unavailable</span>
              </div>
            </div>
            {!isAnonymous && option.votes && option.votes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {option.votes.map((vote) => (
                    <span
                      key={vote.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        vote.availability === "available"
                          ? "bg-green-100 text-green-700"
                          : vote.availability === "maybe"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {vote.user?.display_name || vote.user?.full_name || "User"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LotteryEntries({ options }: { options: PollOption[] }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-medium mb-4">
        {options.length} suggestion{options.length !== 1 ? "s" : ""} in the pool
      </p>
      {options.map((option) => {
        const suggesterName = option.suggester?.display_name || option.suggester?.full_name;
        return (
          <div
            key={option.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <span className="font-medium">{option.option_text}</span>
              {suggesterName && (
                <span className="text-xs text-slate-medium ml-2">by {suggesterName}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
