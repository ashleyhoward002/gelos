"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import {
  getScrapbookPages,
  createScrapbookPage,
  deleteScrapbookPage,
  ScrapbookPage,
} from "@/lib/scrapbook";

// Background color options
const backgroundColors = [
  { name: "Warm Cream", value: "#FFF8F0" },
  { name: "Soft Pink", value: "#FFF0F5" },
  { name: "Light Lavender", value: "#F0F0FF" },
  { name: "Mint", value: "#F0FFF4" },
  { name: "Peach", value: "#FFEFD5" },
  { name: "Sky Blue", value: "#F0F8FF" },
  { name: "Lemon", value: "#FFFACD" },
  { name: "White", value: "#FFFFFF" },
];

export default function ScrapbookPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [pages, setPages] = useState<ScrapbookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBackgroundColor, setNewBackgroundColor] = useState("#FFF8F0");

  useEffect(() => {
    loadPages();
  }, [groupId]);

  async function loadPages() {
    setLoading(true);
    const data = await getScrapbookPages(groupId);
    setPages(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;

    setCreating(true);
    const result = await createScrapbookPage(
      groupId,
      newTitle.trim(),
      newDescription.trim() || undefined,
      newBackgroundColor
    );

    if (result.success) {
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewBackgroundColor("#FFF8F0");
      loadPages();
    }
    setCreating(false);
  }

  async function handleDelete(pageId: string) {
    setDeleting(true);
    const result = await deleteScrapbookPage(pageId, groupId);
    if (result.success) {
      setDeleteConfirm(null);
      loadPages();
    }
    setDeleting(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/groups/${groupId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-heading font-semibold text-slate-dark">Scrapbook</h1>
              <p className="text-slate-medium">Create memory pages together</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Page
          </button>
        </div>

        {/* Pages Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-vibrant-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-vibrant-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-dark mb-2">No scrapbook pages yet</h3>
            <p className="text-slate-medium mb-6">Create your first memory page to start preserving moments together</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create First Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pages.map((page) => (
              <div key={page.id} className="group relative">
                <Link
                  href={`/groups/${groupId}/scrapbook/${page.id}`}
                  className="block"
                >
                  <div
                    className="aspect-square rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden border-2 border-white hover:border-vibrant-orange/30"
                    style={{ backgroundColor: page.background_color }}
                  >
                    {/* Page preview / thumbnail */}
                    {page.cover_thumbnail_url ? (
                      <img
                        src={page.cover_thumbnail_url}
                        alt={page.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center p-4">
                          <div className="text-4xl mb-2">
                            {page.element_count && page.element_count > 0 ? "📝" : "📄"}
                          </div>
                          <p className="text-slate-medium text-sm">
                            {page.element_count || 0} elements
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Page Info */}
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-dark truncate">{page.title}</h3>
                  <p className="text-sm text-slate-medium">
                    {formatDate(page.created_at)}
                    {page.creator && ` by ${page.creator.display_name || page.creator.full_name}`}
                  </p>
                </div>

                {/* Delete button (on hover) */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteConfirm(page.id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Create New Page Card */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-vibrant-orange transition-colors flex items-center justify-center bg-white/50 hover:bg-vibrant-orange/5"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-vibrant-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-vibrant-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-medium text-vibrant-orange">New Page</p>
              </div>
            </button>
          </div>
        )}
      </main>

      {/* Create Page Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-heading font-semibold text-slate-dark">New Scrapbook Page</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      Page Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Beach Trip 2024"
                      className="input w-full"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      Description
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Our amazing beach vacation..."
                      className="input w-full resize-none"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-2">
                      Background Color
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {backgroundColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setNewBackgroundColor(color.value)}
                          className={`aspect-square rounded-lg border-2 transition-all ${
                            newBackgroundColor === color.value
                              ? "border-vibrant-orange scale-105 shadow-md"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim() || creating}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Page"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-dark mb-2">Delete Page?</h3>
                <p className="text-slate-medium mb-6">
                  This will permanently delete this scrapbook page and all its elements. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn-outline flex-1"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
