"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";
import { calculateNextReview, getInitialProgress, isDue } from "./spaced-repetition";

// ============================================
// TYPES
// ============================================

export interface FlashcardDeck {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  card_count: number;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  due_count?: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  front_image_url: string | null;
  back_image_url: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  progress?: FlashcardProgress | null;
}

export interface FlashcardProgress {
  id: string;
  card_id: string;
  user_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  last_rating: number | null;
  total_reviews: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// FLASHCARD DECKS CRUD
// ============================================

export async function getFlashcardDecks(groupId: string): Promise<FlashcardDeck[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: decks, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching flashcard decks:", error);
    return [];
  }

  // Get creator info and due counts for each deck
  const decksWithDetails = await Promise.all(
    (decks || []).map(async (deck) => {
      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", deck.created_by)
        .single();

      // Get due count for current user
      let dueCount = 0;
      if (user) {
        const { data: cards } = await supabase
          .from("flashcards")
          .select("id")
          .eq("deck_id", deck.id);

        if (cards) {
          for (const card of cards) {
            const { data: progress } = await supabase
              .from("flashcard_progress")
              .select("next_review_at")
              .eq("card_id", card.id)
              .eq("user_id", user.id)
              .single();

            if (!progress || isDue(progress.next_review_at)) {
              dueCount++;
            }
          }
        }
      }

      return {
        ...deck,
        creator: creator || undefined,
        due_count: dueCount,
      };
    })
  );

  return decksWithDetails;
}

export async function getFlashcardDeck(deckId: string): Promise<FlashcardDeck | null> {
  const supabase = await createServerSupabaseClient();

  const { data: deck, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (error || !deck) {
    console.error("Error fetching flashcard deck:", error);
    return null;
  }

  // Get creator info
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", deck.created_by)
    .single();

  return {
    ...deck,
    creator: creator || undefined,
  };
}

export async function createFlashcardDeck(
  groupId: string,
  data: {
    title: string;
    description?: string;
    subject?: string;
    is_public?: boolean;
  }
): Promise<{ success: boolean; deck?: FlashcardDeck; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: deck, error } = await supabase
    .from("flashcard_decks")
    .insert({
      group_id: groupId,
      title: data.title,
      description: data.description || null,
      subject: data.subject || null,
      is_public: data.is_public ?? true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating flashcard deck:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards`);
  return { success: true, deck };
}

export async function updateFlashcardDeck(
  deckId: string,
  groupId: string,
  data: Partial<{
    title: string;
    description: string;
    subject: string;
    is_public: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("flashcard_decks")
    .update(data)
    .eq("id", deckId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating flashcard deck:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards`);
  return { success: true };
}

export async function deleteFlashcardDeck(
  deckId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", deckId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting flashcard deck:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards`);
  return { success: true };
}

// ============================================
// FLASHCARDS CRUD
// ============================================

export async function getFlashcards(deckId: string): Promise<Flashcard[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cards, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching flashcards:", error);
    return [];
  }

  // Get progress for current user
  if (user) {
    const cardsWithProgress = await Promise.all(
      (cards || []).map(async (card) => {
        const { data: progress } = await supabase
          .from("flashcard_progress")
          .select("*")
          .eq("card_id", card.id)
          .eq("user_id", user.id)
          .single();

        return {
          ...card,
          progress: progress || null,
        };
      })
    );
    return cardsWithProgress;
  }

  return cards || [];
}

export async function getDueCards(deckId: string): Promise<Flashcard[]> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const cards = await getFlashcards(deckId);

  // Filter to cards that are due
  return cards.filter((card) => {
    if (!card.progress) return true; // Never reviewed
    return isDue(card.progress.next_review_at);
  });
}

export async function createFlashcard(
  deckId: string,
  groupId: string,
  data: {
    front_content: string;
    back_content: string;
    front_image_url?: string;
    back_image_url?: string;
  }
): Promise<{ success: boolean; card?: Flashcard; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get current max sort order
  const { data: existingCards } = await supabase
    .from("flashcards")
    .select("sort_order")
    .eq("deck_id", deckId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existingCards?.[0]?.sort_order ?? -1;

  const { data: card, error } = await supabase
    .from("flashcards")
    .insert({
      deck_id: deckId,
      front_content: data.front_content,
      back_content: data.back_content,
      front_image_url: data.front_image_url || null,
      back_image_url: data.back_image_url || null,
      sort_order: nextSortOrder + 1,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating flashcard:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards/${deckId}`);
  return { success: true, card };
}

export async function updateFlashcard(
  cardId: string,
  deckId: string,
  groupId: string,
  data: Partial<{
    front_content: string;
    back_content: string;
    front_image_url: string;
    back_image_url: string;
    sort_order: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("flashcards")
    .update(data)
    .eq("id", cardId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error updating flashcard:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards/${deckId}`);
  return { success: true };
}

export async function deleteFlashcard(
  cardId: string,
  deckId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", cardId)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting flashcard:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}/flashcards/${deckId}`);
  return { success: true };
}

// ============================================
// FLASHCARD PROGRESS / REVIEW
// ============================================

export async function recordReview(
  cardId: string,
  rating: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get existing progress
  const { data: existingProgress } = await supabase
    .from("flashcard_progress")
    .select("*")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  // Calculate new values
  const currentProgress = existingProgress
    ? {
        easeFactor: existingProgress.ease_factor,
        interval: existingProgress.interval,
        repetitions: existingProgress.repetitions,
      }
    : getInitialProgress();

  const result = calculateNextReview(currentProgress, rating);
  const isCorrect = rating >= 2;

  if (existingProgress) {
    // Update existing progress
    const { error } = await supabase
      .from("flashcard_progress")
      .update({
        ease_factor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: result.nextReviewAt.toISOString(),
        last_rating: rating,
        total_reviews: existingProgress.total_reviews + 1,
        correct_count: existingProgress.correct_count + (isCorrect ? 1 : 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProgress.id);

    if (error) {
      console.error("Error updating progress:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Create new progress
    const { error } = await supabase.from("flashcard_progress").insert({
      card_id: cardId,
      user_id: user.id,
      ease_factor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: result.nextReviewAt.toISOString(),
      last_rating: rating,
      total_reviews: 1,
      correct_count: isCorrect ? 1 : 0,
    });

    if (error) {
      console.error("Error creating progress:", error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

export async function getStudyStats(deckId: string): Promise<{
  totalCards: number;
  dueCards: number;
  newCards: number;
  reviewedToday: number;
  accuracy: number;
}> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalCards: 0,
      dueCards: 0,
      newCards: 0,
      reviewedToday: 0,
      accuracy: 0,
    };
  }

  const cards = await getFlashcards(deckId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueCards = 0;
  let newCards = 0;
  let reviewedToday = 0;
  let totalCorrect = 0;
  let totalReviews = 0;

  for (const card of cards) {
    if (!card.progress) {
      newCards++;
      dueCards++;
    } else {
      if (isDue(card.progress.next_review_at)) {
        dueCards++;
      }

      const lastReview = card.progress.last_reviewed_at
        ? new Date(card.progress.last_reviewed_at)
        : null;
      if (lastReview && lastReview >= today) {
        reviewedToday++;
      }

      totalCorrect += card.progress.correct_count;
      totalReviews += card.progress.total_reviews;
    }
  }

  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  return {
    totalCards: cards.length,
    dueCards,
    newCards,
    reviewedToday,
    accuracy,
  };
}
