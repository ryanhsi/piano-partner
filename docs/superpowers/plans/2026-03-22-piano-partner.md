# Piano Partner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a child-friendly web app that helps kids practice piano by detecting played notes (via microphone, MIDI keyboard, or audio upload) and comparing them against sheet music in real-time.

**Architecture:** Pure frontend Vite + Vanilla JS app. Three input pipelines (microphone/YIN, Web MIDI, audio file/YIN) feed into a unified note comparator engine, which scores against parsed MIDI sheet music. Visual feedback via HTML Canvas (waterfall + piano keyboard).

**Tech Stack:** Vite, Vanilla JS, Web Audio API, Web MIDI API, YIN pitch detection, @tonejs/midi, HTML Canvas

---

## File Structure

```
piano_partner/
├── index.html                        # Single page app shell
├── package.json                      # Dependencies and scripts
├── vite.config.js                    # Vite configuration
├── src/
│   ├── main.js                       # App entry: router + module wiring
│   ├── app.js                        # Centralized immutable state management
│   ├── styles/
│   │   └── index.css                 # Design system: CSS variables, animations, layout
│   ├── audio/
│   │   ├── pitch-detector.js         # YIN algorithm + microphone init + audio file decode
│   │   └── midi-input.js             # Web MIDI device discovery + event listening
│   ├── score/
│   │   ├── midi-parser.js            # Parse MIDI files via @tonejs/midi
│   │   └── built-in-songs.js         # Hardcoded MIDI data for starter songs
│   ├── engine/
│   │   ├── comparator.js             # Real-time note matching (±200ms window)
│   │   └── scorer.js                 # Full-song scoring + improvement suggestions
│   └── ui/
│       ├── piano-keyboard.js         # Canvas 88-key piano visualization
│       ├── waterfall.js              # Canvas waterfall note display
│       └── report.js                 # Practice report page rendering
├── public/
│   └── songs/                        # Built-in MIDI files (optional prebuilt)
└── tests/
    ├── audio/
    │   ├── pitch-detector.test.js    # YIN algorithm unit tests
    │   └── midi-input.test.js        # MIDI input handling tests
    ├── score/
    │   ├── midi-parser.test.js       # MIDI parsing tests
    │   └── built-in-songs.test.js    # Built-in songs data tests
    ├── engine/
    │   ├── comparator.test.js        # Note comparison logic tests
    │   └── scorer.test.js            # Scoring algorithm tests
    └── ui/
        ├── piano-keyboard.test.js    # Keyboard rendering tests
        ├── waterfall.test.js         # Waterfall rendering tests
        └── report.test.js            # Report generation tests
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles/index.css`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
npm init -y
npm install @tonejs/midi
npm install -D vite vitest jsdom @vitest/coverage-v8
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

- [ ] **Step 3: Create index.html app shell**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Piano Partner</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Quicksand:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/index.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create CSS design system**

Create `src/styles/index.css` with:
- CSS custom properties for child-friendly color palette
- Nunito (headings) + Quicksand (body) font stack
- Large button styles, rounded corners, playful animations
- Responsive layout utilities

- [ ] **Step 5: Create main.js entry point stub**

```js
// src/main.js — safe DOM construction, no innerHTML
const app = document.getElementById('app');
const heading = document.createElement('h1');
heading.textContent = 'Piano Partner';
app.appendChild(heading);
```

- [ ] **Step 6: Update .gitignore and commit**

```bash
echo "node_modules/\ndist/\ncoverage/\nfirebase-debug.log" > .gitignore
git add .
git commit -m "chore: scaffold Vite project with dependencies"
```

---

## Task 2: Immutable State Management (`app.js`)

**Files:**
- Create: `src/app.js`
- Create: `tests/app.test.js`

- [ ] **Step 1: Write failing tests for state management**

