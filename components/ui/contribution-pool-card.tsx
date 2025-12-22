"use client";

import { motion } from "framer-motion";
import { ContributionPool } from "@/lib/contribution-pool";
import { getPoolStatusInfo, getDeadlineInfo } from "@/lib/contribution-pool-utils";

interface ContributionPoolCardProps {
  pool: ContributionPool;
  userProgress?: { target: number; contributed: number; remaining: number } | null;
  onViewDetails: () => void;
  onContribute: () => void;
}

export function ContributionPoolCard({
  pool,
  userProgress,
  onViewDetails,
  onContribute,
}: ContributionPoolCardProps) {
  const percent = pool.goal_amount > 0
    ? Math.min(100, (pool.current_amount / pool.goal_amount) * 100)
    : 0;

  const statusInfo = getPoolStatusInfo(pool);
  const deadlineInfo = getDeadlineInfo(pool.deadline);
  const memberCount = pool.members?.filter((m) => !m.is_exempt).length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pool.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">
            {pool.trip_id ? "🏝️" : "💰"}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">{pool.title}</h3>
            {pool.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {pool.description}
              </p>
            )}
          </div>
        </div>

        <span
          className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
          style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        >
          {statusInfo.icon} {statusInfo.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold">
            {formatCurrency(pool.current_amount)}
            <span className="text-base font-normal text-muted-foreground">
              {" "}of {formatCurrency(pool.goal_amount)}
            </span>
          </span>
          <span className="text-lg font-semibold text-amber-600">
            {percent.toFixed(0)}%
          </span>
        </div>

        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          />
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <span>👥</span>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        {pool.deadline && (
          <span
            className={`flex items-center gap-1 ${
              deadlineInfo.isUrgent ? "text-red-600 font-medium" : ""
            }`}
          >
            <span>📅</span>
            Due: {new Date(pool.deadline + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* User Progress */}
      {userProgress && userProgress.target > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your progress:</span>
            <span className="text-sm">
              {formatCurrency(userProgress.contributed)} / {formatCurrency(userProgress.target)}
            </span>
          </div>
          <div className="mt-2 h-2 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, (userProgress.contributed / userProgress.target) * 100)}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-amber-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onViewDetails} className="btn-secondary flex-1">
          View Details
        </button>
        {pool.status === "active" && (
          <button
            onClick={onContribute}
            className="flex-1 btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            + Contribute
          </button>
        )}
      </div>
    </div>
  );
}

export default ContributionPoolCard;
