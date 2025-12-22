"use client";

import { useState, useTransition } from "react";
import { getOrCreateDefaultInvite } from "@/lib/invites";
import { shareContent, copyToClipboard } from "@/lib/native";
import { InviteModal } from "@/components/ui/invite-modal";

interface QuickInviteButtonProps {
  groupId: string;
  groupName: string;
  isAdmin?: boolean;
}

export function QuickInviteButton({
  groupId,
  groupName,
  isAdmin = false,
}: QuickInviteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleQuickCopy = () => {
    startTransition(async () => {
      const result = await getOrCreateDefaultInvite(groupId);

      if (result.invite) {
        const url = `${window.location.origin}/invite/${result.invite.invite_code}`;

        // Try to share natively first (opens native share sheet on mobile)
        const shared = await shareContent(
          `Join ${groupName} on Gelos!`,
          `You've been invited to join "${groupName}" on Gelos!`,
          url
        );

        // If native share failed or not available, try clipboard with fallbacks
        if (!shared) {
          const copyResult = await copyToClipboard(url);

          if (copyResult.success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else if (copyResult.showPrompt) {
            // Last resort: show prompt for manual copy
            window.prompt("Copy this link:", url);
          } else {
            // Fallback: open modal
            setShowModal(true);
          }
        }
      }
    });
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  // Only admins and owners can create/manage invites
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleQuickCopy}
        onContextMenu={handleOpenModal}
        disabled={isPending}
        className={`
          btn-secondary text-sm py-2 px-4 whitespace-nowrap
          flex items-center gap-2 transition-all
          ${copied ? "bg-green-100 text-green-700" : ""}
        `}
        title="Click to copy invite link. Right-click for more options."
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </>
        ) : copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Invite
          </>
        )}
      </button>

      <InviteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </>
  );
}

export default QuickInviteButton;
