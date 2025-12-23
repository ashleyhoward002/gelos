"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  SharedNote,
  getSharedNotes,
  createSharedNote,
  updateSharedNote,
  deleteSharedNote,
  togglePinNote,
} from "@/lib/notes";
import { motion, AnimatePresence } from "framer-motion";

export default function NotesPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<SharedNote | null>(null);
  const [viewingNote, setViewingNote] = useState<SharedNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const data = await getSharedNotes(groupId);
    setNotes(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    const result = await deleteSharedNote(noteId, groupId);
    if (result.success) {
      loadNotes();
    }
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    const result = await togglePinNote(noteId, groupId, !currentPinned);
    if (result.success) {
      loadNotes();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <h1 className="text-2xl font-heading font-semibold text-slate-dark">Shared Notes</h1>
            <p className="text-slate-medium">Collaborate on notes with your group</p>
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
            New Note
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
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
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
            />
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-medium">Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
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
            <h3 className="font-medium text-slate-dark mb-2">
              {searchQuery ? "No notes found" : "No notes yet"}
            </h3>
            <p className="text-slate-medium mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Create a note to share with your group"}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Create First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => setViewingNote(note)}
                      className="text-left flex-1"
                    >
                      <h3 className="font-medium text-slate-dark hover:text-electric-cyan transition-colors line-clamp-1">
                        {note.title}
                      </h3>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      {note.is_pinned && (
                        <span className="text-golden-sun">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </span>
                      )}
                      <button
                        onClick={() => handleTogglePin(note.id, note.is_pinned)}
                        className="p-1 text-slate-light hover:text-golden-sun transition-colors"
                        title={note.is_pinned ? "Unpin" : "Pin"}
                      >
                        <svg
                          className="w-4 h-4"
                          fill={note.is_pinned ? "currentColor" : "none"}
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
                        onClick={() => setEditingNote(note)}
                        className="p-1 text-slate-light hover:text-electric-cyan transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
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

                  {note.content && (
                    <p className="text-sm text-slate-medium line-clamp-3 mb-3">
                      {note.content}
                    </p>
                  )}

                  <div className="text-xs text-slate-light flex items-center justify-between pt-3 border-t border-gray-100">
                    <span>
                      {note.creator?.display_name || note.creator?.full_name || "Unknown"}
                    </span>
                    <span>{formatDate(note.updated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Note Modal */}
      <AnimatePresence>
        {(showCreateModal || editingNote) && (
          <NoteEditorModal
            groupId={groupId}
            note={editingNote}
            onClose={() => {
              setShowCreateModal(false);
              setEditingNote(null);
            }}
            onSaved={() => {
              setShowCreateModal(false);
              setEditingNote(null);
              loadNotes();
            }}
          />
        )}
      </AnimatePresence>

      {/* View Note Modal */}
      <AnimatePresence>
        {viewingNote && (
          <ViewNoteModal
            note={viewingNote}
            onClose={() => setViewingNote(null)}
            onEdit={() => {
              setEditingNote(viewingNote);
              setViewingNote(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Note Editor Modal
function NoteEditorModal({
  groupId,
  note,
  onClose,
  onSaved,
}: {
  groupId: string;
  note: SharedNote | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    if (note) {
      const result = await updateSharedNote(note.id, groupId, {
        title: title.trim(),
        content: content.trim() || undefined,
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || "Failed to update note");
      }
    } else {
      const result = await createSharedNote(groupId, {
        title: title.trim(),
        content: content.trim() || undefined,
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || "Failed to create note");
      }
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
            <h2 className="text-xl font-heading font-semibold text-slate-dark">
              {note ? "Edit Note" : "New Note"}
            </h2>
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
              placeholder="Note title"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-dark mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan resize-none font-mono text-sm"
              placeholder="Write your note here..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Saving..." : note ? "Save Changes" : "Create Note"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// View Note Modal
function ViewNoteModal({
  note,
  onClose,
  onEdit,
}: {
  note: SharedNote;
  onClose: () => void;
  onEdit: () => void;
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
            <h2 className="text-xl font-heading font-semibold text-slate-dark pr-4">
              {note.title}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="p-2 text-slate-medium hover:text-electric-cyan rounded-lg hover:bg-gray-100"
                title="Edit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {note.content ? (
            <div className="prose prose-slate max-w-none whitespace-pre-wrap">
              {note.content}
            </div>
          ) : (
            <p className="text-slate-medium italic">No content</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-slate-medium">
          Last updated by {note.creator?.display_name || note.creator?.full_name || "Unknown"} on{" "}
          {new Date(note.updated_at).toLocaleDateString()}
        </div>
      </motion.div>
    </motion.div>
  );
}
