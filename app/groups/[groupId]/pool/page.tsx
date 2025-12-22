"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ContributionPool,
  getPools,
  getPool,
  getUserPoolProgress,
} from "@/lib/contribution-pool";
import { getUser } from "@/lib/auth";
import { getGroupMembers } from "@/lib/expenses";
import { ContributionPoolCard } from "@/components/ui/contribution-pool-card";
import { ContributionPoolDetail } from "@/components/ui/contribution-pool-detail";
import { CreatePoolModal } from "@/components/ui/contribution-pool-modals";

interface GroupMember {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function PoolPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [pools, setPools] = useState<ContributionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const [selectedPool, setSelectedPool] = useState<ContributionPool | null>(null);
  const [selectedPoolProgress, setSelectedPoolProgress] = useState<{
    target: number;
    contributed: number;
    remaining: number;
  } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [userProgressMap, setUserProgressMap] = useState<
    Record<string, { target: number; contributed: number; remaining: number } | null>
  >({});

  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [user, poolsData, groupMembers] = await Promise.all([
        getUser(),
        getPools(groupId),
        getGroupMembers(groupId),
      ]);

      setCurrentUserId(user?.id || null);
      setPools(poolsData);
      setMembers((groupMembers || []).filter((m): m is GroupMember => m !== null));

      // Load user progress for each pool
      const progressPromises = poolsData.map(async (pool) => {
        const progress = await getUserPoolProgress(pool.id);
        return { poolId: pool.id, progress };
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap: Record<string, { target: number; contributed: number; remaining: number } | null> = {};
      progressResults.forEach(({ poolId, progress }) => {
        progressMap[poolId] = progress;
      });
      setUserProgressMap(progressMap);
    } catch (error) {
      console.error("Error loading pools:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetails = async (pool: ContributionPool) => {
    // Load full pool details
    const fullPool = await getPool(pool.id);
    const progress = await getUserPoolProgress(pool.id);
    if (fullPool) {
      setSelectedPool(fullPool);
      setSelectedPoolProgress(progress);
    }
  };

  const handleRefreshSelected = async () => {
    if (selectedPool) {
      const fullPool = await getPool(selectedPool.id);
      const progress = await getUserPoolProgress(selectedPool.id);
      if (fullPool) {
        setSelectedPool(fullPool);
        setSelectedPoolProgress(progress);
      }
    }
    loadData();
  };

  const filteredPools = pools.filter((pool) => {
    if (filter === "active") return pool.status === "active";
    if (filter === "completed") return pool.status === "completed";
    return true;
  });

  const activePoolsCount = pools.filter((p) => p.status === "active").length;
  const totalGoal = pools.filter((p) => p.status === "active").reduce((sum, p) => sum + p.goal_amount, 0);
  const totalRaised = pools.filter((p) => p.status === "active").reduce((sum, p) => sum + p.current_amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/groups/${groupId}`}
                className="text-slate-medium hover:text-electric-cyan transition-colors"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-heading font-semibold flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Savings Pools
              </h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              + New Pool
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
          >
            <div className="text-sm text-amber-700 font-medium">Active Pools</div>
            <div className="text-3xl font-bold text-amber-600">{activePoolsCount}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
          >
            <div className="text-sm text-green-700 font-medium">Total Raised</div>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totalRaised)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
          >
            <div className="text-sm text-blue-700 font-medium">Goal Total</div>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(totalGoal)}</div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-amber-500 text-white"
                  : "bg-white text-slate-dark hover:bg-muted"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "active" && pools.filter((p) => p.status === "active").length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {pools.filter((p) => p.status === "active").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin h-10 w-10 border-3 border-amber-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-muted-foreground">Loading pools...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && pools.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-16"
          >
            <div className="text-6xl mb-4">💰</div>
            <h3 className="font-heading font-semibold text-xl mb-2">
              No Savings Pools Yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a pool to start saving together as a group. Perfect for trips,
              group gifts, or shared expenses.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Create First Pool
            </button>
          </motion.div>
        )}

        {/* Pools Grid */}
        {!loading && filteredPools.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredPools.map((pool, index) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ContributionPoolCard
                    pool={pool}
                    userProgress={userProgressMap[pool.id]}
                    onViewDetails={() => handleViewDetails(pool)}
                    onContribute={() => handleViewDetails(pool)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* No Results */}
        {!loading && pools.length > 0 && filteredPools.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No {filter} pools found
          </div>
        )}
      </main>

      {/* Create Pool Modal */}
      <CreatePoolModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        groupId={groupId}
        members={members.map((m) => ({
          id: m.id,
          display_name: m.display_name,
          full_name: m.full_name,
        }))}
        onCreated={(pool) => {
          setPools((prev) => [pool, ...prev]);
          setShowCreateModal(false);
        }}
      />

      {/* Pool Detail Modal */}
      <AnimatePresence>
        {selectedPool && currentUserId && (
          <ContributionPoolDetail
            pool={selectedPool}
            groupId={groupId}
            currentUserId={currentUserId}
            userProgress={selectedPoolProgress}
            onRefresh={handleRefreshSelected}
            onClose={() => {
              setSelectedPool(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
