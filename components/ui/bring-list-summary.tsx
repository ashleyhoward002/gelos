"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getBringListSummary } from "@/lib/bring-list";

interface BringListSummaryProps {
  eventId?: string;
  outingId?: string;
}

export function BringListSummary({ eventId, outingId }: BringListSummaryProps) {
  const [summary, setSummary] = useState<{
    totalItems: number;
    claimedItems: number;
    unclaimedItems: number;
    receivedItems: number;
    contributors: { userId: string; userName: string; items: string[] }[];
    stillNeeded: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const data = await getBringListSummary({ eventId, outingId });
    setSummary(data);
    setLoading(false);
  }, [eventId, outingId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="h-32 bg-muted animate-pulse rounded-xl" />
    );
  }

  if (!summary) {
    return null;
  }

  const percentComplete = summary.totalItems > 0
    ? Math.round((summary.claimedItems / summary.totalItems) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <span className="text-xl">📋</span>
          Sign-Up Summary
        </h3>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{summary.claimedItems}</div>
            <div className="text-xs text-muted-foreground">claimed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{summary.unclaimedItems}</div>
            <div className="text-xs text-muted-foreground">still needed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{summary.receivedItems}</div>
            <div className="text-xs text-muted-foreground">received</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentComplete}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Contributors */}
      {summary.contributors.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium mb-3">Who's bringing what:</h4>
          <div className="space-y-2">
            {summary.contributors.map((contributor) => (
              <div key={contributor.userId} className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <div>
                  <span className="font-medium">{contributor.userName}:</span>{" "}
                  <span className="text-muted-foreground">
                    {contributor.items.join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Still Needed */}
      {summary.stillNeeded.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium mb-3 text-amber-600">Still needed:</h4>
          <div className="flex flex-wrap gap-2">
            {summary.stillNeeded.slice(0, 8).map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 text-sm rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              >
                {item}
              </span>
            ))}
            {summary.stillNeeded.length > 8 && (
              <span className="px-2 py-1 text-sm text-muted-foreground">
                +{summary.stillNeeded.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* All claimed! */}
      {summary.unclaimedItems === 0 && summary.totalItems > 0 && (
        <div className="p-4 text-center">
          <span className="text-2xl">🎉</span>
          <p className="text-green-600 font-medium mt-1">All items claimed!</p>
        </div>
      )}
    </div>
  );
}

export default BringListSummary;
