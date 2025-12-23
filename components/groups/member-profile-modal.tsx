"use client";

import { useEffect, useRef } from "react";
import { ContactButtons } from "@/components/ui/contact-buttons";
import { ContactInfo, hasAnyContactInfo } from "@/lib/contact-links";

export interface MemberProfile {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    id: string;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    phone_number?: string | null;
    whatsapp_number?: string | null;
    email?: string | null;
    instagram_handle?: string | null;
    snapchat_handle?: string | null;
    birthday?: string | null;
  };
}

interface MemberProfileModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatBirthday(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  } catch {
    return null;
  }
}

function formatJoinedDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "Unknown";
  }
}

function getRoleStyles(role: string): string {
  switch (role) {
    case "owner":
      return "bg-golden-sun/20 text-golden-sun-700";
    case "admin":
      return "bg-electric-cyan/10 text-electric-cyan-700";
    default:
      return "bg-gray-100 text-slate-medium";
  }
}

export function MemberProfileModal({ member, isOpen, onClose }: MemberProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const displayName = member.user.display_name || member.user.full_name || "Unknown";
  const contact: ContactInfo = {
    phone: member.user.phone_number || undefined,
    whatsapp: member.user.whatsapp_number || undefined,
    email: member.user.email || undefined,
    instagram: member.user.instagram_handle || undefined,
    snapchat: member.user.snapchat_handle || undefined,
  };
  const hasContact = hasAnyContactInfo(contact);
  const birthday = formatBirthday(member.user.birthday);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with close button */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-medium hover:text-slate-dark hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-neon-purple/10 rounded-full flex items-center justify-center mb-4">
              {member.user.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl text-neon-purple font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name */}
            <h2 className="text-xl font-heading font-semibold text-slate-dark mb-1">
              {displayName}
            </h2>

            {/* Role badge */}
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getRoleStyles(member.role)}`}>
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>

            {/* Member since */}
            <p className="text-sm text-slate-medium mt-2">
              Member since {formatJoinedDate(member.joined_at)}
            </p>
          </div>
        </div>

        {/* Contact info section */}
        <div className="px-6 pb-6">
          {hasContact || birthday ? (
            <div className="space-y-4">
              {/* Contact buttons */}
              {hasContact && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-slate-medium mb-3">Contact</h3>
                  <ContactButtons contact={contact} size="md" showLabels className="justify-center" />
                </div>
              )}

              {/* Individual contact details with labels */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                {member.user.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">@</span>
                    <span className="text-slate-dark">{member.user.email}</span>
                  </div>
                )}
                {member.user.phone_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">tel</span>
                    <span className="text-slate-dark">{member.user.phone_number}</span>
                  </div>
                )}
                {member.user.instagram_handle && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">ig</span>
                    <span className="text-slate-dark">@{member.user.instagram_handle}</span>
                  </div>
                )}
                {member.user.snapchat_handle && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">sc</span>
                    <span className="text-slate-dark">@{member.user.snapchat_handle}</span>
                  </div>
                )}
                {birthday && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">bd</span>
                    <span className="text-slate-dark">{birthday}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-center text-sm text-slate-medium py-4">
                No contact information shared
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberProfileModal;