```js
// tests/app.test.js
import { describe, it, expect } from 'vitest';
import { createAppState, updateState } from '../src/app.js';

describe('App State', () => {
  it('creates initial state with default values', () => {
    const state = createAppState();
    expect(state.mode).toBe(null);          // null | 'mic' | 'midi' | 'upload'
    expect(state.currentSong).toBe(null);
    expect(state.isPlaying).toBe(false);
    expect(state.playedNotes).toEqual([]);
    expect(state.score).toBe(null);
  });

  it('returns new state object on update (immutable)', () => {
    const state = createAppState();
    const newState = updateState(state, { mode: 'mic' });
    expect(newState).not.toBe(state);
    expect(newState.mode).toBe('mic');
    expect(state.mode).toBe(null); // original unchanged
  });

  it('preserves unmodified fields on update', () => {
    const state = createAppState();
    const newState = updateState(state, { isPlaying: true });
    expect(newState.mode).toBe(null);
    expect(newState.isPlaying).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/app.test.js
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement minimal app.js**

```js
// src/app.js
export function createAppState() {
  return Object.freeze({
    mode: null,
    currentSong: null,
    isPlaying: false,
    playedNotes: [],
    score: null,
    page: 'home' // 'home' | 'select' | 'practice' | 'report'
  });
}

