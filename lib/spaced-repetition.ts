/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * This is a simplified implementation of the SuperMemo SM-2 algorithm
 * used for calculating optimal review intervals for flashcards.
 *
 * Rating scale:
 * 0 = Complete blackout, didn't remember at all
 * 1 = Incorrect response, but upon seeing correct answer, remembered
 * 2 = Correct response, but with difficulty
 * 3 = Correct response with perfect recall
 */

export interface ReviewResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

export interface CardProgress {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

/**
 * Calculate the next review date and updated progress based on user rating
 *
 * @param progress - Current card progress (ease factor, interval, repetitions)
 * @param rating - User's confidence rating (0-3)
 * @returns Updated progress values and next review date
 */
export function calculateNextReview(
  progress: CardProgress,
  rating: number
): ReviewResult {
  let { easeFactor, interval, repetitions } = progress;

  // Clamp rating to valid range
  rating = Math.max(0, Math.min(3, rating));

  // Map 0-3 rating to SM-2's 0-5 scale for ease factor calculation
  // 0 -> 0, 1 -> 2, 2 -> 3, 3 -> 5
  const mappedRating = [0, 2, 3, 5][rating];

  // If rating indicates failure (0 or 1), reset repetitions
  if (rating < 2) {
    repetitions = 0;
    interval = 1;
  } else {
    // Successful recall
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      // For subsequent reviews, multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor using SM-2 formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // where q is the quality of response (0-5)
  easeFactor =
    easeFactor + (0.1 - (5 - mappedRating) * (0.08 + (5 - mappedRating) * 0.02));

  // Ensure ease factor doesn't go below 1.3
  easeFactor = Math.max(1.3, easeFactor);

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  nextReviewAt.setHours(0, 0, 0, 0); // Reset to start of day

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
  };
}

/**
 * Get initial progress values for a new card
 */
export function getInitialProgress(): CardProgress {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  };
}

/**
 * Check if a card is due for review
 */
export function isDue(nextReviewAt: Date | string | null): boolean {
  if (!nextReviewAt) return true; // Never reviewed

  const reviewDate = typeof nextReviewAt === 'string'
    ? new Date(nextReviewAt)
    : nextReviewAt;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return reviewDate <= now;
}

/**
 * Get a human-readable description of the next review interval
 */
export function getIntervalDescription(interval: number): string {
  if (interval === 0) return "New";
  if (interval === 1) return "Tomorrow";
  if (interval < 7) return `${interval} days`;
  if (interval < 30) {
    const weeks = Math.round(interval / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (interval < 365) {
    const months = Math.round(interval / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.round(interval / 365);
  return years === 1 ? "1 year" : `${years} years`;
}

/**
 * Get the confidence level description for a rating
 */
export function getRatingDescription(rating: number): string {
  switch (rating) {
    case 0:
      return "Forgot";
    case 1:
      return "Hard";
    case 2:
      return "Good";
    case 3:
      return "Easy";
    default:
      return "Unknown";
  }
}

/**
 * Get color class for rating button
 */
export function getRatingColor(rating: number): string {
  switch (rating) {
    case 0:
      return "bg-red-500 hover:bg-red-600";
    case 1:
      return "bg-orange-500 hover:bg-orange-600";
    case 2:
      return "bg-electric-cyan hover:bg-electric-cyan/90";
    case 3:
      return "bg-cosmic-green hover:bg-cosmic-green/90";
    default:
      return "bg-gray-500";
  }
}
