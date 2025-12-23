"use client";

import { useState } from "react";
import { ContactIconsCompact } from "@/components/ui/contact-buttons";
import { MemberProfileModal, MemberProfile } from "./member-profile-modal";

interface MembersSectionProps {
  members: MemberProfile[];
}

export function MembersSection({ members }: MembersSectionProps) {
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  return (
    <>
      <div>
        <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">
          Members ({members.length})
        </h3>
        <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-neon-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
                    {member.user?.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-neon-purple font-medium">
                        {(
                          member.user?.display_name ||
                          member.user?.full_name ||
                          "?"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-slate-dark block truncate">
                      {member.user?.display_name || member.user?.full_name || "Unknown"}
                    </span>
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
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ContactIconsCompact
                    contact={{
                      phone: member.user?.phone_number || undefined,
                      whatsapp: member.user?.whatsapp_number || undefined,
                      email: member.user?.email || undefined,
                      instagram: member.user?.instagram_handle || undefined,
                      snapchat: member.user?.snapchat_handle || undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <MemberProfileModal
        member={selectedMember}
        isOpen={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />
    </>
  );
}

export default MembersSection;
