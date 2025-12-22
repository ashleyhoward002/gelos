"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getExpenses,
  getUserBalance,
  getMemberBalances,
  getGroupMembers,
  getGuests,
  createExpense,
  createGuest,
  settleUp,
  deleteExpense,
  Expense,
  Balance,
  MemberBalance,
  ExpenseGuest,
} from "@/lib/expenses";
import {
  ExpenseCategory,
  ExpenseSplitType,
  categoryLabels,
  splitTypeLabels,
} from "@/lib/expense-constants";
import { getOutingsForSelect } from "@/lib/outings";
import Header from "@/components/Header";

const categories: { value: ExpenseCategory | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "📊" },
  { value: "food", label: "Food", icon: "🍽️" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "accommodation", label: "Stay", icon: "🏨" },
  { value: "activities", label: "Activities", icon: "🎯" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "utilities", label: "Utilities", icon: "💡" },
  { value: "entertainment", label: "Fun", icon: "🎬" },
  { value: "other", label: "Other", icon: "📦" },
];

interface Member {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface TripOption {
  id: string;
  title: string;
  outing_type: "outing" | "trip";
}

export default function ExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const tripIdFromUrl = searchParams.get("trip");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<Balance>({ you_owe: 0, you_are_owed: 0, net_balance: 0 });
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [guests, setGuests] = useState<ExpenseGuest[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "all">("all");
  const [searchQuery] = useState("");
  const [showSettled] = useState<"all" | "settled" | "unsettled">("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBalancesModal, setShowBalancesModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleWithMember, setSettleWithMember] = useState<MemberBalance | null>(null);

  // Add expense form
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("other");
  const [newPaidBy, setNewPaidBy] = useState("");
  const [newSplitType, setNewSplitType] = useState<ExpenseSplitType>("equal");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");
  const [newTripId, setNewTripId] = useState<string>("");
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  // Guest form
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");

  useEffect(() => {
    loadData();
  }, [groupId, selectedCategory, showSettled]);

  async function loadData() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
      setNewPaidBy(user.id);
    }

    const [expensesData, balanceData, memberBalancesData, membersData, guestsData, tripsData] = await Promise.all([
      getExpenses(groupId, {
        category: selectedCategory,
        settled: showSettled,
        search: searchQuery || undefined,
      }),
      getUserBalance(groupId),
      getMemberBalances(groupId),
      getGroupMembers(groupId),
      getGuests(groupId),
      getOutingsForSelect(groupId, "trip"),
    ]);

    setExpenses(expensesData);
    setBalance(balanceData);
    setMemberBalances(memberBalancesData);
    setMembers(membersData as Member[]);
    setGuests(guestsData);
    setTrips(tripsData as TripOption[]);

    // Set all members as default split members
    if (selectedSplitMembers.length === 0 && membersData.length > 0) {
      setSelectedSplitMembers(
        membersData.filter((m): m is Member => m !== null).map((m) => m.id)
      );
    }

    // Set trip from URL if present and modal should open
    if (tripIdFromUrl && !newTripId) {
      setNewTripId(tripIdFromUrl);
      setShowAddModal(true);
    }

    setLoading(false);
  }

