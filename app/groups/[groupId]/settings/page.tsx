"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { updateGroup } from "@/lib/groups";
import { createClient } from "@/lib/supabase";
import { GroupType, Feature, allFeatures } from "@/lib/group-features";
import { ManageInvites } from "@/components/groups/manage-invites";
import { Logo } from "@/components/ui/logo";

const groupTypes: { value: GroupType; label: string }[] = [
  { value: "social", label: "Social" },
  { value: "trip", label: "Trip Planning" },
  { value: "study", label: "Study" },
  { value: "family", label: "Family" },
  { value: "custom", label: "Custom" },
];

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("social");
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    async function loadGroup() {
      const supabase = createClient();

      const { data: group, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !group) {
        router.push("/dashboard");
        return;
      }

      setName(group.name);
      setDescription(group.description || "");
      setGroupType(group.group_type);
      setSelectedFeatures(group.enabled_features || []);
      setLoading(false);
    }

    loadGroup();
  }, [groupId, router]);

  function toggleFeature(feature: Feature) {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("groupType", groupType);
    formData.set("features", JSON.stringify(selectedFeatures));

    const result = await updateGroup(groupId, formData);

    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <p className="text-slate-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href={`/groups/${groupId}`}
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-semibold text-slate-dark mb-2">
            Group Settings
          </h2>
          <p className="text-slate-medium">
            Update your group&apos;s details and features.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">
              Group Name <span className="text-electric-cyan">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="The Brunch Bunch"
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              placeholder="What's this group about?"
            />
          </div>

          <div>
            <label htmlFor="groupType" className="label">
              Group Type
            </label>
            <select
              id="groupType"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as GroupType)}
              className="select"
            >
              {groupTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Features <span className="text-electric-cyan">*</span>
            </label>
            <p className="text-sm text-slate-medium mb-3">
              Select which features are enabled for this group.
            </p>
            <div className="space-y-2">
              {allFeatures.map((feature) => (
                <label
                  key={feature.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedFeatures.includes(feature.value)
                      ? "border-electric-cyan bg-electric-cyan/5"
                      : "border-gray-200 hover:border-electric-cyan/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature.value)}
                    onChange={() => toggleFeature(feature.value)}
                    className="mt-1 w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        selectedFeatures.includes(feature.value)
                          ? "text-electric-cyan"
                          : "text-slate-dark"
                      }`}
                    >
                      {feature.label}
                    </p>
                    <p className="text-sm text-slate-medium">
                      {feature.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {selectedFeatures.length === 0 && (
              <p className="text-sm text-error mt-2">
                Please select at least one feature.
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Link
              href={`/groups/${groupId}`}
              className="btn-outline flex-1 text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || selectedFeatures.length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Manage Invites Section */}
        <div className="mt-8">
          <ManageInvites groupId={groupId} />
        </div>

        {/* Edit Profile Link */}
        <div className="mt-8 p-6 bg-white rounded-2xl shadow-card border border-gray-200">
          <h3 className="font-heading font-semibold text-lg text-slate-dark mb-2">
            Your Profile
          </h3>
          <p className="text-sm text-slate-medium mb-4">
            Update your name, contact info, and what you share with group members.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-electric-cyan hover:text-electric-cyan-600 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Edit Profile
          </Link>
        </div>
      </main>
    </div>
  );
}
