import { getGroupWithContacts } from "@/lib/groups";
import { getUser, signOut } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { QuickInviteButton } from "@/components/groups/quick-invite-button";
import { Logo } from "@/components/ui/logo";
import { ContactIconsCompact } from "@/components/ui/contact-buttons";

const groupTypeLabels: Record<string, string> = {
  social: "Social",
  trip: "Trip Planning",
  study: "Study",
  family: "Family",
  custom: "Custom",
};

const featureLabels: Record<string, { label: string; icon: string; route: string }> = {
  calendar: { label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", route: "calendar" },
  polls: { label: "Polls", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", route: "polls" },
  expenses: { label: "Expenses", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", route: "expenses" },
  photos: { label: "Photos", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", route: "photos" },
  outings: { label: "Outings", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z", route: "outings" },
  ideas: { label: "Ideas", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", route: "ideas" },
  scrapbook: { label: "Scrapbook", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", route: "scrapbook" },
  pool: { label: "Savings Pool", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", route: "pool" },
  notes: { label: "Shared Notes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", route: "notes" },
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const group = await getGroupWithContacts(groupId);

  if (!group) {
    notFound();
  }

  const members = group.group_members || [];
  const enabledFeatures = group.enabled_features || [];

  // Check if current user is owner or admin
  const currentUserMember = members.find(
    (m: { user: { id: string } }) => m.user?.id === user.id
  );
  const isOwner = currentUserMember?.role === "owner";
  const isAdmin = currentUserMember?.role === "admin" || isOwner;

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-slate-medium hover:text-electric-cyan transition-colors mr-4"
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
              <Logo size="md" linkTo="/dashboard" />
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="text-slate-medium hover:text-neon-purple transition-colors font-medium"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Header */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-heading font-semibold text-slate-dark">
                  {group.name}
                </h2>
                <span className="badge-secondary">
                  {groupTypeLabels[group.group_type] || group.group_type}
                </span>
              </div>
              {group.description && (
                <p className="text-slate-medium">{group.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <Link
                  href={`/groups/${groupId}/settings`}
                  className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
                  title="Group Settings"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>
              )}
              <QuickInviteButton
                groupId={groupId}
                groupName={group.name}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-8">
          <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">Features</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enabledFeatures.map((feature: string) => {
              const featureInfo = featureLabels[feature];
              if (!featureInfo) return null;

              return (
                <Link
                  key={feature}
                  href={`/groups/${groupId}/${featureInfo.route}`}
                  className="card-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-electric-cyan/10 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-electric-cyan"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={featureInfo.icon}
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-dark">{featureInfo.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Members */}
        <div>
          <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">
            Members ({members.length})
          </h3>
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {members.map((member: {
                id: string;
                role: string;
                user: {
                  id: string;
                  display_name: string;
                  full_name: string;
                  avatar_url: string;
                  phone_number?: string;
                  whatsapp_number?: string;
                  email?: string;
                  instagram_handle?: string;
                  snapchat_handle?: string;
                };
              }) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
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
                  <ContactIconsCompact
                    contact={{
                      phone: member.user?.phone_number || undefined,
                      whatsapp: member.user?.whatsapp_number || undefined,
                      email: member.user?.email || undefined,
                      instagram: member.user?.instagram_handle || undefined,
                      snapchat: member.user?.snapchat_handle || undefined,
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
