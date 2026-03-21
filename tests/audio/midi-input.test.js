import { describe, it, expect } from 'vitest';
import { parseMidiMessage } from '../../src/audio/midi-input.js';

describe('parseMidiMessage', () => {
  it('parses note-on message', () => {
    const result = parseMidiMessage([0x90, 60, 100]);
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
    const result = parseMidiMessage([0xB0, 64, 127]);
    expect(result).toBeNull();
  });
});
