import { Midi } from '@tonejs/midi';

/**
 * Parses a MIDI ArrayBuffer into a structured score object.
 * @param {ArrayBuffer} arrayBuffer - Raw MIDI file bytes
 * @returns {{ name: string, bpm: number, duration: number, notes: NoteEvent[] }}
 */
export function parseMidiScore(arrayBuffer) {
  const midi = new Midi(arrayBuffer);
  const track = midi.tracks[0];
  const notes = track.notes.map(n => ({
    midi: n.midi,
    time: n.time,
    duration: n.duration,
    velocity: n.velocity,
    name: n.name,
  }));
  return {
    name: midi.name || 'Untitled',
    bpm: midi.header.tempos[0]?.bpm ?? 120,
    duration: midi.duration,
    notes: noteEventsToTimeline(notes),
  };
}

/**
 * Sorts an array of note events by ascending time, returning a new array.
 * @param {Array<{ midi: number, time: number, duration: number, velocity: number }>} events
 * @returns {Array<{ midi: number, time: number, duration: number, velocity: number }>}
 */
export function noteEventsToTimeline(events) {
  return [...events].sort((a, b) => a.time - b.time);
}
