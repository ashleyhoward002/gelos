"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  StudyResource,
  getStudyResources,
  createStudyResource,
  deleteStudyResource,
  togglePinResource,
  getSubjects,
} from "@/lib/study-resources";
import { motion, AnimatePresence } from "framer-motion";

type ResourceType = "note" | "link" | "file" | "all";

export default function ResourcesPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [resources, setResources] = useState<StudyResource[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);
  const [filterType, setFilterType] = useState<ResourceType>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadResources = useCallback(async () => {
    setLoading(true);
    const [resourcesData, subjectsData] = await Promise.all([
      getStudyResources(groupId),
      getSubjects(groupId),
    ]);
    setResources(resourcesData);
    setSubjects(subjectsData);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filteredResources = resources.filter((resource) => {
    const matchesType = filterType === "all" || resource.resource_type === filterType;
    const matchesSubject = filterSubject === "all" || resource.subject === filterSubject;
    const matchesSearch =
      searchQuery === "" ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSubject && matchesSearch;
  });

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    const result = await deleteStudyResource(resourceId, groupId);
    if (result.success) {
      loadResources();
    }
  };

  const handleTogglePin = async (resourceId: string, currentPinned: boolean) => {
    const result = await togglePinResource(resourceId, groupId, !currentPinned);
    if (result.success) {
      loadResources();
    }
  };

  const handleViewResource = (resource: StudyResource) => {
    if (resource.resource_type === "link" && resource.url) {
      window.open(resource.url, "_blank");
    } else if (resource.resource_type === "file" && resource.file_url) {
      window.open(resource.file_url, "_blank");
    } else {
      setSelectedResource(resource);
      setShowViewModal(true);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "note":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "link":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        );
      case "file":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href={`/groups/${groupId}`}
                className="text-slate-medium hover:text-electric-cyan transition-colors mr-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark">Resources</h1>
            <p className="text-slate-medium">Share notes, links, and study materials</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Resource
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-medium"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
                />
              </div>
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ResourceType)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
            >
              <option value="all">All Types</option>
              <option value="note">Notes</option>
              <option value="link">Links</option>
              <option value="file">Files</option>
            </select>

            {/* Subject filter */}
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resources List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-medium">Loading resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg
              className="w-12 h-12 text-slate-light mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="font-medium text-slate-dark mb-2">No resources yet</h3>
            <p className="text-slate-medium mb-4">Add notes, links, or files to share with your group</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Add First Resource
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${
                      resource.resource_type === "note"
                        ? "bg-neon-purple/10 text-neon-purple"
                        : resource.resource_type === "link"
                        ? "bg-electric-cyan/10 text-electric-cyan"
                        : "bg-cosmic-green/10 text-cosmic-green"
                    }`}
                  >
                    {getTypeIcon(resource.resource_type)}
                  </div>
                  <div className="flex items-center gap-1">
                    {resource.is_pinned && (
                      <span className="text-golden-sun">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                          <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
                        </svg>
                      </span>
                    )}
                    <button
                      onClick={() => handleTogglePin(resource.id, resource.is_pinned)}
                      className="p-1 text-slate-light hover:text-golden-sun transition-colors"
                      title={resource.is_pinned ? "Unpin" : "Pin"}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={resource.is_pinned ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-1 text-slate-light hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleViewResource(resource)}
                  className="text-left w-full"
                >
                  <h3 className="font-medium text-slate-dark mb-1 hover:text-electric-cyan transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-slate-medium line-clamp-2 mb-2">
                      {resource.description}
                    </p>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-light mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {resource.subject && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                        {resource.subject}
                      </span>
                    )}
                    {resource.resource_type === "file" && resource.file_size && (
                      <span>{formatFileSize(resource.file_size)}</span>
                    )}
                  </div>
                  <span>
                    by {resource.uploader?.display_name || resource.uploader?.full_name || "Unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Resource Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateResourceModal
            groupId={groupId}
            subjects={subjects}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              loadResources();
            }}
          />
        )}
      </AnimatePresence>

      {/* View Note Modal */}
      <AnimatePresence>
        {showViewModal && selectedResource && (
          <ViewNoteModal
            resource={selectedResource}
            onClose={() => {
              setShowViewModal(false);
              setSelectedResource(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Create Resource Modal Component
function CreateResourceModal({
  groupId,
  subjects,
  onClose,
  onCreated,
}: {
  groupId: string;
  subjects: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [resourceType, setResourceType] = useState<"note" | "link" | "file">("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const result = await createStudyResource(groupId, {
      title: title.trim(),
      description: description.trim() || undefined,
      resource_type: resourceType,
      content: resourceType === "note" ? content : undefined,
      url: resourceType === "link" ? url : undefined,
      subject: newSubject.trim() || subject || undefined,
    });

    if (result.success) {
      onCreated();
    } else {
      alert(result.error || "Failed to create resource");
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold text-slate-dark">Add Resource</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-medium hover:text-slate-dark rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resource Type */}
          <div>
            <label className="block text-sm font-medium text-slate-dark mb-2">Type</label>
            <div className="flex gap-2">
              {[
                { value: "note", label: "Note", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                { value: "link", label: "Link", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setResourceType(type.value as "note" | "link")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 transition-colors ${
                    resourceType === type.value
                      ? "border-electric-cyan bg-electric-cyan/10 text-electric-cyan"
                      : "border-gray-200 text-slate-medium hover:border-gray-300"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                  </svg>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-dark mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
              placeholder="Enter title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-dark mb-1">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
              placeholder="Brief description"
            />
          </div>

          {/* Content based on type */}
          {resourceType === "note" && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-dark mb-1">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan resize-none"
                placeholder="Write your notes here..."
              />
            </div>
          )}

          {resourceType === "link" && (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-slate-dark mb-1">
                URL *
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
                placeholder="https://..."
                required={resourceType === "link"}
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1">Subject</label>
            <div className="flex gap-2">
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setNewSubject("");
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="py-2 text-slate-light">or</span>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => {
                  setNewSubject(e.target.value);
                  setSubject("");
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
                placeholder="New subject"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Adding..." : "Add Resource"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// View Note Modal Component
function ViewNoteModal({
  resource,
  onClose,
}: {
  resource: StudyResource;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-heading font-semibold text-slate-dark">{resource.title}</h2>
              {resource.subject && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-slate-medium">
                  {resource.subject}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-medium hover:text-slate-dark rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {resource.description && (
            <p className="text-slate-medium mb-4 italic">{resource.description}</p>
          )}
          {resource.content && (
            <div className="prose prose-slate max-w-none whitespace-pre-wrap">
              {resource.content}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-slate-medium">
          Added by {resource.uploader?.display_name || resource.uploader?.full_name || "Unknown"} on{" "}
          {new Date(resource.created_at).toLocaleDateString()}
        </div>
      </motion.div>
    </motion.div>
  );
}
