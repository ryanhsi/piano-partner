import { describe, it, expect, beforeEach } from 'vitest';
import { formatReportData, renderReport } from '../../src/ui/report.js';

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

  it('formats stats correctly', () => {
    const report = {
      songName: 'Twinkle',
      score: 70,
      stars: 3,
      totalNotes: 10,
      correctNotes: 7,
      wrongNotes: 2,
      missedNotes: 1,
      suggestions: [],
    };
    const formatted = formatReportData(report);
    expect(formatted.stats.total).toBe(10);
    expect(formatted.stats.correct).toBe(7);
    expect(formatted.stats.wrong).toBe(2);
    expect(formatted.stats.missed).toBe(1);
  });

  it('shows 5 stars for perfect score', () => {
    const report = {
      songName: 'Song',
      score: 100,
      stars: 5,
      totalNotes: 5,
      correctNotes: 5,
      wrongNotes: 0,
      missedNotes: 0,
      suggestions: [],
    };
    const formatted = formatReportData(report);
    expect(formatted.starDisplay).toBe('⭐⭐⭐⭐⭐');
  });

  it('shows 0 stars for very low score', () => {
    const report = {
      songName: 'Song',
      score: 10,
      stars: 0,
      totalNotes: 10,
      correctNotes: 1,
      wrongNotes: 5,
      missedNotes: 4,
      suggestions: ['Keep practicing!'],
    };
    const formatted = formatReportData(report);
    expect(formatted.starDisplay).toBe('');
  });

  it('formats multiple suggestions', () => {
    const report = {
      songName: 'Song',
      score: 60,
      stars: 2,
      totalNotes: 10,
      correctNotes: 6,
      wrongNotes: 3,
      missedNotes: 1,
      suggestions: ['Practice left hand', 'Slow down tempo'],
    };
    const formatted = formatReportData(report);
    expect(formatted.suggestionItems).toHaveLength(2);
    expect(formatted.suggestionItems[1]).toContain('tempo');
  });
});

describe('renderReport', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders without throwing', () => {
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
    expect(() => renderReport(container, report)).not.toThrow();
  });

  it('renders song name in title', () => {
    const report = {
      songName: '小星星',
      score: 85,
      stars: 4,
      totalNotes: 20,
      correctNotes: 17,
      wrongNotes: 2,
      missedNotes: 1,
      suggestions: [],
    };
    renderReport(container, report);
    expect(container.textContent).toContain('小星星');
  });

  it('renders score text', () => {
    const report = {
      songName: 'Song',
      score: 92,
      stars: 5,
      totalNotes: 10,
      correctNotes: 10,
      wrongNotes: 0,
      missedNotes: 0,
      suggestions: [],
    };
    renderReport(container, report);
    expect(container.textContent).toContain('92');
  });

  it('renders star display', () => {
    const report = {
      songName: 'Song',
      score: 80,
      stars: 3,
      totalNotes: 10,
      correctNotes: 8,
      wrongNotes: 1,
      missedNotes: 1,
      suggestions: [],
    };
    renderReport(container, report);
    expect(container.textContent).toContain('⭐');
  });

  it('renders suggestion cards', () => {
    const report = {
      songName: 'Song',
      score: 60,
      stars: 2,
      totalNotes: 10,
      correctNotes: 6,
      wrongNotes: 3,
      missedNotes: 1,
      suggestions: ['Work on timing', 'Practice slowly'],
    };
    renderReport(container, report);
    expect(container.textContent).toContain('Work on timing');
    expect(container.textContent).toContain('Practice slowly');
  });

  it('does not use innerHTML (DOM safety)', () => {
    // Inject an XSS payload as song name; it must appear as text, not parsed HTML
    const report = {
      songName: '<img src=x onerror=alert(1)>',
      score: 50,
      stars: 2,
      totalNotes: 5,
      correctNotes: 3,
      wrongNotes: 1,
      missedNotes: 1,
      suggestions: ['<script>alert(1)</script>'],
    };
    renderReport(container, report);
    // The img element must NOT have been created in the DOM
    expect(container.querySelector('img')).toBeNull();
    // The script element must NOT have been created
    expect(container.querySelector('script')).toBeNull();
    // The raw text should be present as a string
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders encouraging message for children', () => {
    const report = {
      songName: 'Song',
      score: 75,
      stars: 3,
      totalNotes: 10,
      correctNotes: 7,
      wrongNotes: 2,
      missedNotes: 1,
      suggestions: [],
    };
    renderReport(container, report);
    // Should contain some encouraging/positive language
    const text = container.textContent.toLowerCase();
    const hasEncouragement =
      text.includes('great') ||
      text.includes('good') ||
      text.includes('well done') ||
      text.includes('nice') ||
      text.includes('keep') ||
      text.includes('棒') ||
      text.includes('加油') ||
      text.includes('太棒') ||
      text.includes('努力');
    expect(hasEncouragement).toBe(true);
  });
});
