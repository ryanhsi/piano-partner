/**
 * Scoring Engine
 *
 * Takes comparator results and produces the final score, star rating,
 * improvement suggestions, and a full practice report.
 * All functions are pure / immutable — no state is modified in place.
 */

/**
 * Calculate the percentage of correct notes out of total results.
 * Extra notes (notes not in the expected list) are excluded from the total.
 *
 * @param {{ status: 'correct' | 'wrong' | 'miss' }[]} results
 * @returns {number} Score percentage 0–100
 */
export function calculateScore(results) {
  if (results.length === 0) return 0;

  const correctCount = results.filter((r) => r.status === 'correct').length;
  return (correctCount / results.length) * 100;
}

/**
 * Map a percentage score to a 1–5 star rating.
 *
 * @param {number} percentage - 0–100
 * @returns {1|2|3|4|5}
 */
export function getStarRating(percentage) {
  if (percentage >= 95) return 5;
  if (percentage >= 80) return 4;
  if (percentage >= 60) return 3;
  if (percentage >= 40) return 2;
  return 1;
}

/**
 * Analyse results and return human-readable improvement suggestions.
 * Groups wrong/miss results by note name, then reports the most
 * frequently missed notes in descending order.
 *
 * @param {{ status: string, expected: { midi: number, name: string } }[]} results
 * @returns {string[]} Array of suggestion strings
 */
export function generateSuggestions(results) {
  // Tally error counts per note name
  const errorCounts = new Map();

  for (const result of results) {
    if (result.status === 'wrong' || result.status === 'miss') {
      const noteName = result.expected?.name ?? `MIDI ${result.expected?.midi}`;
      errorCounts.set(noteName, (errorCounts.get(noteName) ?? 0) + 1);
    }
  }

  if (errorCounts.size === 0) return [];

  // Sort by frequency (most frequent first)
  const sorted = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]);

  return sorted.map(([name, count]) =>
    `Practice note ${name} — missed/wrong ${count} time${count > 1 ? 's' : ''}.`
  );
}

/**
 * Build a full practice report from a comparator state and song metadata.
 *
 * @param {{ results: object[], extras?: object[] }} comparatorState
 * @param {{ name: string }} songInfo
 * @returns {{
 *   songName: string,
 *   score: number,
 *   stars: 1|2|3|4|5,
 *   totalNotes: number,
 *   correctNotes: number,
 *   wrongNotes: number,
 *   missedNotes: number,
 *   suggestions: string[]
 * }}
 */
export function createReport(comparatorState, songInfo) {
  const { results } = comparatorState;

  const correctNotes = results.filter((r) => r.status === 'correct').length;
  const wrongNotes = results.filter((r) => r.status === 'wrong').length;
  const missedNotes = results.filter((r) => r.status === 'miss').length;
  const totalNotes = results.length;

  const score = calculateScore(results);
  const stars = getStarRating(score);
  const suggestions = generateSuggestions(results);

  return Object.freeze({
    songName: songInfo.name,
    score,
    stars,
    totalNotes,
    correctNotes,
    wrongNotes,
    missedNotes,
    suggestions: Object.freeze([...suggestions]),
  });
}
