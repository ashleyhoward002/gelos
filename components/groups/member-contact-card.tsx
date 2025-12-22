"use client";

import { ContactButtons, ContactIconsCompact } from "@/components/ui/contact-buttons";
import { ContactInfo, hasAnyContactInfo } from "@/lib/contact-links";

export interface MemberWithContact {
  id: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  // Contact info (only present if user chose to share)
  phone_number?: string;
  whatsapp_number?: string;
  email?: string;
  instagram_handle?: string;
  snapchat_handle?: string;
}

interface MemberContactCardProps {
  member: MemberWithContact;
  compact?: boolean;
  showRole?: boolean;
  className?: string;
}

function getMemberContact(member: MemberWithContact): ContactInfo {
  return {
    phone: member.phone_number || undefined,
    whatsapp: member.whatsapp_number || undefined,
    email: member.email || undefined,
    instagram: member.instagram_handle || undefined,
    snapchat: member.snapchat_handle || undefined,
  };
}

export function MemberContactCard({
  member,
  compact = false,
  showRole = true,
  className = "",
}: MemberContactCardProps) {
  const contact = getMemberContact(member);
  const hasContact = hasAnyContactInfo(contact);
  const displayName = member.display_name || member.full_name || "Unknown";

  if (compact) {
    return (
      <div className={`flex items-center justify-between py-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-neon-purple font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-dark truncate">{displayName}</p>
            {showRole && member.role && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  member.role === "owner"
                    ? "bg-golden-sun/20 text-golden-sun-700"
                    : member.role === "admin"
                    ? "bg-electric-cyan/10 text-electric-cyan-700"
                    : "bg-gray-100 text-slate-medium"
                }`}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            )}
          </div>
        </div>
        {hasContact && <ContactIconsCompact contact={contact} />}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border border-gray-200 bg-white ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-neon-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl text-neon-purple font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-lg text-slate-dark truncate">{displayName}</h4>
            {showRole && member.role && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  member.role === "owner"
                    ? "bg-golden-sun/20 text-golden-sun-700"
                    : member.role === "admin"
                    ? "bg-electric-cyan/10 text-electric-cyan-700"
                    : "bg-gray-100 text-slate-medium"
                }`}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            )}
          </div>
          {hasContact && (
            <ContactButtons contact={contact} size="md" className="mt-3" />
          )}
          {!hasContact && (
            <p className="text-sm text-slate-medium mt-2">
              No contact info shared
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// List view with all members
interface MemberContactListProps {
  members: MemberWithContact[];
  compact?: boolean;
  showRole?: boolean;
}

export function MemberContactList({
  members,
  compact = true,
  showRole = true,
}: MemberContactListProps) {
  if (compact) {
    return (
      <ul className="divide-y divide-gray-200">
        {members.map((member) => (
          <li key={member.id}>
            <MemberContactCard member={member} compact showRole={showRole} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {members.map((member) => (
        <MemberContactCard key={member.id} member={member} showRole={showRole} />
      ))}
    </div>
  );
}

export default MemberContactCard;
