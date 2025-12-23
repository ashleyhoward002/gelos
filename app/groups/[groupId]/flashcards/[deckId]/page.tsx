"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  FlashcardDeck,
  Flashcard,
  getFlashcardDeck,
  getFlashcards,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from "@/lib/flashcards";
import { motion, AnimatePresence } from "framer-motion";

export default function DeckEditorPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [deckData, cardsData] = await Promise.all([
      getFlashcardDeck(deckId),
      getFlashcards(deckId),
    ]);
    setDeck(deckData);
    setCards(cardsData);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    const result = await deleteFlashcard(cardId, deckId, groupId);
    if (result.success) {
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-medium">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-slate-dark mb-2">Deck not found</h2>
          <Link href={`/groups/${groupId}/flashcards`} className="text-electric-cyan hover:underline">
            Back to Flashcards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href={`/groups/${groupId}/flashcards`}
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
            {cards.length > 0 && (
              <Link
                href={`/groups/${groupId}/flashcards/${deckId}/study`}
                className="btn-primary"
              >
                Study Now
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Deck Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-heading font-semibold text-slate-dark">{deck.title}</h1>
              {deck.subject && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-neon-purple/10 text-neon-purple rounded-full text-sm">
                  {deck.subject}
                </span>
              )}
              {deck.description && (
                <p className="text-slate-medium mt-2">{deck.description}</p>
              )}
            </div>
            <div className="text-right text-sm text-slate-medium">
              <p>{cards.length} cards</p>
            </div>
          </div>
        </div>

        {/* Add Card Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-slate-medium hover:border-electric-cyan hover:text-electric-cyan transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Card
          </button>
        </div>

        {/* Cards List */}
        {cards.length === 0 ? (
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="font-medium text-slate-dark mb-2">No cards yet</h3>
            <p className="text-slate-medium">Add your first flashcard to this deck</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="flex">
                  {/* Front */}
                  <div className="flex-1 p-4 border-r border-gray-200">
                    <div className="text-xs text-slate-light mb-1 uppercase tracking-wide">Front</div>
                    <p className="text-slate-dark whitespace-pre-wrap">{card.front_content}</p>
                  </div>
                  {/* Back */}
                  <div className="flex-1 p-4">
                    <div className="text-xs text-slate-light mb-1 uppercase tracking-wide">Back</div>
                    <p className="text-slate-dark whitespace-pre-wrap">{card.back_content}</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-slate-light">Card #{index + 1}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCard(card)}
                      className="text-xs text-slate-medium hover:text-electric-cyan transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-xs text-slate-medium hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddCard && (
          <CardEditorModal
            deckId={deckId}
            groupId={groupId}
            onClose={() => setShowAddCard(false)}
            onSaved={() => {
              setShowAddCard(false);
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Card Modal */}
      <AnimatePresence>
        {editingCard && (
          <CardEditorModal
            deckId={deckId}
            groupId={groupId}
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSaved={() => {
              setEditingCard(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Card Editor Modal Component
function CardEditorModal({
  deckId,
  groupId,
  card,
  onClose,
  onSaved,
}: {
  deckId: string;
  groupId: string;
  card?: Flashcard;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [frontContent, setFrontContent] = useState(card?.front_content || "");
  const [backContent, setBackContent] = useState(card?.back_content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontContent.trim() || !backContent.trim()) return;

    setIsSubmitting(true);

    if (card) {
      // Update existing card
      const result = await updateFlashcard(card.id, deckId, groupId, {
        front_content: frontContent.trim(),
        back_content: backContent.trim(),
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || "Failed to update card");
      }
    } else {
      // Create new card
      const result = await createFlashcard(deckId, groupId, {
        front_content: frontContent.trim(),
        back_content: backContent.trim(),
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || "Failed to create card");
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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold text-slate-dark">
              {card ? "Edit Card" : "Add Card"}
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
            <label htmlFor="front" className="block text-sm font-medium text-slate-dark mb-1">
              Front (Question) *
            </label>
            <textarea
              id="front"
              value={frontContent}
              onChange={(e) => setFrontContent(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan resize-none"
              placeholder="Enter the question or prompt..."
              required
            />
          </div>

          <div>
            <label htmlFor="back" className="block text-sm font-medium text-slate-dark mb-1">
              Back (Answer) *
            </label>
            <textarea
              id="back"
              value={backContent}
              onChange={(e) => setBackContent(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-cyan/20 focus:border-electric-cyan resize-none"
              placeholder="Enter the answer..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Saving..." : card ? "Save Changes" : "Add Card"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
