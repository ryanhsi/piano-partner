/**
 * Practice Report UI module.
 * Provides data formatting and safe DOM rendering for the post-session report page.
 * All DOM construction uses safe methods only — no innerHTML.
 */

// Star emoji used for visual rating display
const STAR_EMOJI = '⭐';

// Encouraging messages keyed by star rating (child-friendly)
const ENCOURAGEMENT_BY_STARS = {
  0: '繼續努力！每次練習都讓你進步！',
  1: '加油！你已經很棒了，繼續練習吧！',
  2: '做得不錯！Keep going, you\'re improving!',
  3: 'Great job! 再練習幾次就能更完美！',
  4: 'Well done! 你彈得很好，太棒了！',
  5: '太棒了！完美的演出！You\'re amazing! 🎉',
};

/**
 * Transform a raw practice report into display-ready data.
 *
 * @param {{
 *   songName: string,
 *   score: number,
 *   stars: number,
 *   totalNotes: number,
 *   correctNotes: number,
 *   wrongNotes: number,
 *   missedNotes: number,
 *   suggestions: string[],
 * }} report
 * @returns {{
 *   title: string,
 *   scoreText: string,
 *   starDisplay: string,
 *   encouragement: string,
 *   stats: { total: number, correct: number, wrong: number, missed: number },
 *   suggestionItems: string[],
 * }}
 */
export function formatReportData(report) {
  const {
    songName,
    score,
    stars,
    totalNotes,
    correctNotes,
    wrongNotes,
    missedNotes,
    suggestions,
  } = report;

  const clampedStars = Math.max(0, Math.min(5, Math.floor(stars)));

  return {
    title: `🎵 ${songName} — 練習報告`,
    scoreText: `得分：${score} 分`,
    starDisplay: STAR_EMOJI.repeat(clampedStars),
    encouragement: ENCOURAGEMENT_BY_STARS[clampedStars] ?? ENCOURAGEMENT_BY_STARS[0],
    stats: {
      total: totalNotes,
      correct: correctNotes,
      wrong: wrongNotes,
      missed: missedNotes,
    },
    suggestionItems: [...suggestions],
  };
}

// ─── Safe DOM helpers ────────────────────────────────────────────────────────

/**
 * Create an element with optional CSS class and text content.
 * Uses only safe DOM APIs — no innerHTML.
 *
 * @param {string} tag
 * @param {{ className?: string, textContent?: string }} [opts]
 * @returns {HTMLElement}
 */
function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.textContent !== undefined) node.textContent = opts.textContent;
  return node;
}

// ─── Render helpers ──────────────────────────────────────────────────────────

/**
 * Build the stats section showing correct / wrong / missed counts.
 *
 * @param {{ total: number, correct: number, wrong: number, missed: number }} stats
 * @returns {HTMLElement}
 */
function buildStatsSection(stats) {
  const section = el('section', { className: 'report-stats' });
  const heading = el('h3', { textContent: '音符統計' });
  section.appendChild(heading);

  const list = el('ul', { className: 'report-stats__list' });

  const rows = [
    { label: '總音符', value: stats.total, className: 'stat-total' },
    { label: '正確 ✅', value: stats.correct, className: 'stat-correct' },
    { label: '錯誤 ❌', value: stats.wrong, className: 'stat-wrong' },
    { label: '遺漏 ⏭️', value: stats.missed, className: 'stat-missed' },
  ];

  for (const row of rows) {
    const item = el('li', { className: `report-stats__item ${row.className}` });
    const labelSpan = el('span', { className: 'stat-label', textContent: row.label });
    const valueSpan = el('span', { className: 'stat-value', textContent: String(row.value) });
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

/**
 * Build the suggestions section showing one card per suggestion.
 *
 * @param {string[]} suggestionItems
 * @returns {HTMLElement}
 */
function buildSuggestionsSection(suggestionItems) {
  const section = el('section', { className: 'report-suggestions' });
  const heading = el('h3', { textContent: '練習建議' });
  section.appendChild(heading);

  if (suggestionItems.length === 0) {
    const none = el('p', { className: 'report-suggestions__empty', textContent: '太棒了！沒有特別需要改進的地方！' });
    section.appendChild(none);
    return section;
  }

  const list = el('ul', { className: 'report-suggestions__list' });

  for (const suggestion of suggestionItems) {
    const card = el('li', { className: 'report-suggestions__card', textContent: suggestion });
    list.appendChild(card);
  }

  section.appendChild(list);
  return section;
}

/**
 * Render a complete practice report into a container element.
 * Uses only safe DOM construction methods — no innerHTML.
 *
 * @param {HTMLElement} container - Target element to render into
 * @param {{
 *   songName: string,
 *   score: number,
 *   stars: number,
 *   totalNotes: number,
 *   correctNotes: number,
 *   wrongNotes: number,
 *   missedNotes: number,
 *   suggestions: string[],
 * }} report
 */
export function renderReport(container, report) {
  const data = formatReportData(report);

  // Clear existing content safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const wrapper = el('article', { className: 'practice-report' });

  // ── Header ───────────────────────────────────────────────────────────────
  const header = el('header', { className: 'report-header' });

  const title = el('h1', { className: 'report-header__title', textContent: data.title });
  header.appendChild(title);

  const starRow = el('div', { className: 'report-header__stars', textContent: data.starDisplay });
  header.appendChild(starRow);

  const scoreEl = el('p', { className: 'report-header__score', textContent: data.scoreText });
  header.appendChild(scoreEl);

  const encouragement = el('p', { className: 'report-header__encouragement', textContent: data.encouragement });
  header.appendChild(encouragement);

  wrapper.appendChild(header);

  // ── Stats ─────────────────────────────────────────────────────────────────
  wrapper.appendChild(buildStatsSection(data.stats));

  // ── Suggestions ──────────────────────────────────────────────────────────
  wrapper.appendChild(buildSuggestionsSection(data.suggestionItems));

  container.appendChild(wrapper);
}
