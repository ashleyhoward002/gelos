// Contribution Pool Utility Functions
// These are client-safe helper functions

import { ContributionPool, PoolStatus } from "./contribution-pool";

// ============================================
// HELPER: Get pool status info
// ============================================

export function getPoolStatusInfo(pool: ContributionPool): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  const percent = pool.goal_amount > 0 ? (pool.current_amount / pool.goal_amount) * 100 : 0;

  if (pool.status === "completed") {
    return { label: "Completed", color: "#16a34a", bgColor: "#dcfce7", icon: "✅" };
  }
  if (pool.status === "cancelled") {
    return { label: "Cancelled", color: "#dc2626", bgColor: "#fef2f2", icon: "❌" };
  }
  if (pool.status === "paused") {
    return { label: "Paused", color: "#6b7280", bgColor: "#f3f4f6", icon: "⏸️" };
  }
  if (percent >= 100) {
    return { label: "Goal Reached!", color: "#16a34a", bgColor: "#dcfce7", icon: "🎉" };
  }
  if (percent >= 80) {
    return { label: "Almost There!", color: "#ea580c", bgColor: "#fff7ed", icon: "🟡" };
  }
  return { label: "Active", color: "#2563eb", bgColor: "#eff6ff", icon: "🟢" };
}

// ============================================
// HELPER: Calculate deadline info
// ============================================

export function getDeadlineInfo(deadline: string | null): {
  daysRemaining: number | null;
  isUrgent: boolean;
  label: string;
} {
  if (!deadline) {
    return { daysRemaining: null, isUrgent: false, label: "No deadline" };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline + "T00:00:00");
  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { daysRemaining, isUrgent: true, label: "Past deadline" };
  }
  if (daysRemaining === 0) {
    return { daysRemaining: 0, isUrgent: true, label: "Due today!" };
  }
  if (daysRemaining <= 7) {
    return { daysRemaining, isUrgent: true, label: `${daysRemaining} days left` };
  }
  if (daysRemaining <= 30) {
    return { daysRemaining, isUrgent: false, label: `${daysRemaining} days left` };
  }

  const months = Math.floor(daysRemaining / 30);
  return { daysRemaining, isUrgent: false, label: `${months} month${months > 1 ? "s" : ""} left` };
}
