import { describe, it, expect } from 'vitest';
import { noteEventsToTimeline } from '../../src/score/midi-parser.js';

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