  function toggleSplitMember(id: string) {
    setSelectedSplitMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleAddGuest() {
    if (!newGuestName.trim()) return;

    const result = await createGuest(groupId, newGuestName);
    if (result.error) {
      alert(result.error);
    } else if (result.guest) {
      setGuests((prev) => [...prev, result.guest!]);
      setNewGuestName("");
      setShowGuestInput(false);
    }
  }

  function calculateSplits() {
    const amount = parseFloat(newAmount) || 0;
    const splitCount = selectedSplitMembers.length;

    if (splitCount === 0 || amount === 0) return [];

    if (newSplitType === "equal") {
      const perPerson = amount / splitCount;
      return selectedSplitMembers.map((id) => {
        const isGuest = guests.some((g) => g.id === id);
        return {
          [isGuest ? "guest_id" : "user_id"]: id,
          amount: Math.round(perPerson * 100) / 100,
        };
      });
    }

    if (newSplitType === "custom") {
      return selectedSplitMembers.map((id) => {
        const isGuest = guests.some((g) => g.id === id);
        return {
          [isGuest ? "guest_id" : "user_id"]: id,
          amount: parseFloat(customAmounts[id] || "0"),
        };
      });
    }

    if (newSplitType === "percentage") {
      return selectedSplitMembers.map((id) => {
        const isGuest = guests.some((g) => g.id === id);
        const percentage = parseFloat(customPercentages[id] || "0");
        return {
          [isGuest ? "guest_id" : "user_id"]: id,
          amount: Math.round((amount * percentage / 100) * 100) / 100,
          percentage,
        };
      });
    }

    return [];
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDescription.trim() || !newAmount || !newPaidBy) return;

    const splits = calculateSplits();
    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
    const amount = parseFloat(newAmount);

    // Validate split totals
    if (newSplitType !== "equal" && Math.abs(totalSplit - amount) > 0.01) {
      alert(`Split amounts ($${totalSplit.toFixed(2)}) don't match the total ($${amount.toFixed(2)})`);
      return;
    }

    setCreating(true);

    const result = await createExpense(groupId, {
      description: newDescription,
      amount: parseFloat(newAmount),
      paid_by: newPaidBy,
      split_type: newSplitType,
      category: newCategory,
      expense_date: newDate,
      notes: newNotes,
      outing_id: newTripId || undefined,
      splits,
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
    setNewDescription("");
    setNewAmount("");
    setNewCategory("other");
    setNewSplitType("equal");
    setNewDate(new Date().toISOString().split("T")[0]);
    setNewNotes("");
    setNewTripId("");
    setCustomAmounts({});
    setCustomPercentages({});
    // Keep selected members
  }

  async function handleSettleUp() {
    if (!settleWithMember) return;

    const result = await settleUp(groupId, settleWithMember.other_user_id);
    if (result.error) {
      alert(result.error);
    } else {
      setShowSettleModal(false);
      setSettleWithMember(null);
      loadData();
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const result = await deleteExpense(expenseId, groupId);
    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }
  }

  function getMemberName(member: Member | null | undefined): string {
    return member?.display_name || member?.full_name || "Unknown";
  }

  function getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Expenses"
        subtitle="Track spending & split costs"
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Balance Summary */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg">Your Balance</h2>
            <button
              onClick={() => setShowBalancesModal(true)}
              className="text-sm text-electric-cyan hover:underline"
            >
              View Details
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl ${balance.you_owe > 0 ? "bg-red-50" : "bg-bright-white"}`}>
              <p className="text-sm text-slate-medium mb-1">You owe</p>
              <p className={`text-2xl font-bold ${balance.you_owe > 0 ? "text-red-600" : "text-slate-dark"}`}>
                ${balance.you_owe.toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${balance.you_are_owed > 0 ? "bg-green-50" : "bg-bright-white"}`}>
              <p className="text-sm text-slate-medium mb-1">You&apos;re owed</p>
              <p className={`text-2xl font-bold ${balance.you_are_owed > 0 ? "text-green-600" : "text-slate-dark"}`}>
                ${balance.you_are_owed.toFixed(2)}
              </p>
            </div>
          </div>

          {memberBalances.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-slate-medium mb-3">Quick Settle Up</p>
              <div className="flex flex-wrap gap-2">
                {memberBalances.slice(0, 3).map((mb) => (
                  <button
                    key={mb.other_user_id}
                    onClick={() => {
                      setSettleWithMember(mb);
                      setShowSettleModal(true);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mb.direction === "you_owe"
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    <span>{getMemberName(mb.user)}</span>
                    <span className="font-bold">${mb.amount.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
          <button
            onClick={() => router.push(`/groups/${groupId}/expenses/budget`)}
            className="btn-secondary flex items-center justify-center gap-2 px-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Budget
          </button>
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="text-center py-12 text-slate-medium">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-heading font-semibold text-lg mb-2">No expenses yet!</h3>
            <p className="text-slate-medium">
              Start tracking your group expenses and split costs fairly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                onDelete={() => handleDelete(expense.id)}
                onClick={() => router.push(`/groups/${groupId}/expenses/${expense.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl">Add Expense</h2>
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
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  What was it for? *
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Dinner at Joe's"
                  className="input w-full"
                  required
                />
              </div>

              {/* Amount & Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      className="input w-full pl-7"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.filter((c) => c.value !== "all").map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewCategory(cat.value as ExpenseCategory)}
                      className={`p-2 rounded-lg border-2 text-center transition-colors ${
                        newCategory === cat.value
                          ? "border-electric-cyan bg-electric-cyan/5"
                          : "border-gray-200 hover:border-electric-cyan/50"
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <p className="text-xs mt-1">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link to Trip */}
              {trips.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Link to Trip (optional)
                  </label>
                  <select
                    value={newTripId}
                    onChange={(e) => setNewTripId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">No trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-medium mt-1">
                    Link this expense to a trip to track its budget
                  </p>
                </div>
              )}

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Paid by</label>
                <select
                  value={newPaidBy}
                  onChange={(e) => setNewPaidBy(e.target.value)}
                  className="input w-full"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getMemberName(member)} {member.id === currentUserId && "(You)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Split type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(splitTypeLabels) as ExpenseSplitType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewSplitType(type)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        newSplitType === type
                          ? "border-electric-cyan bg-electric-cyan/5"
                          : "border-gray-200 hover:border-electric-cyan/50"
                      }`}
                    >
                      <p className="font-medium text-sm">{splitTypeLabels[type].label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Split With */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-2">Split with</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                        selectedSplitMembers.includes(member.id)
                          ? "border-electric-cyan bg-electric-cyan/5"
                          : "border-gray-200"
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={selectedSplitMembers.includes(member.id)}
                          onChange={() => toggleSplitMember(member.id)}
                          className="w-5 h-5 rounded border-gray-300 text-electric-cyan focus:ring-electric-cyan"
                        />
                        <span>{getMemberName(member)}</span>
                      </label>

                      {/* Custom amount/percentage input */}
                      {selectedSplitMembers.includes(member.id) && newSplitType === "custom" && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={customAmounts[member.id] || ""}
                            onChange={(e) => setCustomAmounts({ ...customAmounts, [member.id]: e.target.value })}
                            placeholder="0.00"
                            className="input w-full pl-5 py-1 text-sm"
                          />
                        </div>
                      )}
                      {selectedSplitMembers.includes(member.id) && newSplitType === "percentage" && (
                        <div className="relative w-20">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={customPercentages[member.id] || ""}
                            onChange={(e) => setCustomPercentages({ ...customPercentages, [member.id]: e.target.value })}
                            placeholder="0"
                            className="input w-full pr-6 py-1 text-sm"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">%</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Guests */}
                  {guests.map((guest) => (
                    <div
                      key={guest.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                        selectedSplitMembers.includes(guest.id)
                          ? "border-electric-cyan bg-electric-cyan/5"
                          : "border-gray-200"
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={selectedSplitMembers.includes(guest.id)}
                          onChange={() => toggleSplitMember(guest.id)}
                          className="w-5 h-5 rounded border-gray-300 text-electric-cyan focus:ring-electric-cyan"
                        />
                        <span>{guest.name} <span className="text-xs text-slate-medium">(Guest)</span></span>
                      </label>

                      {selectedSplitMembers.includes(guest.id) && newSplitType === "custom" && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={customAmounts[guest.id] || ""}
                            onChange={(e) => setCustomAmounts({ ...customAmounts, [guest.id]: e.target.value })}
                            placeholder="0.00"
                            className="input w-full pl-5 py-1 text-sm"
                          />
                        </div>
                      )}
                      {selectedSplitMembers.includes(guest.id) && newSplitType === "percentage" && (
                        <div className="relative w-20">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={customPercentages[guest.id] || ""}
                            onChange={(e) => setCustomPercentages({ ...customPercentages, [guest.id]: e.target.value })}
                            placeholder="0"
                            className="input w-full pr-6 py-1 text-sm"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">%</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Guest */}
                  {showGuestInput ? (
                    <div className="flex items-center gap-2 p-3 bg-bright-white rounded-lg">
                      <input
                        type="text"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        placeholder="Guest name"
                        className="input flex-1 py-2"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddGuest}
                        className="btn-primary py-2 px-4"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestInput(false);
                          setNewGuestName("");
                        }}
                        className="text-slate-medium hover:text-slate-dark p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowGuestInput(true)}
                      className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 text-slate-medium hover:border-electric-cyan hover:text-electric-cyan transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Add guest (non-member)
                    </button>
                  )}
                </div>
              </div>

              {/* Split Preview */}
              {newAmount && selectedSplitMembers.length > 0 && (
                <div className="bg-bright-white rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-dark mb-2">Split Preview</p>
                  <div className="space-y-1 text-sm">
                    {calculateSplits().map((split, idx) => {
                      const id = split.user_id || split.guest_id;
                      const member = members.find((m) => m.id === id);
                      const guest = guests.find((g) => g.id === id);
                      const name = member ? getMemberName(member) : guest?.name || "Unknown";
                      return (
                        <div key={idx} className="flex justify-between">
                          <span>{name}</span>
                          <span className="font-medium">${split.amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-300 pt-1 mt-2 flex justify-between font-medium">
                      <span>Total</span>
                      <span>${calculateSplits().reduce((sum, s) => sum + s.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Notes (optional)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                  className="input w-full resize-none"
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
                  disabled={creating || !newDescription.trim() || !newAmount || selectedSplitMembers.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balances Modal */}
      {showBalancesModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowBalancesModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl">Detailed Balances</h2>
              <button
                onClick={() => setShowBalancesModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {memberBalances.length === 0 ? (
              <div className="text-center py-8 text-slate-medium">
                <p>All settled up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberBalances.map((mb) => (
                  <div
                    key={mb.other_user_id}
                    className={`p-4 rounded-xl flex items-center justify-between ${
                      mb.direction === "you_owe" ? "bg-red-50" : "bg-green-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        {mb.user?.avatar_url ? (
                          <img
                            src={mb.user.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-medium text-slate-dark">
                            {getInitial(getMemberName(mb.user))}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{getMemberName(mb.user)}</p>
                        <p className={`text-sm ${mb.direction === "you_owe" ? "text-red-600" : "text-green-600"}`}>
                          {mb.direction === "you_owe" ? "You owe" : "Owes you"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${mb.direction === "you_owe" ? "text-red-600" : "text-green-600"}`}>
                        ${mb.amount.toFixed(2)}
                      </p>
                      <button
                        onClick={() => {
                          setSettleWithMember(mb);
                          setShowBalancesModal(false);
                          setShowSettleModal(true);
                        }}
                        className="text-sm text-electric-cyan hover:underline"
                      >
                        Settle Up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && settleWithMember && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSettleModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading font-bold text-xl mb-4">Settle Up</h2>

            <div className={`p-4 rounded-xl mb-6 ${
              settleWithMember.direction === "you_owe" ? "bg-red-50" : "bg-green-50"
            }`}>
              <p className="text-center text-slate-medium mb-2">
                {settleWithMember.direction === "you_owe"
                  ? `You owe ${getMemberName(settleWithMember.user)}`
                  : `${getMemberName(settleWithMember.user)} owes you`}
              </p>
              <p className={`text-3xl font-bold text-center ${
                settleWithMember.direction === "you_owe" ? "text-red-600" : "text-green-600"
              }`}>
                ${settleWithMember.amount.toFixed(2)}
              </p>
            </div>

            <p className="text-sm text-slate-medium text-center mb-6">
              This will mark all expenses between you as settled.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSettleModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleUp}
                className="btn-primary flex-1"
              >
                Settle Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseCard({
  expense,
  currentUserId,
  onDelete,
  onClick,
}: {
  expense: Expense;
  currentUserId: string;
  onDelete: () => void;
  onClick: () => void;
}) {
  const isCreator = expense.created_by === currentUserId;
  const isPayer = expense.paid_by === currentUserId;
  const category = categoryLabels[expense.category];

  // Calculate what current user owes/is owed for this expense
  const userSplit = expense.splits?.find((s) => s.user_id === currentUserId);
  const unsettledOwed = expense.splits
    ?.filter((s) => s.user_id !== currentUserId && !s.is_settled)
    .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

  const settledCount = expense.splits?.filter((s) => s.is_settled).length || 0;
  const totalSplits = expense.splits?.length || 0;

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className="w-10 h-10 rounded-lg bg-soft-lavender/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{category.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-slate-dark truncate">{expense.description}</h3>
              <p className="text-sm text-slate-medium">
                {expense.payer?.display_name || expense.payer?.full_name || "Unknown"} paid
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-lg">${Number(expense.amount).toFixed(2)}</p>
              <p className="text-xs text-slate-medium">
                {new Date(expense.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Status Row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              {isPayer && unsettledOwed > 0 ? (
                <span className="text-green-600">+${unsettledOwed.toFixed(2)} owed</span>
              ) : userSplit && !userSplit.is_settled ? (
                <span className="text-red-600">-${Number(userSplit.amount).toFixed(2)} owe</span>
              ) : (
                <span className="text-green-600">Settled</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-medium">
                {settledCount}/{totalSplits} settled
              </span>
              {isCreator && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-slate-medium hover:text-red-500 p-1"
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
