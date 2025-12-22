"use client";

import { useState } from "react";
import Link from "next/link";
import { createGroup } from "@/lib/groups";
import { GroupType, Feature, allFeatures, featuresByType } from "@/lib/group-features";
import { Logo } from "@/components/ui/logo";

const groupTypes: { value: GroupType; label: string; description: string }[] = [
  {
    value: "social",
    label: "Social",
    description: "Friend hangouts, brunch crews, game nights",
  },
  {
    value: "trip",
    label: "Trip Planning",
    description: "Vacations, cruises, destination events",
  },
  {
    value: "study",
    label: "Study",
    description: "Class groups, exam prep, project teams",
  },
  {
    value: "family",
    label: "Family",
    description: "Reunions, holidays, staying connected",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Build your own feature set",
  },
];

export default function NewGroupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<GroupType>("social");
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>(["calendar", "polls"]);

  function handleTypeChange(type: GroupType) {
    setSelectedType(type);
    // Reset custom features when switching to custom
    if (type === "custom") {
      setSelectedFeatures(["calendar", "polls"]);
    }
  }

  function toggleFeature(feature: Feature) {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    formData.set("groupType", selectedType);

    if (selectedType === "custom") {
      formData.set("customFeatures", JSON.stringify(selectedFeatures));
    }

    const result = await createGroup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  // Get features included in the selected preset type
  const presetFeatures = selectedType !== "custom" ? featuresByType[selectedType] : [];

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-semibold text-slate-dark mb-2">
            Create a New Group
          </h2>
          <p className="text-slate-medium">
            Bring your people together. Choose a group type to get started.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-6">
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
              name="name"
              type="text"
              required
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
              name="description"
              rows={3}
              className="input resize-none"
              placeholder="What's this group about?"
            />
          </div>

          <div>
            <label className="label">Group Type</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedType === type.value
                      ? "border-electric-cyan bg-electric-cyan/5"
                      : "border-gray-200 hover:border-electric-cyan/50"
                  }`}
                >
                  <p
                    className={`font-medium ${
                      selectedType === type.value
                        ? "text-electric-cyan"
                        : "text-slate-dark"
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-sm text-slate-medium mt-1">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Show included features for preset types */}
          {selectedType !== "custom" && (
            <div className="p-4 bg-soft-lavender rounded-lg">
              <p className="text-sm font-medium text-slate-dark mb-2">
                Included features:
              </p>
              <div className="flex flex-wrap gap-2">
                {allFeatures
                  .filter((f) => presetFeatures.includes(f.value))
                  .map((feature) => (
                    <span
                      key={feature.value}
                      className="px-3 py-1 bg-white rounded-full text-sm text-slate-medium"
                    >
                      {feature.label}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Feature selector for Custom type */}
          {selectedType === "custom" && (
            <div>
              <label className="label">
                Select Features <span className="text-electric-cyan">*</span>
              </label>
              <p className="text-sm text-slate-medium mb-3">
                Choose which features you want for your group.
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
          )}

          <div className="flex gap-4 pt-4">
            <Link
              href="/dashboard"
              className="btn-outline flex-1 text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || (selectedType === "custom" && selectedFeatures.length === 0)}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
