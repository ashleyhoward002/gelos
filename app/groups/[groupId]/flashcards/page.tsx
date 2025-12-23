"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  FlashcardDeck,
  getFlashcardDecks,
  createFlashcardDeck,
  deleteFlashcardDeck,
} from "@/lib/flashcards";
import { motion, AnimatePresence } from "framer-motion";

export default function FlashcardsPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadDecks = useCallback(async () => {
    setLoading(true);
    const data = await getFlashcardDecks(groupId);
    setDecks(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleDelete = async (deckId: string) => {
    if (!confirm("Are you sure you want to delete this deck and all its cards?")) return;
    const result = await deleteFlashcardDeck(deckId, groupId);
    if (result.success) {
      loadDecks();
    }
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
            <h1 className="text-2xl font-heading font-semibold text-slate-dark">Flashcards</h1>
            <p className="text-slate-medium">Create and study flashcard decks</p>
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
            Create Deck
          </button>
        </div>

        {/* Decks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-medium">Loading decks...</p>
          </div>
        ) : decks.length === 0 ? (
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
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <h3 className="font-medium text-slate-dark mb-2">No flashcard decks yet</h3>
            <p className="text-slate-medium mb-4">Create your first deck to start studying</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create First Deck
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                groupId={groupId}
                onDelete={() => handleDelete(deck.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDeckModal
            groupId={groupId}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              loadDecks();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Deck Card Component
function DeckCard({
  deck,
  groupId,
  onDelete,
}: {
  deck: FlashcardDeck;
  groupId: string;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-slate-dark text-lg">{deck.title}</h3>
            {deck.subject && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-neon-purple/10 text-neon-purple rounded-full text-xs">
                {deck.subject}
              </span>
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-1 text-slate-light hover:text-red-500 transition-colors"
            title="Delete deck"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {deck.description && (
          <p className="text-sm text-slate-medium line-clamp-2 mb-4">{deck.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-medium mb-4">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>{deck.card_count} cards</span>
          </div>
          {deck.due_count !== undefined && deck.due_count > 0 && (
            <div className="flex items-center gap-1 text-electric-cyan">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{deck.due_count} due</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/groups/${groupId}/flashcards/${deck.id}`}
            className="flex-1 btn-outline text-sm py-2 text-center"
          >
            Edit Cards
          </Link>
          {deck.card_count > 0 && (
            <Link
              href={`/groups/${groupId}/flashcards/${deck.id}/study`}
              className="flex-1 btn-primary text-sm py-2 text-center"
            >
              Study
            </Link>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-slate-light">
        Created by {deck.creator?.display_name || deck.creator?.full_name || "Unknown"}
      </div>
    </div>
  );
}

// Create Deck Modal Component
function CreateDeckModal({
  groupId,
  onClose,
  onCreated,
}: {
  groupId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const result = await createFlashcardDeck(groupId, {
      title: title.trim(),
      description: description.trim() || undefined,
      subject: subject.trim() || undefined,
    });

    if (result.success) {
      onCreated();
    } else {
      alert(result.error || "Failed to create deck");
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
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold text-slate-dark">Create Deck</h2>
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
              placeholder="e.g., Biology Chapter 5"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-dark mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan resize-none"
              placeholder="What's this deck about?"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-dark mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan"
              placeholder="e.g., Biology, Math, History"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Creating..." : "Create Deck"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
