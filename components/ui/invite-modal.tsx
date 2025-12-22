"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createInvite,
  getOrCreateDefaultInvite,
  GroupInvite,
  CreateInviteOptions,
} from "@/lib/invites";
import { shareContent, copyToClipboard } from "@/lib/native";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

type ExpiryOption = "never" | "7days" | "30days";
type UsesOption = "unlimited" | "1" | "5" | "10";
type RoleOption = "member" | "admin";

export function InviteModal({
  isOpen,
  onClose,
  groupId,
  groupName,
}: InviteModalProps) {
  const [isPending, startTransition] = useTransition();
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings for new invite
  const [expiry, setExpiry] = useState<ExpiryOption>("never");
  const [maxUses, setMaxUses] = useState<UsesOption>("unlimited");
  const [role, setRole] = useState<RoleOption>("member");

  // Email invites
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Load or create default invite when modal opens
  useEffect(() => {
    if (isOpen && groupId) {
      loadDefaultInvite();
    }
  }, [isOpen, groupId]);

  const loadDefaultInvite = async () => {
    startTransition(async () => {
      const result = await getOrCreateDefaultInvite(groupId);
      if (result.error) {
        setError(result.error);
      } else if (result.invite) {
        setInvite(result.invite);
      }
    });
  };

  const getFullInviteUrl = () => {
    if (typeof window === "undefined" || !invite) return "";
    return `${window.location.origin}/invite/${invite.invite_code}`;
  };

  const handleCopy = async () => {
    const url = getFullInviteUrl();
    const result = await copyToClipboard(url);

    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (result.showPrompt) {
      // Last resort: show prompt for manual copy
      window.prompt("Copy this link:", url);
    } else {
      setError("Failed to copy. Try using the Share button instead.");
    }
  };

  const handleShare = async () => {
    const url = getFullInviteUrl();
    const success = await shareContent(
      `Join ${groupName} on Gelos!`,
      `You've been invited to join "${groupName}" on Gelos!`,
      url
    );
    if (!success) {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleCreateCustomInvite = () => {
    startTransition(async () => {
      const options: CreateInviteOptions = {
        role,
        expiresIn: expiry,
        usesRemaining:
          maxUses === "unlimited" ? null : parseInt(maxUses),
      };

      const result = await createInvite(groupId, options);

      if (result.error) {
        setError(result.error);
      } else if (result.invite) {
        setInvite(result.invite);
        setShowSettings(false);
      }
    });
  };

  const handleSendEmailInvites = () => {
    // Parse emails
    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setEmailError("Enter at least one email address");
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));

    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email(s): ${invalidEmails.join(", ")}`);
      return;
    }

    // For now, just open mail client with the invite link
    const url = getFullInviteUrl();
    const subject = encodeURIComponent(`Join ${groupName} on Gelos!`);
    const body = encodeURIComponent(
      `You've been invited to join "${groupName}" on Gelos!\n\nClick here to join: ${url}`
    );
    window.open(`mailto:${emails.join(",")}?subject=${subject}&body=${body}`);

    setEmailInput("");
    setEmailError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-semibold text-lg text-slate-dark">
              Invite to {groupName}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-slate-medium"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-70px)] p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Share Link Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔗</span>
                <h3 className="font-medium text-slate-dark">Share Link</h3>
              </div>

              {invite ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-mono text-sm text-slate-dark truncate">
                      {getFullInviteUrl()}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`
                        px-4 py-3 rounded-xl font-medium text-sm transition-all
                        ${copied
                          ? "bg-green-100 text-green-700"
                          : "bg-electric-cyan text-white hover:bg-electric-cyan-600 active:scale-95"
                        }
                      `}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <button
                    onClick={handleShare}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-soft-lavender text-slate-dark font-medium flex items-center justify-center gap-2 hover:bg-electric-cyan/10 transition-colors active:scale-[0.98]"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    Share via...
                  </button>
                </>
              ) : isPending ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Email Invites Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📧</span>
                <h3 className="font-medium text-slate-dark">Invite by Email</h3>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="Enter email addresses..."
                  className="input w-full"
                />
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
                <button
                  onClick={handleSendEmailInvites}
                  disabled={!emailInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-neon-purple text-white font-medium hover:bg-neon-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Send Invites
                </button>
                <p className="text-xs text-slate-medium">
                  Separate multiple emails with commas
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Link Settings Section */}
            <div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 w-full"
              >
                <span className="text-lg">⚙️</span>
                <h3 className="font-medium text-slate-dark">Link Settings</h3>
                <svg
                  className={`w-5 h-5 ml-auto text-slate-medium transition-transform ${
                    showSettings ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-4">
                      {/* Expiry */}
                      <div>
                        <label className="block text-sm font-medium text-slate-dark mb-2">
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
                              onClick={() =>
                                setExpiry(option.value as ExpiryOption)
                              }
                              className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${expiry === option.value
                                  ? "bg-electric-cyan text-white"
                                  : "bg-gray-100 text-slate-dark hover:bg-gray-200"
                                }
                              `}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Uses */}
                      <div>
                        <label className="block text-sm font-medium text-slate-dark mb-2">
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
                              onClick={() =>
                                setMaxUses(option.value as UsesOption)
                              }
                              className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${maxUses === option.value
                                  ? "bg-electric-cyan text-white"
                                  : "bg-gray-100 text-slate-dark hover:bg-gray-200"
                                }
                              `}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-slate-dark mb-2">
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
                              onClick={() =>
                                setRole(option.value as RoleOption)
                              }
                              className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${role === option.value
                                  ? "bg-electric-cyan text-white"
                                  : "bg-gray-100 text-slate-dark hover:bg-gray-200"
                                }
                              `}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Create New Link Button */}
                      <button
                        onClick={handleCreateCustomInvite}
                        disabled={isPending}
                        className="w-full py-3 px-4 rounded-xl bg-golden-sun text-slate-dark font-medium hover:bg-golden-sun-600 transition-colors disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isPending ? "Creating..." : "Create New Link"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default InviteModal;
