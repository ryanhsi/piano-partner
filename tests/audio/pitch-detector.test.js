import { describe, it, expect } from 'vitest';
import { frequencyToMidi, midiToNoteName, detectPitch } from '../../src/audio/pitch-detector.js';

describe('frequencyToMidi', () => {
  it('converts A4 (440Hz) to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });
  it('converts C4 (261.63Hz) to MIDI 60', () => {
    expect(frequencyToMidi(261.63)).toBe(60);
  });
  it('returns -1 for frequency below audible range', () => {
    expect(frequencyToMidi(0)).toBe(-1);
    expect(frequencyToMidi(-10)).toBe(-1);
  });
});

describe('midiToNoteName', () => {
  it('converts MIDI 60 to C4', () => {
    expect(midiToNoteName(60)).toBe('C4');
  });
  it('converts MIDI 69 to A4', () => {
    expect(midiToNoteName(69)).toBe('A4');
  });
  it('handles sharps correctly', () => {
    expect(midiToNoteName(61)).toBe('C#4');
  });
});

describe('detectPitch (YIN)', () => {
  it('detects pitch from a pure sine wave buffer', () => {
    const sampleRate = 44100;
    const freq = 440;
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    const detected = detectPitch(buffer, sampleRate);
    expect(detected).toBeGreaterThan(435);
    expect(detected).toBeLessThan(445);
  });

  it('returns -1 for silence', () => {
    const buffer = new Float32Array(2048).fill(0);
    expect(detectPitch(buffer, 44100)).toBe(-1);
  });
});
