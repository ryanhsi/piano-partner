import { describe, it, expect } from 'vitest';
import { getKeyLayout, isBlackKey, getKeyColor } from '../../src/ui/piano-keyboard.js';

describe('isBlackKey', () => {
  it('C is white', () => expect(isBlackKey(60)).toBe(false));
  it('C# is black', () => expect(isBlackKey(61)).toBe(true));
  it('D is white', () => expect(isBlackKey(62)).toBe(false));
  it('Eb is black', () => expect(isBlackKey(63)).toBe(true));
});

describe('getKeyLayout', () => {
  it('returns 88 keys for full piano', () => {
    const layout = getKeyLayout(21, 108);
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
