/**
 * Note Comparator Engine
 *
 * Compares played notes against expected notes from the score.
 * All state operations are immutable — every processPlayedNote call
 * returns a new state object.
 */

const DEFAULT_TOLERANCE = 0.2; // seconds (±200ms)

/**
 * Compare a single expected note against a played note.
 *
 * @param {{ midi: number, time: number }} expected
 * @param {{ midi: number, time: number }} played
 * @param {number} tolerance - time window in seconds
 * @returns {'correct' | 'wrong' | 'miss'}
 */
export function compareNote(expected, played, tolerance = DEFAULT_TOLERANCE) {
  const timeDiff = Math.abs(played.time - expected.time);
  if (timeDiff > tolerance) {
    return 'miss';
  }
  return played.midi === expected.midi ? 'correct' : 'wrong';
}

/**
 * Create an initial comparator state from the list of expected notes.
 *
 * @param {{ midi: number, time: number }[]} expectedNotes
 * @returns {{ expectedNotes: object[], results: object[], extras: object[], cursor: number }}
 */
export function createComparatorState(expectedNotes) {
  return Object.freeze({
    expectedNotes: Object.freeze([...expectedNotes]),
    results: Object.freeze([]),
    extras: Object.freeze([]),
    cursor: 0,
  });
}

/**
 * Process a played note against the current comparator state.
 * Finds the nearest unmatched expected note within the tolerance window.
 * Returns a NEW state (immutable) with the match result appended.
 *
 * @param {{ expectedNotes: object[], results: object[], extras: object[], cursor: number }} state
 * @param {{ midi: number, time: number }} playedNote
 * @param {number} tolerance
 * @returns {{ expectedNotes: object[], results: object[], extras: object[], cursor: number }}
 */
export function processPlayedNote(state, playedNote, tolerance = DEFAULT_TOLERANCE) {
  const { expectedNotes, results, extras, cursor } = state;

  // Find the nearest unmatched expected note within the tolerance window
  // that shares the same MIDI pitch. Notes without a midi match are extras.
  // We search from the cursor onward (notes are assumed time-ordered).
  let bestIndex = -1;
  let bestTimeDiff = Infinity;

  for (let i = cursor; i < expectedNotes.length; i++) {
    const timeDiff = Math.abs(playedNote.time - expectedNotes[i].time);
    if (timeDiff <= tolerance) {
      if (expectedNotes[i].midi === playedNote.midi && timeDiff < bestTimeDiff) {
        bestTimeDiff = timeDiff;
        bestIndex = i;
      }
    } else if (expectedNotes[i].time > playedNote.time + tolerance) {
      // All subsequent notes are even further in the future; stop searching.
      break;
    }
  }

  if (bestIndex === -1) {
    // No matching expected note found — this is an extra note.
    return Object.freeze({
      expectedNotes,
      results: Object.freeze([...results]),
      extras: Object.freeze([...extras, { ...playedNote }]),
      cursor,
    });
  }

  const matchedExpected = expectedNotes[bestIndex];
  const status = playedNote.midi === matchedExpected.midi ? 'correct' : 'wrong';

  const newResult = Object.freeze({
    expected: matchedExpected,
    played: { ...playedNote },
    status,
  });

  return Object.freeze({
    expectedNotes,
    results: Object.freeze([...results, newResult]),
    extras: Object.freeze([...extras]),
    cursor: bestIndex + 1,
  });
}
