"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBringList, BringList } from "@/lib/bring-list";
import { BRING_LIST_TEMPLATES, BringListTemplate } from "@/lib/bring-list-constants";

interface CreateBringListProps {
  eventId?: string;
  outingId?: string;
  groupId: string;
  eventTitle?: string;
  onCreated?: (bringList: BringList) => void;
  onCancel?: () => void;
}

export function CreateBringList({
  eventId,
  outingId,
  groupId,
  eventTitle,
  onCreated,
  onCancel,
}: CreateBringListProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"template" | "details">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<BringListTemplate | null>(null);
  const [title, setTitle] = useState(eventTitle ? `${eventTitle} - What to Bring` : "");
  const [description, setDescription] = useState("");
  const [hostProviding, setHostProviding] = useState("");

  const handleSelectTemplate = (template: BringListTemplate) => {
    setSelectedTemplate(template);
    if (template.hostProviding) {
      setHostProviding(template.hostProviding);
    }
    setStep("details");
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createBringList({
        eventId,
        outingId,
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        hostProviding: hostProviding.trim() || undefined,
        templateId: selectedTemplate?.id,
      });

      if (result.success && result.bringList) {
        onCreated?.(result.bringList);
      }
    });
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === "template" && (
          <motion.div
            key="template"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Template Selection */}
            <div className="text-center mb-6">
              <h3 className="font-heading font-semibold text-lg mb-2">
                Start with a template
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a template or start from scratch
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BRING_LIST_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`
                    p-4 rounded-xl border-2 text-center transition-all
                    hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20
                    ${template.id === "blank" ? "border-dashed border-muted-foreground/30" : "border-border"}
                  `}
                >
                  <span className="text-3xl">{template.icon}</span>
                  <div className="font-medium mt-2 text-sm">{template.name}</div>
                </button>
              ))}
            </div>

            {onCancel && (
              <div className="mt-6 text-center">
                <button
                  onClick={onCancel}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Back button */}
            <button
              onClick={() => setStep("template")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to templates
            </button>

            {/* Selected template preview */}
            {selectedTemplate && selectedTemplate.id !== "blank" && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTemplate.icon}</span>
                  <div>
                    <div className="font-medium">{selectedTemplate.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </div>
                  </div>
                </div>
                {selectedTemplate.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTemplate.categories.map((cat, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs rounded-full bg-white/50 dark:bg-black/20"
                      >
                        {cat.icon} {cat.name} ({cat.items.length})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  List Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="BBQ at Ashley's - What to Bring"
                  className="input w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sign up to bring something!"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What are you providing as host?{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={hostProviding}
                  onChange={(e) => setHostProviding(e.target.value)}
                  placeholder="I'll have burgers, buns, and the grill ready"
                  className="input w-full min-h-[80px] resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isPending}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleCreate}
                disabled={isPending || !title.trim()}
                className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isPending ? "Creating..." : "Create Sign-Up List"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// INLINE TOGGLE FOR EVENT CREATION
// ============================================

interface BringListToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  hostProviding: string;
  onHostProvidingChange: (value: string) => void;
}

export function BringListToggle({
  enabled,
  onChange,
  hostProviding,
  onHostProvidingChange,
}: BringListToggleProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
        />
        <div>
          <span className="font-medium">Add a sign-up list for guests to bring items</span>
          <p className="text-sm text-muted-foreground">
            Let guests sign up to bring food, drinks, or supplies
          </p>
        </div>
      </label>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-8">
              <label className="block text-sm font-medium mb-1.5">
                What are you providing as host?
              </label>
              <input
                type="text"
                value={hostProviding}
                onChange={(e) => onHostProvidingChange(e.target.value)}
                placeholder="I'll have burgers, buns, and the grill ready"
                className="input w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CreateBringList;