export function updateState(state, changes) {
  return Object.freeze({ ...state, ...changes });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/app.test.js
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js tests/app.test.js
git commit -m "feat: add immutable state management"
```

---

## Task 3: YIN Pitch Detection (`pitch-detector.js`)

**Files:**
- Create: `src/audio/pitch-detector.js`
- Create: `tests/audio/pitch-detector.test.js`

- [ ] **Step 1: Write failing tests for frequency/MIDI conversion utilities**

```js
// tests/audio/pitch-detector.test.js
import { describe, it, expect } from 'vitest';
import { frequencyToMidi, midiToNoteName, detectPitch } from '../src/audio/pitch-detector.js';

describe('frequencyToMidi', () => {
  it('converts A4 (440Hz) to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });
  it('converts C4 (261.63Hz) to MIDI 60', () => {
    expect(frequencyToMidi(261.63)).toBe(60);
  });
  it('returns -1 for frequency below audible range', () => {
    expect(frequencyToMidi(0)).toBe(-1);
    expect(frequencyToMidi(-10)).toBe(-1);
  });
});

describe('midiToNoteName', () => {
  it('converts MIDI 60 to C4', () => {
    expect(midiToNoteName(60)).toBe('C4');
  });
  it('converts MIDI 69 to A4', () => {
    expect(midiToNoteName(69)).toBe('A4');
  });
  it('handles sharps correctly', () => {
    expect(midiToNoteName(61)).toBe('C#4');
  });
});

describe('detectPitch (YIN)', () => {
  it('detects pitch from a pure sine wave buffer', () => {
    const sampleRate = 44100;
    const freq = 440;
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    const detected = detectPitch(buffer, sampleRate);
    expect(detected).toBeGreaterThan(435);
    expect(detected).toBeLessThan(445);
  });

  it('returns -1 for silence', () => {
    const buffer = new Float32Array(2048).fill(0);
    expect(detectPitch(buffer, 44100)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/audio/pitch-detector.test.js
```

- [ ] **Step 3: Implement pitch-detector.js**

Implement:
- `detectPitch(buffer, sampleRate)` — YIN algorithm: difference function, cumulative mean normalized difference, absolute threshold (0.15), parabolic interpolation
- `frequencyToMidi(freq)` — `Math.round(12 * Math.log2(freq / 440) + 69)`
- `midiToNoteName(midi)` — lookup table `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']`
- `initMicrophone()` — create AudioContext, getUserMedia, AnalyserNode (exported but not unit-tested, browser-only)
- `processAudioFile(file)` — decode audio buffer, slice into frames, detect each frame

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/audio/pitch-detector.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/audio/pitch-detector.js tests/audio/pitch-detector.test.js
git commit -m "feat: implement YIN pitch detection with frequency/MIDI conversion"
```

---

## Task 4: MIDI Input Handler (`midi-input.js`)

**Files:**
- Create: `src/audio/midi-input.js`
- Create: `tests/audio/midi-input.test.js`

- [ ] **Step 1: Write failing tests for MIDI message parsing**

```js
// tests/audio/midi-input.test.js
import { describe, it, expect } from 'vitest';
import { parseMidiMessage } from '../src/audio/midi-input.js';

describe('parseMidiMessage', () => {
  it('parses note-on message', () => {
    const result = parseMidiMessage([0x90, 60, 100]); // channel 0, C4, velocity 100
    expect(result).toEqual({ type: 'noteOn', note: 60, velocity: 100 });
  });

  it('treats note-on with velocity 0 as note-off', () => {
    const result = parseMidiMessage([0x90, 60, 0]);
    expect(result).toEqual({ type: 'noteOff', note: 60, velocity: 0 });
  });

  it('parses note-off message', () => {
    const result = parseMidiMessage([0x80, 60, 64]);
    expect(result).toEqual({ type: 'noteOff', note: 60, velocity: 64 });
  });

  it('returns null for non-note messages', () => {
    const result = parseMidiMessage([0xB0, 64, 127]); // control change
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/audio/midi-input.test.js
```

- [ ] **Step 3: Implement midi-input.js**

```js
// src/audio/midi-input.js
export function parseMidiMessage(data) {
  const status = data[0] & 0xF0;
  const note = data[1];
  const velocity = data[2];

  if (status === 0x90 && velocity > 0) {
    return { type: 'noteOn', note, velocity };
  }
  if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    return { type: 'noteOff', note, velocity };
  }
  return null;
}

// Browser-only: Web MIDI API device discovery
export async function initMidi(onNoteEvent) {
  if (!navigator.requestMIDIAccess) {
    throw new Error('Web MIDI API not supported');
  }
  const access = await navigator.requestMIDIAccess();
  const inputs = Array.from(access.inputs.values());
  for (const input of inputs) {
    input.onmidimessage = (event) => {
      const parsed = parseMidiMessage(Array.from(event.data));
      if (parsed) onNoteEvent(parsed);
    };
  }
  return { access, inputs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/audio/midi-input.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/audio/midi-input.js tests/audio/midi-input.test.js
git commit -m "feat: add MIDI input handler with message parsing"
```

---

## Task 5: MIDI Score Parser (`midi-parser.js`)

**Files:**
- Create: `src/score/midi-parser.js`
- Create: `tests/score/midi-parser.test.js`

- [ ] **Step 1: Write failing tests for MIDI score parsing**

```js
// tests/score/midi-parser.test.js
import { describe, it, expect } from 'vitest';
import { noteEventsToTimeline } from '../src/score/midi-parser.js';

describe('noteEventsToTimeline', () => {
  it('converts raw note events to sorted timeline', () => {
    const events = [
      { midi: 64, time: 0.5, duration: 0.5, velocity: 80 },
      { midi: 60, time: 0.0, duration: 0.5, velocity: 100 },
    ];
    const timeline = noteEventsToTimeline(events);
    expect(timeline[0].midi).toBe(60);
    expect(timeline[1].midi).toBe(64);
    expect(timeline).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(noteEventsToTimeline([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/score/midi-parser.test.js
```

- [ ] **Step 3: Implement midi-parser.js**

```js
// src/score/midi-parser.js
import { Midi } from '@tonejs/midi';

export function parseMidiScore(arrayBuffer) {
  const midi = new Midi(arrayBuffer);
  const track = midi.tracks[0]; // use first track
  const notes = track.notes.map(n => ({
    midi: n.midi,
    time: n.time,
    duration: n.duration,
    velocity: n.velocity,
    name: n.name,
  }));
  return {
    name: midi.name || 'Untitled',
    bpm: midi.header.tempos[0]?.bpm ?? 120,
    duration: midi.duration,
    notes: noteEventsToTimeline(notes),
  };
}

export function noteEventsToTimeline(events) {
  return [...events].sort((a, b) => a.time - b.time);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/score/midi-parser.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/score/midi-parser.js tests/score/midi-parser.test.js
git commit -m "feat: add MIDI score parser with @tonejs/midi"
```

---

## Task 6: Built-in Songs (`built-in-songs.js`)

**Files:**
- Create: `src/score/built-in-songs.js`
- Create: `tests/score/built-in-songs.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/score/built-in-songs.test.js
import { describe, it, expect } from 'vitest';
import { getBuiltInSongs, getSongById } from '../src/score/built-in-songs.js';

describe('Built-in Songs', () => {
  it('returns at least 2 built-in songs', () => {
    const songs = getBuiltInSongs();
    expect(songs.length).toBeGreaterThanOrEqual(2);
  });

  it('each song has required fields', () => {
    const songs = getBuiltInSongs();
    for (const song of songs) {
      expect(song).toHaveProperty('id');
      expect(song).toHaveProperty('name');
      expect(song).toHaveProperty('bpm');
      expect(song).toHaveProperty('notes');
      expect(song.notes.length).toBeGreaterThan(0);
    }
  });

  it('finds song by id', () => {
    const song = getSongById('twinkle');
    expect(song).not.toBeNull();
    expect(song.name).toContain('小星星');
  });

  it('returns null for unknown id', () => {
    expect(getSongById('nonexistent')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement built-in-songs.js**

Hardcode MIDI note data for:
- `twinkle` — 小星星 (Twinkle Twinkle Little Star)
- `mary` — 瑪莉有隻小綿羊 (Mary Had a Little Lamb)

Each song: `{ id, name, bpm, duration, notes: [{ midi, time, duration, velocity, name }] }`

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/score/built-in-songs.js tests/score/built-in-songs.test.js
git commit -m "feat: add built-in songs (Twinkle, Mary Had a Little Lamb)"
```

---

## Task 7: Note Comparator Engine (`comparator.js`)

**Files:**
- Create: `src/engine/comparator.js`
- Create: `tests/engine/comparator.test.js`

- [ ] **Step 1: Write failing tests for note comparison**

```js
// tests/engine/comparator.test.js
import { describe, it, expect } from 'vitest';
import { compareNote, createComparatorState, processPlayedNote } from '../src/engine/comparator.js';

describe('compareNote', () => {
  it('marks correct note within time window', () => {
    const expected = { midi: 60, time: 1.0 };
    const played = { midi: 60, time: 1.1 };
    expect(compareNote(expected, played, 0.2)).toBe('correct');
  });

  it('marks wrong note within time window', () => {
    const expected = { midi: 60, time: 1.0 };
    const played = { midi: 62, time: 1.05 };
    expect(compareNote(expected, played, 0.2)).toBe('wrong');
  });

  it('marks note outside time window as miss', () => {
    const expected = { midi: 60, time: 1.0 };
    const played = { midi: 60, time: 1.5 };
    expect(compareNote(expected, played, 0.2)).toBe('miss');
  });
});

describe('processPlayedNote', () => {
  it('matches played note to nearest expected note', () => {
    const state = createComparatorState([
      { midi: 60, time: 0.0 },
      { midi: 64, time: 0.5 },
    ]);
    const result = processPlayedNote(state, { midi: 60, time: 0.05 });
    expect(result.results[0].status).toBe('correct');
  });

  it('marks extra note when no match exists', () => {
    const state = createComparatorState([
      { midi: 60, time: 0.0 },
    ]);
    const result = processPlayedNote(state, { midi: 72, time: 0.05 });
    expect(result.extras).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement comparator.js**

Implement:
- `compareNote(expected, played, tolerance)` — compare single note pair
- `createComparatorState(expectedNotes)` — immutable state: `{ expectedNotes, results: [], extras: [], cursor: 0 }`
- `processPlayedNote(state, playedNote)` — returns new state with match result appended
- Tolerance: +/-200ms default
- Statuses: `'correct'`, `'wrong'`, `'miss'`, `'extra'`

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/engine/comparator.js tests/engine/comparator.test.js
git commit -m "feat: implement real-time note comparator with 200ms tolerance"
```

---

## Task 8: Scoring Engine (`scorer.js`)

**Files:**
- Create: `src/engine/scorer.js`
- Create: `tests/engine/scorer.test.js`

- [ ] **Step 1: Write failing tests for scoring**

```js
// tests/engine/scorer.test.js
import { describe, it, expect } from 'vitest';
import { calculateScore, getStarRating, generateSuggestions } from '../src/engine/scorer.js';

describe('calculateScore', () => {
  it('returns 100% for all correct notes', () => {
    const results = [
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' }
    ];
    expect(calculateScore(results)).toBe(100);
  });

  it('returns 0% for all wrong notes', () => {
    const results = [
      { status: 'wrong' }, { status: 'miss' }, { status: 'wrong' }
    ];
    expect(calculateScore(results)).toBe(0);
  });

  it('calculates partial scores correctly', () => {
    const results = [
      { status: 'correct' }, { status: 'wrong' }, { status: 'correct' }, { status: 'miss' }
    ];
    expect(calculateScore(results)).toBe(50);
  });
});

describe('getStarRating', () => {
  it('gives 5 stars for 95%+', () => expect(getStarRating(95)).toBe(5));
  it('gives 4 stars for 80-94%', () => expect(getStarRating(85)).toBe(4));
  it('gives 3 stars for 60-79%', () => expect(getStarRating(70)).toBe(3));
  it('gives 2 stars for 40-59%', () => expect(getStarRating(50)).toBe(2));
  it('gives 1 star for below 40%', () => expect(getStarRating(20)).toBe(1));
});

describe('generateSuggestions', () => {
  it('suggests practicing missed notes', () => {
    const results = [
      { status: 'wrong', expected: { midi: 60, name: 'C4' } },
      { status: 'wrong', expected: { midi: 60, name: 'C4' } },
    ];
    const suggestions = generateSuggestions(results);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toContain('C4');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement scorer.js**

Implement:
- `calculateScore(results)` — percentage of `'correct'` out of total (excluding extras)
- `getStarRating(percentage)` — 1-5 star mapping
- `generateSuggestions(results)` — find frequently wrong notes, identify weak sections
- `createReport(comparatorState, songInfo)` — aggregate: score, stars, per-note stats, suggestions

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/engine/scorer.js tests/engine/scorer.test.js
git commit -m "feat: implement scoring engine with star ratings and suggestions"
```

---

## Task 9: Canvas Piano Keyboard (`piano-keyboard.js`)

**Files:**
- Create: `src/ui/piano-keyboard.js`
- Create: `tests/ui/piano-keyboard.test.js`

- [ ] **Step 1: Write failing tests for keyboard data model**

```js
// tests/ui/piano-keyboard.test.js
import { describe, it, expect } from 'vitest';
import { getKeyLayout, isBlackKey, getKeyColor } from '../src/ui/piano-keyboard.js';

describe('isBlackKey', () => {
  it('C is white', () => expect(isBlackKey(60)).toBe(false));
  it('C# is black', () => expect(isBlackKey(61)).toBe(true));
  it('D is white', () => expect(isBlackKey(62)).toBe(false));
  it('Eb is black', () => expect(isBlackKey(63)).toBe(true));
});

describe('getKeyLayout', () => {
  it('returns 88 keys for full piano', () => {
    const layout = getKeyLayout(21, 108); // A0 to C8
    expect(layout).toHaveLength(88);
  });
  it('each key has position and dimensions', () => {
    const layout = getKeyLayout(60, 72);
    for (const key of layout) {
      expect(key).toHaveProperty('midi');
      expect(key).toHaveProperty('x');
      expect(key).toHaveProperty('width');
      expect(key).toHaveProperty('isBlack');
    }
  });
});

describe('getKeyColor', () => {
  it('returns green for correct note', () => {
    expect(getKeyColor('correct')).toBe('#4CAF50');
  });
  it('returns red for wrong note', () => {
    expect(getKeyColor('wrong')).toBe('#F44336');
  });
  it('returns default for no status', () => {
    expect(getKeyColor(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement piano-keyboard.js**

Implement:
- `isBlackKey(midi)` — check if MIDI note is a black key
- `getKeyLayout(startMidi, endMidi)` — compute x, width, height for each key
- `getKeyColor(status)` — map comparator status to display color
- `renderKeyboard(ctx, layout, activeNotes)` — draw 88-key piano on Canvas with highlights
- Child-friendly: rounded key tops, soft shadows, larger key labels

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/ui/piano-keyboard.js tests/ui/piano-keyboard.test.js
git commit -m "feat: add Canvas piano keyboard visualization"
```

---

## Task 10: Waterfall Note Display (`waterfall.js`)

**Files:**
- Create: `src/ui/waterfall.js`
- Create: `tests/ui/waterfall.test.js`

- [ ] **Step 1: Write failing tests for waterfall data computation**

```js
// tests/ui/waterfall.test.js
import { describe, it, expect } from 'vitest';
import { computeVisibleNotes, noteToRect } from '../src/ui/waterfall.js';

describe('computeVisibleNotes', () => {
  it('filters notes within visible time window', () => {
    const notes = [
      { midi: 60, time: 0.0, duration: 0.5 },
      { midi: 64, time: 1.0, duration: 0.5 },
      { midi: 67, time: 5.0, duration: 0.5 },
    ];
    const visible = computeVisibleNotes(notes, 0.5, 3.0); // currentTime, windowSize
    expect(visible).toHaveLength(1);
    expect(visible[0].midi).toBe(64);
  });
});

describe('noteToRect', () => {
  it('maps note to canvas rectangle', () => {
    const note = { midi: 60, time: 1.0, duration: 0.5 };
    const rect = noteToRect(note, 0.5, 800, 400, 3.0);
    expect(rect).toHaveProperty('x');
    expect(rect).toHaveProperty('y');
    expect(rect).toHaveProperty('width');
    expect(rect).toHaveProperty('height');
    expect(rect.height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement waterfall.js**

Implement:
- `computeVisibleNotes(notes, currentTime, windowSize)` — filter notes in visible range
- `noteToRect(note, currentTime, canvasWidth, canvasHeight, windowSize)` — map note to pixel rect
- `renderWaterfall(ctx, notes, currentTime, keyLayout)` — draw falling notes with color coding
- Notes fall from top, colored by status (pending=blue, correct=green, wrong=red)

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/ui/waterfall.js tests/ui/waterfall.test.js
git commit -m "feat: add Canvas waterfall note display"
```

---

## Task 11: Practice Report (`report.js`)

**Files:**
- Create: `src/ui/report.js`
- Create: `tests/ui/report.test.js`

- [ ] **Step 1: Write failing tests for report rendering data**

```js
// tests/ui/report.test.js
import { describe, it, expect } from 'vitest';
import { formatReportData } from '../src/ui/report.js';

describe('formatReportData', () => {
  it('formats score report with all fields', () => {
    const report = {
      songName: '小星星',
      score: 85,
      stars: 4,
      totalNotes: 20,
      correctNotes: 17,
      wrongNotes: 2,
      missedNotes: 1,
      suggestions: ['Practice C4 more carefully'],
    };
    const formatted = formatReportData(report);
    expect(formatted.title).toContain('小星星');
    expect(formatted.scoreText).toContain('85');
    expect(formatted.starDisplay).toBe('⭐⭐⭐⭐');
    expect(formatted.suggestionItems).toHaveLength(1);
    expect(formatted.suggestionItems[0]).toContain('C4');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement report.js**

Implement:
- `formatReportData(report)` — transform report into display-ready data object
- `renderReport(container, report)` — build DOM using safe methods (createElement/textContent, no innerHTML)
- Visual: star rating display, color-coded stats, suggestion cards
- Child-friendly: encouraging language, achievement badges

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/ui/report.js tests/ui/report.test.js
git commit -m "feat: add practice report page"
```

---

## Task 12: Page Router and App Integration (`main.js`)

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`

- [ ] **Step 1: Implement page router in main.js**

Wire up all modules:
- Home page: welcome + 3 input mode buttons
- Song select page: built-in songs grid + MIDI upload
- Practice page: waterfall canvas + piano keyboard canvas + real-time stats
- Report page: practice report

```js
// src/main.js — routing logic (safe DOM construction, no innerHTML)
import { createAppState, updateState } from './app.js';
// ... import all modules

let state = createAppState();

function navigate(page, changes = {}) {
  state = updateState(state, { page, ...changes });
  render(state);
}

function render(state) {
  const app = document.getElementById('app');
  app.replaceChildren(); // clear safely
  switch (state.page) {
    case 'home': renderHome(app); break;
    case 'select': renderSongSelect(app); break;
    case 'practice': renderPractice(app, state); break;
    case 'report': renderReportPage(app, state.score); break;
  }
}
```

- [ ] **Step 2: Implement home page with 3 mode buttons**

Large, colorful buttons with icons (built with createElement, not innerHTML):
- 🎤 即時麥克風
- 🎹 MIDI 鍵盤
- 🎙️ 錄音/上傳

- [ ] **Step 3: Implement song selection page**

Grid of built-in songs + "Upload MIDI" button with file input.

- [ ] **Step 4: Wire practice page**

Connect audio input -> comparator -> waterfall + keyboard rendering loop using `requestAnimationFrame`.

- [ ] **Step 5: Wire report page**

After practice ends, generate report from comparator state and display.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
# Open http://localhost:5173 in Chrome
# Test: Home -> Select Song -> Practice -> Report flow
```

- [ ] **Step 7: Commit**

```bash
git add src/main.js index.html
git commit -m "feat: integrate all modules with page router"
```

---

## Task 13: Audio File Upload Mode

**Files:**
- Modify: `src/main.js`
- Modify: `src/audio/pitch-detector.js`

- [ ] **Step 1: Add file upload UI to song select page**

Add upload button for `.wav/.mp3` files alongside MIDI upload.

- [ ] **Step 2: Wire processAudioFile to comparator**

When audio file is uploaded:
1. Decode audio -> run YIN on frames -> extract played notes
2. Run all notes through comparator against selected song
3. Navigate to report page

- [ ] **Step 3: Manual test with a sample audio file**

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/audio/pitch-detector.js
git commit -m "feat: add audio file upload analysis mode"
```

---

## Task 14: Polish and Child-Friendly UX

**Files:**
- Modify: `src/styles/index.css`
- Modify: `src/ui/*.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add screen shake animation on wrong notes**

CSS `@keyframes shake` triggered on wrong note detection.

- [ ] **Step 2: Add encouraging messages and emoji feedback**

"做得好！" on correct streaks, "再試一次！" on mistakes.

- [ ] **Step 3: Add real-time accuracy counter during practice**

Floating percentage display that updates live.

- [ ] **Step 4: Add loading states and error handling**

- Microphone permission denied -> friendly message
- No MIDI device found -> suggest using microphone mode
- Browser doesn't support Web MIDI -> warning banner

- [ ] **Step 5: Responsive layout for tablet/desktop**

- [ ] **Step 6: Full manual E2E test of all 3 modes**

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add child-friendly UX polish and error handling"
```

---

## Summary

| Task | Component | Priority |
|------|-----------|----------|
| 1 | Project Scaffolding | P0 |
| 2 | State Management | P0 |
| 3 | YIN Pitch Detection | P0 |
| 4 | MIDI Input Handler | P0 |
| 5 | MIDI Score Parser | P0 |
| 6 | Built-in Songs | P0 |
| 7 | Note Comparator | P0 |
| 8 | Scoring Engine | P0 |
| 9 | Piano Keyboard UI | P1 |
| 10 | Waterfall Display | P1 |
| 11 | Practice Report | P1 |
| 12 | App Integration | P1 |
| 13 | Audio Upload Mode | P2 |
| 14 | UX Polish | P2 |

**Dependencies:**
- Tasks 3, 4, 5, 6 can run in parallel (independent modules)
- Task 7 depends on Tasks 3, 4, 5
- Task 8 depends on Task 7
- Tasks 9, 10 can run in parallel
- Task 12 depends on all previous tasks
- Tasks 13, 14 depend on Task 12
