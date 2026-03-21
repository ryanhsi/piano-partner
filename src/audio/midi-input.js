/**
 * Parses a raw MIDI message byte array into a structured note event.
 *
 * @param {number[]} data - Raw MIDI bytes [status, note, velocity]
 * @returns {{ type: 'noteOn'|'noteOff', note: number, velocity: number } | null}
 */
export function parseMidiMessage(data) {
  const status = data[0] & 0xF0;
  const note = data[1];
  const velocity = data[2];

  if (status === 0x90 && velocity > 0) {
    return { type: 'noteOn', note, velocity };
  }
  if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    return { type: 'noteOff', note, velocity };
  }
  return null;
}

/**
 * Initialises Web MIDI API and attaches a note-event listener to all inputs.
 * Browser-only; not unit-testable without mocking navigator.
 *
 * @param {(event: { type: string, note: number, velocity: number }) => void} onNoteEvent
 * @returns {Promise<{ access: MIDIAccess, inputs: MIDIInput[] }>}
 */
export async function initMidi(onNoteEvent) {
  if (!navigator.requestMIDIAccess) {
    throw new Error('Web MIDI API not supported');
  }
  const access = await navigator.requestMIDIAccess();
  const inputs = Array.from(access.inputs.values());
  for (const input of inputs) {
    input.onmidimessage = (event) => {
      const parsed = parseMidiMessage(Array.from(event.data));
      if (parsed) onNoteEvent(parsed);
    };
  }
  return { access, inputs };
}
