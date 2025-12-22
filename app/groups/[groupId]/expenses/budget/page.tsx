"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExpenses, Expense, getGroupMembers } from "@/lib/expenses";
import { ExpenseCategory, categoryLabels } from "@/lib/expense-constants";
import Header from "@/components/Header";

interface CategoryBudget {
  category: ExpenseCategory;
  label: string;
  icon: string;
  spent: number;
  budget: number;
  percentage: number;
}

interface Member {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const defaultBudgets: Record<ExpenseCategory, number> = {
  food: 500,
  transport: 300,
  accommodation: 800,
  activities: 400,
  shopping: 200,
  utilities: 100,
  entertainment: 150,
  other: 250,
};

export default function BudgetCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Record<ExpenseCategory, number>>(defaultBudgets);
  const [editingBudget, setEditingBudget] = useState<ExpenseCategory | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState("");
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    setLoading(true);

    const [expensesData, membersData] = await Promise.all([
      getExpenses(groupId),
      getGroupMembers(groupId),
    ]);

    setExpenses(expensesData);
    setMembers(membersData as Member[]);
    setLoading(false);
  }

  // Calculate spending by category
  const categorySpending = useMemo(() => {
    const spending: Record<ExpenseCategory, number> = {
      food: 0,
      transport: 0,
      accommodation: 0,
      activities: 0,
      shopping: 0,
      utilities: 0,
      entertainment: 0,
      other: 0,
    };

    expenses.forEach((expense) => {
      spending[expense.category] += Number(expense.amount);
    });

    return spending;
  }, [expenses]);

  // Calculate category budgets with percentages
  const categoryBudgets: CategoryBudget[] = useMemo(() => {
    return Object.entries(categoryLabels).map(([key, { label, icon }]) => {
      const category = key as ExpenseCategory;
      const spent = categorySpending[category];
      const budget = budgets[category];
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;

      return {
        category,
        label,
        icon,
        spent,
        budget,
        percentage,
      };
    });
  }, [categorySpending, budgets]);

  const totalSpent = useMemo(() => {
    return Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
  }, [categorySpending]);

  const totalBudgetFromCategories = useMemo(() => {
    return Object.values(budgets).reduce((sum, val) => sum + val, 0);
  }, [budgets]);

  const overallPercentage = totalBudgetFromCategories > 0
    ? (totalSpent / totalBudgetFromCategories) * 100
    : 0;

  const perPersonSpent = members.length > 0 ? totalSpent / members.length : 0;
  const perPersonBudget = members.length > 0 ? totalBudgetFromCategories / members.length : 0;

  // Smart tips based on spending
  const tips = useMemo(() => {
    const suggestions: string[] = [];

    categoryBudgets.forEach((cat) => {
      if (cat.percentage > 100) {
        suggestions.push(`You've exceeded your ${cat.label.toLowerCase()} budget by $${(cat.spent - cat.budget).toFixed(2)}. Consider adjusting your budget or reducing spending in this category.`);
      } else if (cat.percentage > 80 && cat.percentage <= 100) {
        suggestions.push(`You're at ${cat.percentage.toFixed(0)}% of your ${cat.label.toLowerCase()} budget. You have $${(cat.budget - cat.spent).toFixed(2)} remaining.`);
      }
    });

    if (overallPercentage < 50 && expenses.length > 5) {
      suggestions.push("Great job! You're well under budget. Consider adding to your savings or investing in a special group activity.");
    }

    if (suggestions.length === 0) {
      suggestions.push("Your spending is on track! Keep monitoring to stay within budget.");
    }

    return suggestions;
  }, [categoryBudgets, overallPercentage, expenses.length]);

  function handleEditBudget(category: ExpenseCategory) {
    setEditingBudget(category);
    setTempBudgetValue(budgets[category].toString());
  }

  function saveBudget(category: ExpenseCategory) {
    const value = parseFloat(tempBudgetValue);
    if (!isNaN(value) && value >= 0) {
      setBudgets((prev) => ({
        ...prev,
        [category]: value,
      }));
    }
    setEditingBudget(null);
    setTempBudgetValue("");
  }

  function getProgressColor(percentage: number): string {
    if (percentage > 100) return "bg-red-500";
    if (percentage > 80) return "bg-golden-sun";
    if (percentage > 50) return "bg-soft-lavender";
    return "bg-electric-cyan";
  }

  function getStatusColor(percentage: number): string {
    if (percentage > 100) return "text-red-600";
    if (percentage > 80) return "text-golden-sun-700";
    return "text-green-600";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}/expenses`} title="Budget Calculator" />
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}/expenses`}
        title="Budget Calculator"
      />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Overview Card */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg">Budget Overview</h2>
            <span className={`text-sm font-medium ${getStatusColor(overallPercentage)}`}>
              {overallPercentage.toFixed(0)}% used
            </span>
          </div>

          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-medium">Total Spent</span>
              <span className="font-medium">${totalSpent.toFixed(2)} / ${totalBudgetFromCategories.toFixed(2)}</span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(overallPercentage)} transition-all duration-300`}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Per Person Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-bright-white rounded-xl">
            <div className="text-center">
              <p className="text-sm text-slate-medium">Per Person Spent</p>
              <p className="text-2xl font-bold text-electric-cyan">${perPersonSpent.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-medium">Per Person Budget</p>
              <p className="text-2xl font-bold text-slate-dark">${perPersonBudget.toFixed(2)}</p>
            </div>
          </div>

          {/* Member Count */}
          <p className="text-sm text-slate-medium text-center mt-4">
            Based on {members.length} group member{members.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Smart Tips */}
        {showTips && tips.length > 0 && (
          <div className="card mb-6 bg-gradient-to-r from-electric-cyan/10 to-soft-lavender/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="font-heading font-semibold">Smart Tips</h3>
              </div>
              <button
                onClick={() => setShowTips(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-2">
              {tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-slate-medium flex items-start gap-2">
                  <span className="text-electric-cyan mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category Budgets */}
        <div className="card">
          <h2 className="font-heading font-semibold text-lg mb-4">Category Budgets</h2>
          <p className="text-sm text-slate-medium mb-4">
            Click on any category to adjust its budget
          </p>

          <div className="space-y-4">
            {categoryBudgets.map((cat) => (
              <div key={cat.category} className="p-4 bg-bright-white rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </div>

                  {editingBudget === cat.category ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-medium">$</span>
                      <input
                        type="number"
                        value={tempBudgetValue}
                        onChange={(e) => setTempBudgetValue(e.target.value)}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveBudget(cat.category);
                          if (e.key === "Escape") setEditingBudget(null);
                        }}
                      />
                      <button
                        onClick={() => saveBudget(cat.category)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditBudget(cat.category)}
                      className="flex items-center gap-1 text-sm text-slate-medium hover:text-electric-cyan transition-colors"
                    >
                      <span>${cat.budget.toFixed(0)}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(cat.percentage)} transition-all duration-300`}
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium w-16 text-right ${getStatusColor(cat.percentage)}`}>
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>

                {/* Spent / Remaining */}
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-medium">
                    Spent: <span className="text-slate-dark">${cat.spent.toFixed(2)}</span>
                  </span>
                  <span className="text-slate-medium">
                    {cat.budget >= cat.spent ? (
                      <>Remaining: <span className="text-green-600">${(cat.budget - cat.spent).toFixed(2)}</span></>
                    ) : (
                      <>Over: <span className="text-red-600">${(cat.spent - cat.budget).toFixed(2)}</span></>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/groups/${groupId}/expenses`)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            View Expenses
          </button>
          <button
            onClick={() => {
              setBudgets(defaultBudgets);
            }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Budgets
          </button>
        </div>
      </main>
    </div>
  );
}
