import { describe, it, expect } from 'vitest';
import { createAppState, updateState } from '../src/app.js';

describe('App State', () => {
  it('creates initial state with default values', () => {
    const state = createAppState();
    expect(state.mode).toBe(null);
    expect(state.currentSong).toBe(null);
    expect(state.isPlaying).toBe(false);
    expect(state.playedNotes).toEqual([]);
    expect(state.score).toBe(null);
  });

  it('returns new state object on update (immutable)', () => {
    const state = createAppState();
    const newState = updateState(state, { mode: 'mic' });
    expect(newState).not.toBe(state);
    expect(newState.mode).toBe('mic');
    expect(state.mode).toBe(null);
  });

  it('preserves unmodified fields on update', () => {
    const state = createAppState();
    const newState = updateState(state, { isPlaying: true });
    expect(newState.mode).toBe(null);
    expect(newState.isPlaying).toBe(true);
  });
});
