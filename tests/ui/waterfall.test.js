import { describe, it, expect } from 'vitest';
import { computeVisibleNotes, noteToRect } from '../../src/ui/waterfall.js';

describe('computeVisibleNotes', () => {
  it('filters notes within visible time window', () => {
    const notes = [
      { midi: 60, time: 0.0, duration: 0.5 },
      { midi: 64, time: 1.0, duration: 0.5 },
      { midi: 67, time: 5.0, duration: 0.5 },
    ];
    const visible = computeVisibleNotes(notes, 0.5, 3.0);
    expect(visible).toHaveLength(1);
    expect(visible[0].midi).toBe(64);
  });

  it('includes notes at the start boundary (currentTime)', () => {
    const notes = [
      { midi: 60, time: 1.0, duration: 0.5 },
      { midi: 64, time: 2.0, duration: 0.5 },
    ];
    const visible = computeVisibleNotes(notes, 1.0, 2.0);
    expect(visible).toHaveLength(2);
  });

  it('includes notes at the end boundary (currentTime + windowSize)', () => {
    const notes = [
      { midi: 60, time: 3.0, duration: 0.5 },
    ];
    const visible = computeVisibleNotes(notes, 1.0, 2.0);
    expect(visible).toHaveLength(1);
  });

  it('returns empty array when no notes fall in window', () => {
    const notes = [
      { midi: 60, time: 10.0, duration: 0.5 },
    ];
    const visible = computeVisibleNotes(notes, 0.0, 2.0);
    expect(visible).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const visible = computeVisibleNotes([], 0.0, 5.0);
    expect(visible).toHaveLength(0);
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

  it('places note closer to bottom when time is near currentTime', () => {
    const noteClose = { midi: 60, time: 1.0, duration: 0.5 };
    const noteFar   = { midi: 60, time: 3.0, duration: 0.5 };
    const rectClose = noteToRect(noteClose, 1.0, 800, 400, 3.0);
    const rectFar   = noteToRect(noteFar,   1.0, 800, 400, 3.0);
    // A note at currentTime should be at the bottom (larger y)
    expect(rectClose.y).toBeGreaterThanOrEqual(rectFar.y);
  });

  it('height scales with note duration', () => {
    const shortNote = { midi: 60, time: 1.0, duration: 0.25 };
    const longNote  = { midi: 60, time: 1.0, duration: 1.0 };
    const rectShort = noteToRect(shortNote, 0.5, 800, 400, 3.0);
    const rectLong  = noteToRect(longNote,  0.5, 800, 400, 3.0);
    expect(rectLong.height).toBeGreaterThan(rectShort.height);
  });

  it('returns finite numeric coordinates', () => {
    const note = { midi: 72, time: 2.0, duration: 0.5 };
    const rect = noteToRect(note, 0.0, 1024, 600, 5.0);
    expect(Number.isFinite(rect.x)).toBe(true);
    expect(Number.isFinite(rect.y)).toBe(true);
    expect(Number.isFinite(rect.width)).toBe(true);
    expect(Number.isFinite(rect.height)).toBe(true);
  });
});
