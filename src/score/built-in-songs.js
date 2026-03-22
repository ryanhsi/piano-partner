/**
 * Built-in starter songs for children's piano practice.
 *
 * Note format: { midi, time, duration, velocity, name }
 *   midi     - MIDI note number (middle C = 60)
 *   time     - start time in seconds
 *   duration - note duration in seconds
 *   velocity - key velocity 0-127
 *   name     - note name string (e.g. 'C4')
 *
 * BPM 120 → quarter note = 0.5 s
 */

// ── helper ────────────────────────────────────────────────────────────────────

/**
 * Build a note object from a shorthand tuple.
 * @param {number} midi
 * @param {number} time  start time in seconds
 * @param {number} dur   duration in seconds
 * @param {string} name  note name
 * @returns {{ midi: number, time: number, duration: number, velocity: number, name: string }}
 */
function note(midi, time, dur, name) {
  return { midi, time, duration: dur, velocity: 80, name };
}

// ── MIDI note constants (octave 4, middle C = 60) ────────────────────────────

const C4 = 60;
const D4 = 62;
const E4 = 64;
const F4 = 65;
const G4 = 67;
const A4 = 69;
const B4 = 71;
const C5 = 72;

// ── Songs ─────────────────────────────────────────────────────────────────────

/**
 * 小星星 (Twinkle Twinkle Little Star) — C major, BPM 100
 *
 * Melody (quarter notes unless marked):
 *   C C G G A A G(half) | F F E E D D C(half) |
 *   G G F F E E D(half) | G G F F E E D(half) |
 *   C C G G A A G(half) | F F E E D D C(half)
 */
const BPM_TWINKLE = 100;
const Q = 60 / BPM_TWINKLE;       // quarter = 0.6 s
const H = Q * 2;                   // half    = 1.2 s

const TWINKLE_NOTES = (() => {
  const seq = [
    // bar 1: C C G G A A G(half)
    [C4, 'C4'], [C4, 'C4'], [G4, 'G4'], [G4, 'G4'], [A4, 'A4'], [A4, 'A4'],
    // bar 2: F F E E D D C(half)
    [F4, 'F4'], [F4, 'F4'], [E4, 'E4'], [E4, 'E4'], [D4, 'D4'], [D4, 'D4'],
    // bar 3: G G F F E E D(half)
    [G4, 'G4'], [G4, 'G4'], [F4, 'F4'], [F4, 'F4'], [E4, 'E4'], [E4, 'E4'],
    // bar 4: G G F F E E D(half)
    [G4, 'G4'], [G4, 'G4'], [F4, 'F4'], [F4, 'F4'], [E4, 'E4'], [E4, 'E4'],
    // bar 5: C C G G A A G(half)
    [C4, 'C4'], [C4, 'C4'], [G4, 'G4'], [G4, 'G4'], [A4, 'A4'], [A4, 'A4'],
    // bar 6: F F E E D D C(half)
    [F4, 'F4'], [F4, 'F4'], [E4, 'E4'], [E4, 'E4'], [D4, 'D4'], [D4, 'D4'],
  ];

  const notes = [];
  let t = 0;
  // Each group of 6 quarter notes is followed by 1 half note
  for (let i = 0; i < seq.length; i++) {
    const posInBar = i % 6;        // 0-5 → 6 quarters per bar segment
    const [midi, name] = seq[i];
    notes.push(note(midi, t, Q * 0.9, name));
    t += Q;
    // After each 6th quarter, insert a half note rest+note for the 7th beat
    if (posInBar === 5) {
      // 7th beat of the bar is a half note for the last pitch of previous segment
      const [lastMidi, lastName] = (i % 12 < 6)
        ? [G4, 'G4']   // bar 1,5 → G half
        : [D4, 'D4'];  // bar 2,3,4,6 → D half (bar 3,4 end on D)

      // Determine the correct half-note pitch per bar index
      const barIndex = Math.floor(i / 6);
      const halfPitch = [
        [G4, 'G4'],  // bar 0: G half
        [C4, 'C4'],  // bar 1: C half
        [D4, 'D4'],  // bar 2: D half
        [D4, 'D4'],  // bar 3: D half
        [G4, 'G4'],  // bar 4: G half
        [C4, 'C4'],  // bar 5: C half
      ][barIndex];
      notes.push(note(halfPitch[0], t, H * 0.9, halfPitch[1]));
      t += H;
    }
  }
  return notes;
})();

/**
 * 瑪莉有隻小綿羊 (Mary Had a Little Lamb) — C major, BPM 110
 *
 * Melody (quarter notes unless marked):
 *   E D C D E E E(half) | D D D(half) E G G(half) |
 *   E D C D E E E E    | D D E D C(whole)
 */
const BPM_MARY = 110;
const QM = 60 / BPM_MARY;   // quarter
const HM = QM * 2;           // half
const WM = QM * 4;           // whole

const MARY_NOTES = (() => {
  // Each entry: [midi, name, beats]  (beats in quarter notes)
  const seq = [
    // bar 1
    [E4, 'E4', 1], [D4, 'D4', 1], [C4, 'C4', 1], [D4, 'D4', 1],
    [E4, 'E4', 1], [E4, 'E4', 1], [E4, 'E4', 2],
    // bar 2
    [D4, 'D4', 1], [D4, 'D4', 1], [D4, 'D4', 2],
    [E4, 'E4', 1], [G4, 'G4', 1], [G4, 'G4', 2],
    // bar 3
    [E4, 'E4', 1], [D4, 'D4', 1], [C4, 'C4', 1], [D4, 'D4', 1],
    [E4, 'E4', 1], [E4, 'E4', 1], [E4, 'E4', 1], [E4, 'E4', 1],
    // bar 4
    [D4, 'D4', 1], [D4, 'D4', 1], [E4, 'E4', 1], [D4, 'D4', 1],
    [C4, 'C4', 4],
  ];

  const notes = [];
  let t = 0;
  for (const [midi, name, beats] of seq) {
    const dur = beats * QM;
    notes.push(note(midi, t, dur * 0.9, name));
    t += dur;
  }
  return notes;
})();

// ── Song catalog ──────────────────────────────────────────────────────────────

const BUILT_IN_SONGS = [
  {
    id: 'twinkle',
    name: '小星星 (Twinkle Twinkle Little Star)',
    bpm: BPM_TWINKLE,
    duration: TWINKLE_NOTES.at(-1).time + TWINKLE_NOTES.at(-1).duration,
    notes: TWINKLE_NOTES,
  },
  {
    id: 'mary',
    name: '瑪莉有隻小綿羊 (Mary Had a Little Lamb)',
    bpm: BPM_MARY,
    duration: MARY_NOTES.at(-1).time + MARY_NOTES.at(-1).duration,
    notes: MARY_NOTES,
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a shallow copy of all built-in songs.
 * @returns {Array<Object>}
 */
export function getBuiltInSongs() {
  return [...BUILT_IN_SONGS];
}

/**
 * Finds a built-in song by its id.
 * @param {string} id
 * @returns {Object|null}
 */
export function getSongById(id) {
  return BUILT_IN_SONGS.find((s) => s.id === id) ?? null;
}
