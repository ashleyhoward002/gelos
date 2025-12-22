import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserGroups } from "@/lib/groups";
import Link from "next/link";
import Header from "@/components/Header";

const groupTypeLabels: Record<string, string> = {
  social: "Social",
  trip: "Trip Planning",
  study: "Study",
  family: "Family",
  custom: "Custom",
};

const groupTypeColors: Record<string, string> = {
  social: "bg-electric-cyan/10 text-electric-cyan-700",
  trip: "bg-vibrant-orange/10 text-vibrant-orange-700",
  study: "bg-cosmic-green/10 text-cosmic-green-700",
  family: "bg-neon-purple/10 text-neon-purple-700",
  custom: "bg-golden-sun/10 text-golden-sun-700",
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const groups = await getUserGroups();

  return (
    <div className="min-h-screen bg-bright-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-semibold text-slate-dark mb-2">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}!
          </h2>
          <p className="text-slate-medium">
            {groups.length > 0
              ? "Here's what's happening with your groups."
              : "Create your first group to get started."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Existing Groups */}
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="card-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-neon-purple/10 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-heading font-bold text-neon-purple">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${groupTypeColors[group.group_type] || groupTypeColors.custom}`}>
                  {groupTypeLabels[group.group_type] || group.group_type}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-dark mb-1">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-sm text-slate-medium line-clamp-2">
                  {group.description}
                </p>
              )}
            </Link>
          ))}

          {/* Create New Group Card */}
          <Link
            href="/groups/new"
            className="bg-white rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-electric-cyan transition-all cursor-pointer flex items-center justify-center min-h-[200px] hover:shadow-card-hover"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-electric-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="font-medium text-electric-cyan">Create New Group</p>
              <p className="text-sm text-slate-medium mt-1">
                Start planning together
              </p>
            </div>
          </Link>
        </div>

        {groups.length === 0 && (
          <div className="mt-12 p-6 bg-soft-lavender rounded-xl border border-gray-200">
            <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">
              Getting Started
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 bg-cosmic-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </span>
                <span className="text-slate-dark">Create your account</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 bg-gray-200 text-slate-medium rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </span>
                <span className="text-slate-medium">Create or join a group</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 bg-gray-200 text-slate-medium rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </span>
                <span className="text-slate-medium">Invite your people</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 bg-gray-200 text-slate-medium rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </span>
                <span className="text-slate-medium">Start planning and making memories!</span>
              </li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
