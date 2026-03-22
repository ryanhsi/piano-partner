// Piano note positions within an octave that are black keys
const BLACK_KEY_POSITIONS = new Set([1, 3, 6, 8, 10]);

// White key layout within an octave (semitone offsets)
const WHITE_KEY_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

/**
 * Determine if a MIDI note number is a black key.
 * @param {number} midi - MIDI note number
 * @returns {boolean}
 */
export function isBlackKey(midi) {
  return BLACK_KEY_POSITIONS.has(midi % 12);
}

/**
 * Compute layout data for each key in a MIDI range.
 * White keys are evenly spaced; black keys are narrower and overlaid between white keys.
 * @param {number} startMidi - First MIDI note (inclusive)
 * @param {number} endMidi   - Last MIDI note (inclusive)
 * @returns {Array<{midi: number, x: number, width: number, isBlack: boolean}>}
 */
export function getKeyLayout(startMidi, endMidi) {
  const WHITE_KEY_WIDTH = 24;
  const BLACK_KEY_WIDTH = 14;

  // Assign x positions to white keys first
  const whiteKeyX = new Map();
  let whiteCount = 0;

  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (!isBlackKey(midi)) {
      whiteKeyX.set(midi, whiteCount * WHITE_KEY_WIDTH);
      whiteCount++;
    }
  }

  const layout = [];

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const black = isBlackKey(midi);

    if (!black) {
      layout.push({
        midi,
        x: whiteKeyX.get(midi),
        width: WHITE_KEY_WIDTH,
        isBlack: false,
      });
    } else {
      // Position black key between its neighbouring white keys
      const prevWhite = whiteKeyX.get(midi - 1);
      const nextWhite = whiteKeyX.get(midi + 1);

      let x;
      if (prevWhite !== undefined && nextWhite !== undefined) {
        // Centre between the two adjacent white keys
        x = prevWhite + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
      } else if (prevWhite !== undefined) {
        x = prevWhite + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
      } else if (nextWhite !== undefined) {
        x = nextWhite - BLACK_KEY_WIDTH / 2;
      } else {
        x = 0;
      }

      layout.push({
        midi,
        x,
        width: BLACK_KEY_WIDTH,
        isBlack: true,
      });
    }
  }

  return layout;
}

/**
 * Return the highlight colour for a key based on its feedback status.
 * @param {'correct'|'wrong'|'miss'|null} status
 * @returns {string|null}
 */
export function getKeyColor(status) {
  switch (status) {
    case 'correct': return '#4CAF50';
    case 'wrong':   return '#F44336';
    case 'miss':    return '#FF9800';
    default:        return null;
  }
}

/**
 * Draw the piano keyboard onto a Canvas 2D context.
 * White keys are drawn first, then black keys on top.
 * Active notes are highlighted with their feedback colour.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{midi: number, x: number, width: number, isBlack: boolean}>} layout
 * @param {Map<number, 'correct'|'wrong'|'miss'>} activeNotes - midi → status
 */
export function renderKeyboard(ctx, layout, activeNotes = new Map()) {
  const WHITE_KEY_HEIGHT = 120;
  const BLACK_KEY_HEIGHT = 75;
  const CORNER_RADIUS = 4;

  // Helper: draw a rounded-bottom rectangle (flat top, rounded bottom corners)
  function drawKey(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  const whiteKeys = layout.filter(k => !k.isBlack);
  const blackKeys = layout.filter(k => k.isBlack);

  // --- Draw white keys ---
  for (const key of whiteKeys) {
    const status = activeNotes.get(key.midi) ?? null;
    const highlight = getKeyColor(status);

    // Soft shadow for depth
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    drawKey(key.x + 1, 0, key.width - 2, WHITE_KEY_HEIGHT, CORNER_RADIUS);

    ctx.fillStyle = highlight ?? '#FFFFFF';
    ctx.fill();

    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // --- Draw black keys (on top) ---
  for (const key of blackKeys) {
    const status = activeNotes.get(key.midi) ?? null;
    const highlight = getKeyColor(status);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    drawKey(key.x, 0, key.width, BLACK_KEY_HEIGHT, CORNER_RADIUS);

    ctx.fillStyle = highlight ?? '#222222';
    ctx.fill();

    ctx.restore();
  }
}
