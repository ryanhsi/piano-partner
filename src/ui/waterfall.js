/**
 * Waterfall Note Display
 *
 * Upcoming notes fall from the top of the canvas toward the piano keyboard at the
 * bottom. Children should play each note when the falling rectangle reaches the
 * keyboard.
 *
 * Colour scheme (child-friendly):
 *   pending → blue  (#4D96FF)
 *   correct → green (#4CAF50)
 *   wrong   → red   (#F44336)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_PENDING = '#4D96FF';
const COLOR_CORRECT = '#4CAF50';
const COLOR_WRONG   = '#F44336';
const CORNER_RADIUS = 6;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Filter notes whose start time falls within the visible time window
 * [currentTime, currentTime + windowSize].
 *
 * @param {Array<{midi: number, time: number, duration: number}>} notes
 * @param {number} currentTime - playback position in seconds
 * @param {number} windowSize  - how many seconds ahead are shown
 * @returns {Array<{midi: number, time: number, duration: number}>}
 */
export function computeVisibleNotes(notes, currentTime, windowSize) {
  const windowEnd = currentTime + windowSize;
  return notes.filter(note => note.time >= currentTime && note.time <= windowEnd);
}

/**
 * Map a note to pixel coordinates on the waterfall canvas.
 *
 * The canvas is oriented so that:
 *   - Y = 0       is the top  (furthest future notes)
 *   - Y = canvasHeight is the bottom (the piano keyboard / "now")
 *
 * X is derived from the note's MIDI number mapped linearly to canvas width.
 * Width is a fixed fraction of canvasWidth proportional to 1/88 keys.
 *
 * @param {{midi: number, time: number, duration: number}} note
 * @param {number} currentTime   - playback position in seconds
 * @param {number} canvasWidth   - canvas width in pixels
 * @param {number} canvasHeight  - canvas height in pixels
 * @param {number} windowSize    - visible time window in seconds
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function noteToRect(note, currentTime, canvasWidth, canvasHeight, windowSize) {
  // --- Horizontal: map MIDI 21–108 (88 keys) to canvas width ---
  const MIDI_MIN  = 21;
  const MIDI_MAX  = 108;
  const midiRange = MIDI_MAX - MIDI_MIN;

  const keyFraction = (note.midi - MIDI_MIN) / midiRange;
  const noteWidth   = canvasWidth / midiRange;
  const x           = keyFraction * canvasWidth;

  // --- Vertical: time → y ---
  // timeOffset = 0  → note is at currentTime  → bottom of canvas (y = canvasHeight)
  // timeOffset = windowSize → note is at far future → top of canvas (y = 0)
  const timeOffset  = note.time - currentTime;
  const yFraction   = timeOffset / windowSize;          // 0 (now) … 1 (future)
  const y           = (1 - yFraction) * canvasHeight;   // invert: 0=top, H=bottom

  // Height proportional to duration relative to window
  const height = Math.max(4, (note.duration / windowSize) * canvasHeight);

  return { x, y, width: noteWidth, height };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Draw a rectangle with fully rounded corners onto the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Resolve the fill colour for a note based on its comparison status.
 *
 * @param {'pending'|'correct'|'wrong'|undefined} status
 * @returns {string}
 */
function noteColor(status) {
  switch (status) {
    case 'correct': return COLOR_CORRECT;
    case 'wrong':   return COLOR_WRONG;
    default:        return COLOR_PENDING;
  }
}

/**
 * Render the waterfall of upcoming notes onto a Canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{midi: number, time: number, duration: number, status?: string}>} notes
 *   Full note list (may be pre-filtered or unfiltered).
 * @param {number} currentTime  - current playback position in seconds
 * @param {number} windowSize   - seconds of future notes displayed
 * @param {number} canvasWidth  - canvas pixel width
 * @param {number} canvasHeight - canvas pixel height
 */
export function renderWaterfall(ctx, notes, currentTime, windowSize, canvasWidth, canvasHeight) {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const visible = computeVisibleNotes(notes, currentTime, windowSize);

  for (const note of visible) {
    const { x, y, width, height } = noteToRect(
      note,
      currentTime,
      canvasWidth,
      canvasHeight,
      windowSize,
    );

    const color = noteColor(note.status);

    ctx.save();
    ctx.fillStyle = color;

    // Subtle shadow for depth / child-friendly look
    ctx.shadowColor   = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur    = 4;
    ctx.shadowOffsetY = 2;

    drawRoundRect(ctx, x, y - height, width, height, CORNER_RADIUS);
    ctx.fill();

    ctx.restore();
  }
}
