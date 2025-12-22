"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getExpense,
  updateExpense,
  settleSplit,
  unsettleSplit,
  sendReminder,
  deleteExpense,
  uploadReceipt,
  deleteReceipt,
  Expense,
} from "@/lib/expenses";
import { categoryLabels, splitTypeLabels, ExpenseCategory } from "@/lib/expense-constants";
import Header from "@/components/Header";

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const expenseId = params.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderToUserId, setReminderToUserId] = useState("");
  const [reminderToUserName, setReminderToUserName] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("other");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Receipt
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [expenseId]);

  async function loadData() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const expenseData = await getExpense(expenseId);
    setExpense(expenseData);
    setLoading(false);
  }

  async function handleSettle(splitId: string) {
    const result = await settleSplit(splitId, groupId);
    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }
  }

  async function handleUnsettle(splitId: string) {
    const result = await unsettleSplit(splitId, groupId);
    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }
  }

  function openReminderModal(userId: string, userName: string) {
    setReminderToUserId(userId);
    setReminderToUserName(userName);
    setReminderMessage("");
    setShowReminderModal(true);
  }

  async function handleSendReminder() {
    if (!reminderToUserId) return;

    setSendingReminder(true);

    const result = await sendReminder(expenseId, reminderToUserId, groupId, reminderMessage);
    if (result.error) {
      alert(result.error);
    } else {
      setShowReminderModal(false);
      setReminderToUserId("");
      setReminderToUserName("");
      setReminderMessage("");
    }

    setSendingReminder(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this expense? This cannot be undone.")) return;

    const result = await deleteExpense(expenseId, groupId);
    if (result.error) {
      alert(result.error);
    } else {
      router.push(`/groups/${groupId}/expenses`);
    }
  }

  function openEditModal() {
    if (!expense) return;
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDate(expense.expense_date);
    setEditNotes(expense.notes || "");
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!expense) return;

    setSavingEdit(true);

    const result = await updateExpense(expenseId, groupId, {
      description: editDescription,
      amount: parseFloat(editAmount),
      category: editCategory,
      expense_date: editDate,
      notes: editNotes,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowEditModal(false);
      loadData();
    }

    setSavingEdit(false);
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadReceipt(expenseId, groupId, formData);

    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }

    setUploadingReceipt(false);
    // Reset input
    if (receiptInputRef.current) {
      receiptInputRef.current.value = "";
    }
  }

  async function handleDeleteReceipt() {
    if (!confirm("Are you sure you want to remove this receipt?")) return;

    const result = await deleteReceipt(expenseId, groupId);

    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }
  }

  function isImageReceipt(url: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  function getMemberName(user: { display_name: string | null; full_name: string | null } | null | undefined): string {
    return user?.display_name || user?.full_name || "Unknown";
  }

  function getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}/expenses`} title="Expense" />
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}/expenses`} title="Expense" />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-medium">Expense not found.</p>
        </div>
      </div>
    );
  }

  const category = categoryLabels[expense.category];
  const splitType = splitTypeLabels[expense.split_type];
  const isCreator = expense.created_by === currentUserId;
  const isPayer = expense.paid_by === currentUserId;

  const settledCount = expense.splits?.filter((s) => s.is_settled).length || 0;
  const totalSplits = expense.splits?.length || 0;
  const allSettled = settledCount === totalSplits;

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}/expenses`}
        title="Expense Details"
      />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Expense Header */}
        <div className="card mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-soft-lavender/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">{category.icon}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-heading font-bold text-2xl text-slate-dark mb-1">
                    {expense.description}
                  </h1>
                  <p className="text-slate-medium">
                    {category.label} • {new Date(expense.expense_date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {isCreator && (
                  <button
                    onClick={openEditModal}
                    className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
                    title="Edit expense"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-medium">Total Amount</p>
                <p className="text-3xl font-bold text-slate-dark">
                  ${Number(expense.amount).toFixed(2)}
                  <span className="text-lg font-normal text-slate-medium ml-1">{expense.currency}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-medium">Paid by</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-electric-cyan/20 flex items-center justify-center">
                    {expense.payer?.avatar_url ? (
                      <img
                        src={expense.payer.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-electric-cyan">
                        {getInitial(getMemberName(expense.payer))}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">
                    {getMemberName(expense.payer)}
                    {isPayer && " (You)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Split Info */}
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-medium">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {splitType.label}
            </span>
            <span className={`flex items-center gap-1 ${allSettled ? "text-green-600" : "text-golden-sun-700"}`}>
              {allSettled ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All Settled
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {settledCount}/{totalSplits} Settled
                </>
              )}
            </span>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="mt-4 p-3 bg-bright-white rounded-lg">
              <p className="text-sm text-slate-medium">{expense.notes}</p>
            </div>
          )}
        </div>

        {/* Splits */}
        <div className="card mb-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Split Details</h2>

          <div className="space-y-3">
            {expense.splits?.map((split) => {
              const isCurrentUser = split.user_id === currentUserId;
              const isSplitPayer = split.user_id === expense.paid_by;
              const userName = split.user
                ? getMemberName(split.user)
                : split.guest?.name || "Unknown";
              const userInitial = getInitial(userName);

              return (
                <div
                  key={split.id}
                  className={`p-4 rounded-xl flex items-center justify-between ${
                    split.is_settled
                      ? "bg-green-50"
                      : isCurrentUser && !isSplitPayer
                      ? "bg-red-50"
                      : "bg-bright-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      {split.user?.avatar_url ? (
                        <img
                          src={split.user.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-medium text-slate-dark">{userInitial}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {userName}
                        {isCurrentUser && " (You)"}
                        {split.guest && <span className="text-xs text-slate-medium ml-1">(Guest)</span>}
                      </p>
                      <p className="text-sm text-slate-medium">
                        {split.is_settled ? (
                          <span className="text-green-600">Settled</span>
                        ) : isSplitPayer ? (
                          <span className="text-slate-medium">Paid</span>
                        ) : (
                          <span className="text-red-600">Owes</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        split.is_settled ? "text-green-600" : isSplitPayer ? "text-slate-dark" : "text-red-600"
                      }`}>
                        ${Number(split.amount).toFixed(2)}
                      </p>
                      {split.percentage && (
                        <p className="text-xs text-slate-medium">{split.percentage}%</p>
                      )}
                    </div>

                    {/* Actions - Show for non-payers (both users and guests) */}
                    {!isSplitPayer && (
                      <div className="flex items-center gap-2">
                        {/* Reminder button - only for users, not guests */}
                        {isPayer && !split.is_settled && split.user_id && (
                          <button
                            onClick={() => openReminderModal(split.user_id!, userName)}
                            className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
                            title="Send Reminder"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </button>
                        )}

                        {/* Mark Paid/Unpaid - for payer (all splits) or current user (own split) */}
                        {(isPayer || isCurrentUser) && (
                          split.is_settled ? (
                            <button
                              onClick={() => handleUnsettle(split.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Mark as Unpaid"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Undo</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSettle(split.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              title="Mark as Paid"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Mark Paid</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt Section */}
        <div className="card mb-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Receipt</h2>

          {/* Hidden file input */}
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleReceiptUpload}
            className="hidden"
          />

          {expense.receipt_url ? (
            <div className="space-y-4">
              {/* Receipt Preview */}
              {isImageReceipt(expense.receipt_url) ? (
                <div
                  className="relative w-full max-w-xs cursor-pointer"
                  onClick={() => setShowReceiptModal(true)}
                >
                  <img
                    src={expense.receipt_url}
                    alt="Receipt"
                    className="w-full rounded-xl border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors rounded-xl">
                    <span className="opacity-0 hover:opacity-100 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                      View Full Size
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-bright-white rounded-xl">
                  <div className="w-12 h-12 bg-electric-cyan/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">PDF Receipt</p>
                    <p className="text-sm text-slate-medium">Click to view or download</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-bright-white hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </a>
                <a
                  href={expense.receipt_url}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-bright-white hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                {isCreator && (
                  <>
                    <button
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={uploadingReceipt}
                      className="flex items-center gap-2 px-4 py-2 bg-bright-white hover:bg-gray-200 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Replace
                    </button>
                    <button
                      onClick={handleDeleteReceipt}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              {isCreator ? (
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="w-full p-6 border-2 border-dashed border-electric-cyan/30 rounded-xl hover:border-electric-cyan/50 transition-colors disabled:opacity-50"
                >
                  {uploadingReceipt ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
                      <p className="text-slate-medium">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-electric-cyan/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p className="font-medium text-slate-dark">Upload Receipt</p>
                      <p className="text-sm text-slate-medium">JPG, PNG, WebP, or PDF (max 10MB)</p>
                    </div>
                  )}
                </button>
              ) : (
                <p className="text-slate-medium text-center py-4">No receipt uploaded</p>
              )}
            </div>
          )}
        </div>

        {/* Delete Button */}
        {isCreator && (
          <button
            onClick={handleDelete}
            className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Expense
          </button>
        )}
      </main>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowReminderModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading font-bold text-xl mb-4">Send Reminder</h2>

            <p className="text-slate-medium mb-4">
              Send a reminder to <span className="font-medium text-slate-dark">{reminderToUserName}</span> about this expense.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Message (optional)
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
                className="input w-full resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReminderModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {sendingReminder ? "Sending..." : "Send Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading font-bold text-xl mb-4">Edit Expense</h2>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="What was this expense for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    min="0.01"
                    step="0.01"
                    className="input w-full pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                  className="input w-full"
                >
                  {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="Add any notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && expense?.receipt_url && isImageReceipt(expense.receipt_url) && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowReceiptModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-electric-cyan transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={expense.receipt_url}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </a>
              <a
                href={expense.receipt_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
