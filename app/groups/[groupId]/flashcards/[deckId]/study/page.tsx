"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  FlashcardDeck,
  Flashcard,
  getFlashcardDeck,
  getDueCards,
  recordReview,
  getStudyStats,
} from "@/lib/flashcards";
import {
  getRatingDescription,
  getRatingColor,
  getIntervalDescription,
  calculateNextReview,
} from "@/lib/spaced-repetition";
import { motion, AnimatePresence } from "framer-motion";

export default function StudyModePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyComplete, setStudyComplete] = useState(false);
  const [stats, setStats] = useState<{
    totalCards: number;
    dueCards: number;
    newCards: number;
    reviewedToday: number;
    accuracy: number;
  } | null>(null);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [deckData, dueCards, statsData] = await Promise.all([
      getFlashcardDeck(deckId),
      getDueCards(deckId),
      getStudyStats(deckId),
    ]);
    setDeck(deckData);
    // Shuffle cards for variety
    setCards(shuffleArray([...dueCards]));
    setStats(statsData);
    setLoading(false);

    if (dueCards.length === 0) {
      setStudyComplete(true);
    }
  }, [deckId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = async (rating: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Record the review
    await recordReview(currentCard.id, rating);

    // Update session stats
    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 2 ? 1 : 0),
    }));

    // Move to next card
    if (currentIndex + 1 >= cards.length) {
      setStudyComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const getPreviewInterval = (rating: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return "";

    const progress = currentCard.progress
      ? {
          easeFactor: currentCard.progress.ease_factor,
          interval: currentCard.progress.interval,
          repetitions: currentCard.progress.repetitions,
        }
      : { easeFactor: 2.5, interval: 0, repetitions: 0 };

    const result = calculateNextReview(progress, rating);
    return getIntervalDescription(result.interval);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-medium">Loading study session...</p>
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

  if (studyComplete) {
    return (
      <div className="min-h-screen bg-bright-white">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
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
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-cosmic-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-cosmic-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              Study Session Complete!
            </h1>
            <p className="text-slate-medium mb-6">
              {sessionStats.reviewed > 0
                ? `You reviewed ${sessionStats.reviewed} cards with ${Math.round(
                    (sessionStats.correct / sessionStats.reviewed) * 100
                  )}% accuracy`
                : "No cards were due for review"}
            </p>

            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-semibold text-slate-dark">{stats.totalCards}</p>
                  <p className="text-sm text-slate-medium">Total Cards</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-semibold text-electric-cyan">{stats.accuracy}%</p>
                  <p className="text-sm text-slate-medium">Overall Accuracy</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Link href={`/groups/${groupId}/flashcards/${deckId}`} className="btn-outline">
                Edit Deck
              </Link>
              <Link href={`/groups/${groupId}/flashcards`} className="btn-primary">
                Back to Decks
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="font-medium text-slate-dark">{deck.title}</h1>
                <p className="text-xs text-slate-medium">
                  {currentIndex + 1} / {cards.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-electric-cyan transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 mb-8">
          <motion.div
            className="relative w-full aspect-[4/3] cursor-pointer"
            onClick={handleFlip}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-lg p-8 flex items-center justify-center backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center">
                <p className="text-xs text-slate-light uppercase tracking-wide mb-4">Question</p>
                <p className="text-xl text-slate-dark whitespace-pre-wrap">
                  {currentCard?.front_content}
                </p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-lg p-8 flex items-center justify-center"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="text-center">
                <p className="text-xs text-slate-light uppercase tracking-wide mb-4">Answer</p>
                <p className="text-xl text-slate-dark whitespace-pre-wrap">
                  {currentCard?.back_content}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Flip Hint */}
        {!isFlipped && (
          <p className="text-center text-sm text-slate-medium mb-6">Tap card to reveal answer</p>
        )}

        {/* Rating Buttons */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-slate-medium mb-4">
                How well did you know this?
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRating(rating)}
                    className={`py-4 px-2 rounded-xl text-white font-medium transition-transform hover:scale-105 ${getRatingColor(
                      rating
                    )}`}
                  >
                    <span className="block text-sm">{getRatingDescription(rating)}</span>
                    <span className="block text-xs opacity-75 mt-1">
                      {getPreviewInterval(rating)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcuts */}
        <div className="mt-8 text-center text-xs text-slate-light">
          <p>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Space</kbd> to flip</p>
        </div>
      </main>

      {/* Keyboard Handler */}
      <KeyboardHandler
        isFlipped={isFlipped}
        onFlip={handleFlip}
        onRating={handleRating}
      />
    </div>
  );
}

// Keyboard Handler Component
function KeyboardHandler({
  isFlipped,
  onFlip,
  onRating,
}: {
  isFlipped: boolean;
  onFlip: () => void;
  onRating: (rating: number) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) {
          onFlip();
        }
      } else if (isFlipped) {
        if (e.key === "1") onRating(0);
        else if (e.key === "2") onRating(1);
        else if (e.key === "3") onRating(2);
        else if (e.key === "4") onRating(3);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, onFlip, onRating]);

  return null;
}
