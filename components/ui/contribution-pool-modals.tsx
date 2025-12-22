"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContributionPool,
  PaymentMethod,
  createPool,
  addContribution,
} from "@/lib/contribution-pool";

// ============================================
// CREATE POOL MODAL
// ============================================

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  trips?: { id: string; title: string }[];
  members?: { id: string; display_name: string | null; full_name: string | null }[];
  onCreated: (pool: ContributionPool) => void;
}

export function CreatePoolModal({
  isOpen,
  onClose,
  groupId,
  trips = [],
  members = [],
  onCreated,
}: CreatePoolModalProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tripId, setTripId] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Payment methods
  const [venmoEnabled, setVenmoEnabled] = useState(false);
  const [venmoHandle, setVenmoHandle] = useState("");
  const [zelleEnabled, setZelleEnabled] = useState(false);
  const [zelleHandle, setZelleHandle] = useState("");
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalHandle, setPaypalHandle] = useState("");
  const [cashEnabled, setCashEnabled] = useState(true);

  // Options
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowCustomAmounts, setAllowCustomAmounts] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTripId("");
    setGoalAmount("");
    setDeadline("");
    setSplitType("equal");
    setSelectedMembers([]);
    setVenmoEnabled(false);
    setVenmoHandle("");
    setZelleEnabled(false);
    setZelleHandle("");
    setPaypalEnabled(false);
    setPaypalHandle("");
    setCashEnabled(true);
    setIsPrivate(false);
    setAllowCustomAmounts(true);
    setRequireConfirmation(false);
    setStep(1);
  };

  const calculatePerPerson = () => {
    const goal = parseFloat(goalAmount) || 0;
    const count = selectedMembers.length || 1;
    return Math.ceil((goal / count) * 100) / 100;
  };

  const handleSubmit = () => {
    if (!title.trim() || !goalAmount) return;

    const paymentMethods: PaymentMethod[] = [];
    if (venmoEnabled) paymentMethods.push({ type: "venmo", handle: venmoHandle, enabled: true });
    if (zelleEnabled) paymentMethods.push({ type: "zelle", handle: zelleHandle, enabled: true });
    if (paypalEnabled) paymentMethods.push({ type: "paypal", handle: paypalHandle, enabled: true });
    if (cashEnabled) paymentMethods.push({ type: "cash", enabled: true });

    startTransition(async () => {
      const result = await createPool(groupId, {
        title,
        description: description || undefined,
        tripId: tripId || undefined,
        goalAmount: parseFloat(goalAmount),
        deadline: deadline || undefined,
        perPersonTarget: splitType === "equal" ? calculatePerPerson() : undefined,
        allowCustomAmounts,
        requireConfirmation,
        isPrivate,
        paymentMethods,
        memberIds: selectedMembers,
      });

      if (result.success && result.pool) {
        onCreated(result.pool);
        onClose();
        resetForm();
      }
    });
  };

  useEffect(() => {
    if (isOpen && members.length > 0) {
      setSelectedMembers(members.map((m) => m.id));
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Create Contribution Pool
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
            {/* Step indicator */}
            <div className="flex gap-2 mt-3">
              <div
                className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-amber-500" : "bg-amber-200"}`}
              />
              <div
                className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-amber-500" : "bg-amber-200"}`}
              />
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-5"
                >
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      What are you saving for? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Cancun Trip Fund, Beach House Rental..."
                      className="input w-full"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Description <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Saving for our June beach trip!"
                      className="input w-full resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Link to Trip */}
                  {trips.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Link to Trip <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <select
                        value={tripId}
                        onChange={(e) => setTripId(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">No linked trip</option>
                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Goal Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Goal Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        placeholder="3200"
                        className="input w-full pl-8"
                        min="1"
                        step="1"
                      />
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Deadline <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  {/* Split Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Split between:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <input
                          type="radio"
                          name="splitType"
                          checked={splitType === "equal"}
                          onChange={() => setSplitType("equal")}
                          className="w-4 h-4 text-amber-500"
                        />
                        <div>
                          <div className="font-medium">Everyone equally</div>
                          {goalAmount && selectedMembers.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              ${calculatePerPerson().toFixed(2)} each for {selectedMembers.length} people
                            </div>
                          )}
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <input
                          type="radio"
                          name="splitType"
                          checked={splitType === "custom"}
                          onChange={() => setSplitType("custom")}
                          className="w-4 h-4 text-amber-500"
                        />
                        <div>
                          <div className="font-medium">Custom amounts per person</div>
                          <div className="text-sm text-muted-foreground">
                            Set individual targets later
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-5"
                >
                  {/* Payment Methods */}
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Payment Methods (how can people pay you?)
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={venmoEnabled}
                          onChange={(e) => setVenmoEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span className="w-20">Venmo:</span>
                        <input
                          type="text"
                          value={venmoHandle}
                          onChange={(e) => setVenmoHandle(e.target.value)}
                          placeholder="@your-handle"
                          className="input flex-1"
                          disabled={!venmoEnabled}
                        />
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={zelleEnabled}
                          onChange={(e) => setZelleEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span className="w-20">Zelle:</span>
                        <input
                          type="text"
                          value={zelleHandle}
                          onChange={(e) => setZelleHandle(e.target.value)}
                          placeholder="email@example.com"
                          className="input flex-1"
                          disabled={!zelleEnabled}
                        />
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={paypalEnabled}
                          onChange={(e) => setPaypalEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span className="w-20">PayPal:</span>
                        <input
                          type="text"
                          value={paypalHandle}
                          onChange={(e) => setPaypalHandle(e.target.value)}
                          placeholder="email@example.com"
                          className="input flex-1"
                          disabled={!paypalEnabled}
                        />
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={cashEnabled}
                          onChange={(e) => setCashEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span>Cash accepted</span>
                      </label>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Options</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isPrivate}
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <div>
                          <div className="text-sm">Hide individual contribution amounts</div>
                          <div className="text-xs text-muted-foreground">
                            Others won't see how much each person contributed
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allowCustomAmounts}
                          onChange={(e) => setAllowCustomAmounts(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <div>
                          <div className="text-sm">Allow any contribution amount</div>
                          <div className="text-xs text-muted-foreground">
                            People can contribute any amount, not just their target
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={requireConfirmation}
                          onChange={(e) => setRequireConfirmation(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <div>
                          <div className="text-sm">Require admin confirmation</div>
                          <div className="text-xs text-muted-foreground">
                            Contributions are pending until you confirm payment received
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
            {step === 1 ? (
              <>
                <button onClick={onClose} disabled={isPending} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!title.trim() || !goalAmount}
                  className="btn-primary"
                >
                  Next
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} disabled={isPending} className="btn-secondary">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isPending ? "Creating..." : "Create Pool"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


// ============================================
// ADD CONTRIBUTION MODAL
// ============================================

interface AddContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: ContributionPool;
  groupId: string;
  userProgress: { target: number; contributed: number; remaining: number } | null;
  onAdded: () => void;
}

export function AddContributionModal({
  isOpen,
  onClose,
  pool,
  groupId,
  userProgress,
  onAdded,
}: AddContributionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const enabledPaymentMethods = pool.payment_methods?.filter((m) => m.enabled) || [];

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pool.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    startTransition(async () => {
      const result = await addContribution(pool.id, groupId, {
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || undefined,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });

      if (result.success) {
        onAdded();
        onClose();
        setAmount("");
        setPaymentMethod("");
        setPaymentReference("");
        setNotes("");
      }
    });
  };

  const newTotal = userProgress
    ? userProgress.contributed + (parseFloat(amount) || 0)
    : parseFloat(amount) || 0;

  const newPercent = userProgress && userProgress.target > 0
    ? Math.min(100, (newTotal / userProgress.target) * 100)
    : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                  <span className="text-xl">💵</span>
                  Log Your Contribution
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="200"
                    className="input w-full pl-8 text-xl font-medium"
                    min="1"
                    step="0.01"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Progress Preview */}
              {userProgress && userProgress.target > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Your progress:</span>
                    <span className="font-medium">
                      {formatCurrency(userProgress.contributed)} → {formatCurrency(newTotal)} of{" "}
                      {formatCurrency(userProgress.target)}
                    </span>
                  </div>
                  <div className="h-3 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: `${(userProgress.contributed / userProgress.target) * 100}%` }}
                      animate={{ width: `${newPercent}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    />
                  </div>
                  <div className="text-right text-sm font-medium text-amber-600 mt-1">
                    {newPercent.toFixed(0)}%
                  </div>
                </div>
              )}

              {/* Quick Amounts */}
              <div>
                <label className="block text-sm font-medium mb-2">Quick amounts:</label>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        amount === amt.toString()
                          ? "bg-amber-500 text-white"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                  {userProgress && userProgress.remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(userProgress.remaining.toString())}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        amount === userProgress.remaining.toString()
                          ? "bg-amber-500 text-white"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      Pay Remaining {formatCurrency(userProgress.remaining)}
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              {enabledPaymentMethods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    How did you pay?
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select payment method...</option>
                    {enabledPaymentMethods.map((method) => (
                      <option key={method.type} value={method.type}>
                        {method.type.charAt(0).toUpperCase() + method.type.slice(1)}
                        {method.handle ? ` (${method.handle})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Reference/Transaction ID <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="vnmo-12345"
                  className="input w-full"
                />
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
                  placeholder="December payment"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
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
                disabled={isPending || !amount}
                className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isPending ? "Submitting..." : "Submit Contribution"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
