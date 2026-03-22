import { describe, it, expect } from 'vitest';
import { compareNote, createComparatorState, processPlayedNote } from '../../src/engine/comparator.js';

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
