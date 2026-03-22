import { describe, it, expect } from 'vitest';
import { getBuiltInSongs, getSongById } from '../../src/score/built-in-songs.js';

describe('Built-in Songs', () => {
  it('returns at least 2 built-in songs', () => {
    const songs = getBuiltInSongs();
    expect(songs.length).toBeGreaterThanOrEqual(2);
  });

  it('each song has required fields', () => {
    const songs = getBuiltInSongs();
    for (const song of songs) {
      expect(song).toHaveProperty('id');
      expect(song).toHaveProperty('name');
      expect(song).toHaveProperty('bpm');
      expect(song).toHaveProperty('notes');
      expect(song.notes.length).toBeGreaterThan(0);
    }
  });

  it('finds song by id', () => {
    const song = getSongById('twinkle');
    expect(song).not.toBeNull();
    expect(song.name).toContain('小星星');
  });

  it('returns null for unknown id', () => {
    expect(getSongById('nonexistent')).toBeNull();
  });
});
