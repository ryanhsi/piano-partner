import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getStarRating,
  generateSuggestions,
  createReport,
} from '../../src/engine/scorer.js';

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

  it('returns 0 for empty results', () => {
    expect(calculateScore([])).toBe(0);
  });
});

describe('getStarRating', () => {
  it('gives 5 stars for 95%+', () => expect(getStarRating(95)).toBe(5));
  it('gives 5 stars for 100%', () => expect(getStarRating(100)).toBe(5));
  it('gives 4 stars for 80-94%', () => expect(getStarRating(85)).toBe(4));
  it('gives 4 stars for 80%', () => expect(getStarRating(80)).toBe(4));
  it('gives 3 stars for 60-79%', () => expect(getStarRating(70)).toBe(3));
  it('gives 3 stars for 60%', () => expect(getStarRating(60)).toBe(3));
  it('gives 2 stars for 40-59%', () => expect(getStarRating(50)).toBe(2));
  it('gives 2 stars for 40%', () => expect(getStarRating(40)).toBe(2));
  it('gives 1 star for below 40%', () => expect(getStarRating(20)).toBe(1));
  it('gives 1 star for 0%', () => expect(getStarRating(0)).toBe(1));
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

  it('returns an empty array when all notes are correct', () => {
    const results = [
      { status: 'correct', expected: { midi: 60, name: 'C4' } },
      { status: 'correct', expected: { midi: 62, name: 'D4' } },
    ];
    const suggestions = generateSuggestions(results);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBe(0);
  });

  it('returns an array even for empty results', () => {
    const suggestions = generateSuggestions([]);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('lists the most frequently missed note first', () => {
    const results = [
      { status: 'wrong', expected: { midi: 64, name: 'E4' } },
      { status: 'wrong', expected: { midi: 60, name: 'C4' } },
      { status: 'wrong', expected: { midi: 60, name: 'C4' } },
      { status: 'wrong', expected: { midi: 60, name: 'C4' } },
    ];
    const suggestions = generateSuggestions(results);
    expect(suggestions[0]).toContain('C4');
  });
});

describe('createReport', () => {
  it('aggregates state into a full report', () => {
    const state = {
      results: [
        { status: 'correct', expected: { midi: 60, name: 'C4' }, played: { midi: 60 } },
        { status: 'wrong', expected: { midi: 62, name: 'D4' }, played: { midi: 63 } },
        { status: 'miss', expected: { midi: 64, name: 'E4' }, played: null },
      ],
      extras: [],
    };
    const songInfo = { name: 'Twinkle Twinkle' };

    const report = createReport(state, songInfo);

    expect(report.songName).toBe('Twinkle Twinkle');
    expect(report.score).toBeCloseTo(33.33, 1);
    expect(report.stars).toBe(1);
    expect(report.totalNotes).toBe(3);
    expect(report.correctNotes).toBe(1);
    expect(report.wrongNotes).toBe(1);
    expect(report.missedNotes).toBe(1);
    expect(Array.isArray(report.suggestions)).toBe(true);
  });

  it('returns a report with 5 stars when all notes are correct', () => {
    const state = {
      results: [
        { status: 'correct', expected: { midi: 60, name: 'C4' }, played: { midi: 60 } },
        { status: 'correct', expected: { midi: 62, name: 'D4' }, played: { midi: 62 } },
      ],
      extras: [],
    };
    const songInfo = { name: 'Test Song' };

    const report = createReport(state, songInfo);

    expect(report.score).toBe(100);
    expect(report.stars).toBe(5);
    expect(report.suggestions.length).toBe(0);
  });
});
