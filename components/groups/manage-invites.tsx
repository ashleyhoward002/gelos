"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getGroupInvites,
  createInvite,
  deactivateInvite,
  reactivateInvite,
  deleteInvite,
  GroupInvite,
  CreateInviteOptions,
} from "@/lib/invites";
import { copyToClipboard, shareContent } from "@/lib/native";

interface ManageInvitesProps {
  groupId: string;
}

export function ManageInvites({ groupId }: ManageInvitesProps) {
  const [isPending, startTransition] = useTransition();
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showNewInvite, setShowNewInvite] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // New invite form state
  const [newExpiry, setNewExpiry] = useState<"never" | "7days" | "30days">("never");
  const [newMaxUses, setNewMaxUses] = useState<"unlimited" | "1" | "5" | "10">("unlimited");
  const [newRole, setNewRole] = useState<"member" | "admin">("member");

  useEffect(() => {
    loadInvites();
  }, [groupId]);

  const loadInvites = async () => {
    setLoading(true);
    const data = await getGroupInvites(groupId);
    setInvites(data);
    setLoading(false);
  };

  const handleCopyLink = async (invite: GroupInvite) => {
    const url = `${window.location.origin}/invite/${invite.invite_code}`;
    const result = await copyToClipboard(url);

    if (result.success) {
      setCopied(invite.id);
      setTimeout(() => setCopied(null), 2000);
    } else if (result.showPrompt) {
      // Last resort: show prompt for manual copy
      window.prompt("Copy this link:", url);
    }
  };

  const handleShareLink = async (invite: GroupInvite) => {
    const url = `${window.location.origin}/invite/${invite.invite_code}`;
    const success = await shareContent(
      "Join our group on Gelos!",
      "You've been invited to join our group on Gelos!",
      url
    );

    // If native share wasn't available or failed, fall back to copy
    if (!success) {
      handleCopyLink(invite);
    }
  };

  const handleCreateInvite = () => {
    startTransition(async () => {
      const options: CreateInviteOptions = {
        role: newRole,
        expiresIn: newExpiry,
        usesRemaining: newMaxUses === "unlimited" ? null : parseInt(newMaxUses),
      };

      const result = await createInvite(groupId, options);
      if (result.invite) {
        await loadInvites();
        setShowNewInvite(false);
        // Reset form
        setNewExpiry("never");
        setNewMaxUses("unlimited");
        setNewRole("member");
      }
    });
  };

  const handleDeactivate = (inviteId: string) => {
    startTransition(async () => {
      await deactivateInvite(inviteId);
      await loadInvites();
    });
  };

  const handleReactivate = (inviteId: string) => {
    startTransition(async () => {
      await reactivateInvite(inviteId);
      await loadInvites();
    });
  };

  const handleDelete = (inviteId: string) => {
    startTransition(async () => {
      await deleteInvite(inviteId);
      setDeleteConfirm(null);
      await loadInvites();
    });
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Never";
    const date = new Date(expiresAt);
    if (date < new Date()) return "Expired";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-lg text-slate-dark">Invite Links</h3>
          <p className="text-sm text-slate-medium">
            Manage invite links for this group
          </p>
        </div>
        <button
          onClick={() => setShowNewInvite(true)}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invite
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && invites.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔗</div>
          <p className="text-slate-medium">No invite links yet</p>
          <p className="text-sm text-slate-medium">
            Create an invite link to share with friends
          </p>
        </div>
      )}

      {/* Invites list */}
      {!loading && invites.length > 0 && (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className={`p-4 rounded-xl border ${
                invite.is_active
                  ? "border-electric-cyan/30 bg-electric-cyan/5"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-medium text-electric-cyan-700">
                      {invite.invite_code}
                    </span>
                    {!invite.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-slate-medium">
                        Inactive
                      </span>
                    )}
                    {invite.role === "admin" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-golden-sun/20 text-golden-sun-700">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-medium">
                    Created by {invite.inviter?.display_name || invite.inviter?.full_name || "Unknown"}{" "}
                    • {invite.use_count || 0} use{(invite.use_count || 0) !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-slate-light mt-1">
                    Expires: {formatExpiry(invite.expires_at)}
                    {invite.uses_remaining !== null && (
                      <> • {invite.uses_remaining} uses remaining</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {invite.is_active && (
                    <>
                      {/* Share button - primary on mobile */}
                      <button
                        onClick={() => handleShareLink(invite)}
                        className="p-2 rounded-lg hover:bg-electric-cyan/10 text-electric-cyan transition-colors"
                        title="Share link"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </button>
                      {/* Copy button */}
                      <button
                        onClick={() => handleCopyLink(invite)}
                        className={`p-2 rounded-lg transition-colors ${
                          copied === invite.id
                            ? "bg-electric-cyan/20 text-electric-cyan"
                            : "hover:bg-gray-100 text-slate-medium"
                        }`}
                        title="Copy link"
                      >
                        {copied === invite.id ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                  {invite.is_active ? (
                    <button
                      onClick={() => handleDeactivate(invite.id)}
                      disabled={isPending}
                      className="p-2 rounded-lg hover:bg-gray-100 text-slate-medium transition-colors"
                      title="Deactivate"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(invite.id)}
                      disabled={isPending}
                      className="p-2 rounded-lg hover:bg-cosmic-green/20 text-slate-medium transition-colors"
                      title="Reactivate"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(invite.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg hover:bg-error/20 text-slate-medium hover:text-error transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Delete confirmation */}
              <AnimatePresence>
                {deleteConfirm === invite.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-sm text-slate-dark">Delete this invite link?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 text-slate-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(invite.id)}
                          disabled={isPending}
                          className="px-3 py-1 text-sm rounded-lg bg-error text-white hover:bg-error/90"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* New Invite Form Modal */}
      <AnimatePresence>
        {showNewInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewInvite(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white border border-gray-200 rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
            >
              <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">
                Create New Invite
              </h3>

              <div className="space-y-4">
                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-slate-medium mb-2">
                    Expires
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "never", label: "Never" },
                      { value: "7days", label: "7 days" },
                      { value: "30days", label: "30 days" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewExpiry(option.value as typeof newExpiry)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newExpiry === option.value
                            ? "bg-electric-cyan text-white"
                            : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Uses */}
                <div>
                  <label className="block text-sm font-medium text-slate-medium mb-2">
                    Max uses
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "unlimited", label: "Unlimited" },
                      { value: "1", label: "1" },
                      { value: "5", label: "5" },
                      { value: "10", label: "10" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewMaxUses(option.value as typeof newMaxUses)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newMaxUses === option.value
                            ? "bg-electric-cyan text-white"
                            : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-medium mb-2">
                    Role when joining
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "member", label: "Member" },
                      { value: "admin", label: "Admin" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewRole(option.value as typeof newRole)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newRole === option.value
                            ? "bg-electric-cyan text-white"
                            : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewInvite(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvite}
                  disabled={isPending}
                  className="flex-1 btn-primary"
                >
                  {isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ManageInvites;
