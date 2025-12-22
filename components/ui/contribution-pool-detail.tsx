"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContributionPool,
  PoolMember,
  PoolContribution,
  PaymentMethod,
  confirmContribution,
  rejectContribution,
  refundContribution,
  updatePool,
  deletePool,
  exemptMember,
  recalculatePoolTargets,
} from "@/lib/contribution-pool";
import { getPoolStatusInfo, getDeadlineInfo } from "@/lib/contribution-pool-utils";
import { AddContributionModal } from "./contribution-pool-modals";

interface ContributionPoolDetailProps {
  pool: ContributionPool;
  groupId: string;
  currentUserId: string;
  userProgress: { target: number; contributed: number; remaining: number } | null;
  onRefresh: () => void;
  onClose: () => void;
}

export function ContributionPoolDetail({
  pool,
  groupId,
  currentUserId,
  userProgress,
  onRefresh,
  onClose,
}: ContributionPoolDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "contributions" | "settings">("overview");
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isCreator = pool.created_by === currentUserId;
  const statusInfo = getPoolStatusInfo(pool);
  const deadlineInfo = getDeadlineInfo(pool.deadline);

  const percent = pool.goal_amount > 0
    ? Math.min(100, (pool.current_amount / pool.goal_amount) * 100)
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pool.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleConfirmContribution = (contributionId: string) => {
    startTransition(async () => {
      await confirmContribution(contributionId, groupId);
      onRefresh();
    });
  };

  const handleRejectContribution = (contributionId: string) => {
    startTransition(async () => {
      await rejectContribution(contributionId, groupId, rejectReason);
      setShowRejectModal(null);
      setRejectReason("");
      onRefresh();
    });
  };

  const handleRefundContribution = (contributionId: string) => {
    if (!confirm("Mark this contribution as refunded?")) return;
    startTransition(async () => {
      await refundContribution(contributionId, groupId);
      onRefresh();
    });
  };

  const handleUpdateStatus = (status: "active" | "paused" | "completed" | "cancelled") => {
    startTransition(async () => {
      await updatePool(pool.id, groupId, { status });
      onRefresh();
    });
  };

  const handleRecalculate = () => {
    startTransition(async () => {
      await recalculatePoolTargets(pool.id, groupId);
      onRefresh();
    });
  };

  const handleExempt = (userId: string, exempt: boolean) => {
    startTransition(async () => {
      await exemptMember(pool.id, groupId, userId, exempt);
      onRefresh();
    });
  };

  const handleDeletePool = () => {
    if (!confirm("Delete this pool? This action cannot be undone.")) return;
    startTransition(async () => {
      await deletePool(pool.id, groupId);
      onClose();
    });
  };

  const memberCount = pool.members?.filter((m) => !m.is_exempt).length || 0;
  const pendingCount = pool.contributions?.filter((c) => c.status === "pending").length || 0;

  const getPaymentMethodIcon = (type: string) => {
    const icons: Record<string, string> = {
      venmo: "💳",
      zelle: "🏦",
      paypal: "💰",
      cash: "💵",
      bank: "🏛️",
      other: "📱",
    };
    return icons[type] || "💰";
  };

  const getContributionStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Pending" },
      confirmed: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Confirmed" },
      rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Rejected" },
      refunded: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: "Refunded" },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{pool.trip_id ? "🏝️" : "💰"}</div>
                <div>
                  <h2 className="font-heading font-semibold text-xl">{pool.title}</h2>
                  {pool.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{pool.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                  style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                >
                  {statusInfo.icon} {statusInfo.label}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-4">
              {(["overview", "members", "contributions", ...(isCreator ? ["settings"] : [])] as ("overview" | "members" | "contributions" | "settings")[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? "bg-card text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "contributions" && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[calc(90vh-220px)]">
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 space-y-6"
                >
                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-bold">{formatCurrency(pool.current_amount)}</div>
                        <div className="text-muted-foreground">
                          of {formatCurrency(pool.goal_amount)} goal
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-amber-600">{percent.toFixed(0)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(pool.goal_amount - pool.current_amount)} remaining
                        </div>
                      </div>
                    </div>

                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      />
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span>👥</span> {memberCount} {memberCount === 1 ? "member" : "members"}
                      </span>
                      {pool.deadline && (
                        <span className={`flex items-center gap-1 ${deadlineInfo.isUrgent ? "text-red-600 font-medium" : ""}`}>
                          <span>📅</span> {deadlineInfo.label}
                        </span>
                      )}
                      {pool.per_person_target && (
                        <span className="flex items-center gap-1">
                          <span>👤</span> {formatCurrency(pool.per_person_target)}/person
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Your Progress */}
                  {userProgress && userProgress.target > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Your Progress</span>
                        <span className="text-sm">
                          {formatCurrency(userProgress.contributed)} / {formatCurrency(userProgress.target)}
                        </span>
                      </div>
                      <div className="h-3 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (userProgress.contributed / userProgress.target) * 100)}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-amber-500 rounded-full"
                        />
                      </div>
                      {userProgress.remaining > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {formatCurrency(userProgress.remaining)} remaining
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Methods */}
                  {pool.payment_methods && pool.payment_methods.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">How to Pay</h3>
                      <div className="space-y-2">
                        {pool.payment_methods.filter((m) => m.enabled).map((method) => (
                          <div
                            key={method.type}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <span className="text-xl">{getPaymentMethodIcon(method.type)}</span>
                            <div>
                              <div className="font-medium capitalize">{method.type}</div>
                              {method.handle && (
                                <div className="text-sm text-muted-foreground">{method.handle}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contribute Button */}
                  {pool.status === "active" && (
                    <button
                      onClick={() => setShowContributeModal(true)}
                      className="w-full py-3 font-medium rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                    >
                      + Log Contribution
                    </button>
                  )}
                </motion.div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                <motion.div
                  key="members"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Member Progress</h3>
                    {isCreator && (
                      <button
                        onClick={handleRecalculate}
                        disabled={isPending}
                        className="text-sm text-amber-600 hover:text-amber-700"
                      >
                        Recalculate Splits
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {pool.members?.map((member) => {
                      const memberPercent = member.target_amount && member.target_amount > 0
                        ? Math.min(100, (member.total_contributed / member.target_amount) * 100)
                        : 0;

                      return (
                        <div
                          key={member.id}
                          className={`p-4 rounded-xl border ${
                            member.is_exempt
                              ? "bg-muted/30 border-muted"
                              : "bg-card border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
                                {(member.user?.display_name || member.user?.full_name || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {member.user?.display_name || member.user?.full_name || "Unknown"}
                                  {member.user_id === currentUserId && (
                                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                  )}
                                </div>
                                {member.is_exempt ? (
                                  <div className="text-xs text-muted-foreground">
                                    Exempt{member.exempt_reason ? `: ${member.exempt_reason}` : ""}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(member.total_contributed)}
                                    {member.target_amount ? ` / ${formatCurrency(member.target_amount)}` : ""}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isCreator && member.user_id !== currentUserId && (
                              <button
                                onClick={() => handleExempt(member.user_id, !member.is_exempt)}
                                disabled={isPending}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                {member.is_exempt ? "Include" : "Exempt"}
                              </button>
                            )}
                          </div>

                          {!member.is_exempt && member.target_amount && member.target_amount > 0 && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${memberPercent}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full rounded-full ${
                                  memberPercent >= 100
                                    ? "bg-green-500"
                                    : "bg-gradient-to-r from-amber-400 to-orange-500"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {(!pool.members || pool.members.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        No members yet
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Contributions Tab */}
              {activeTab === "contributions" && (
                <motion.div
                  key="contributions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <h3 className="font-medium mb-4">Contribution History</h3>

                  <div className="space-y-3">
                    {pool.contributions?.map((contribution) => (
                      <div
                        key={contribution.id}
                        className="p-4 rounded-xl border border-border"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm">
                              {(contribution.user?.display_name || contribution.user?.full_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">
                                {contribution.user?.display_name || contribution.user?.full_name || "Unknown"}
                                {contribution.user_id === currentUserId && (
                                  <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(contribution.contributed_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {contribution.payment_method && (
                                  <span> via {contribution.payment_method}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(contribution.amount)}</div>
                            {getContributionStatusBadge(contribution.status)}
                          </div>
                        </div>

                        {contribution.notes && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
                            "{contribution.notes}"
                          </div>
                        )}

                        {contribution.rejection_reason && (
                          <div className="mt-2 text-sm text-red-600">
                            Rejected: {contribution.rejection_reason}
                          </div>
                        )}

                        {/* Admin actions for pending contributions */}
                        {isCreator && contribution.status === "pending" && (
                          <div className="mt-3 pt-3 border-t border-border flex gap-2">
                            <button
                              onClick={() => handleConfirmContribution(contribution.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setShowRejectModal(contribution.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Refund option for confirmed contributions */}
                        {isCreator && contribution.status === "confirmed" && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <button
                              onClick={() => handleRefundContribution(contribution.id)}
                              disabled={isPending}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              Mark as Refunded
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {(!pool.contributions || pool.contributions.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        No contributions yet
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Settings Tab (Creator only) */}
              {activeTab === "settings" && isCreator && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 space-y-6"
                >
                  {/* Pool Status */}
                  <div>
                    <h3 className="font-medium mb-3">Pool Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {(["active", "paused", "completed", "cancelled"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(status)}
                          disabled={isPending || pool.status === status}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            pool.status === status
                              ? "bg-amber-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pool Info */}
                  <div>
                    <h3 className="font-medium mb-3">Pool Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{new Date(pool.created_at).toLocaleDateString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Confirmation Required</dt>
                        <dd>{pool.require_confirmation ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Privacy</dt>
                        <dd>{pool.is_private ? "Amounts hidden" : "Public"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Custom Amounts</dt>
                        <dd>{pool.allow_custom_amounts ? "Allowed" : "Fixed targets only"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="font-medium text-red-600 mb-3">Danger Zone</h3>
                    <button
                      onClick={handleDeletePool}
                      disabled={isPending}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      Delete Pool
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Contribute Modal */}
      <AddContributionModal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        pool={pool}
        groupId={groupId}
        userProgress={userProgress}
        onAdded={onRefresh}
      />

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 p-6"
            >
              <h3 className="font-heading font-semibold text-lg mb-4">Reject Contribution</h3>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="input w-full mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectModal(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectContribution(showRejectModal)}
                  disabled={isPending}
                  className="btn-primary bg-red-500 hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ContributionPoolDetail;
