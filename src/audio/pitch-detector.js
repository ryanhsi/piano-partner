/**
 * YIN Pitch Detection Algorithm
 * Reference: de Cheveigné & Kawahara (2002). YIN, a fundamental frequency estimator.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const YIN_THRESHOLD = 0.15;
const MIN_FREQUENCY = 20; // Hz — below this treat as silence

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 * Returns -1 for non-positive frequencies.
 *
 * @param {number} freq - Frequency in Hz
 * @returns {number} MIDI note number (0–127) or -1
 */
export function frequencyToMidi(freq) {
  if (freq <= 0) return -1;
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

/**
 * Convert a MIDI note number to a human-readable note name (e.g. "C4", "A#3").
 *
 * @param {number} midi - MIDI note number (0–127)
 * @returns {string} Note name with octave
 */
export function midiToNoteName(midi) {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// ---------------------------------------------------------------------------
// YIN algorithm internals
// ---------------------------------------------------------------------------

/**
 * Step 2 of YIN: compute the difference function d(τ).
 * d(τ) = Σ (x[j] - x[j+τ])²  for j = 0..W-1
 *
 * @param {Float32Array} buffer
 * @returns {Float32Array} difference function (half-length of buffer)
 */
function differenceFunction(buffer) {
  const halfLength = Math.floor(buffer.length / 2);
  const diff = new Float32Array(halfLength);

  for (let tau = 0; tau < halfLength; tau++) {
    let sum = 0;
    for (let j = 0; j < halfLength; j++) {
      const delta = buffer[j] - buffer[j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  return diff;
}

/**
 * Step 3 of YIN: cumulative mean normalised difference function (CMNDF).
 * d'(τ) = 1              for τ = 0
 * d'(τ) = d(τ) / [(1/τ) Σ_{j=1}^{τ} d(j)]   for τ > 0
 *
 * @param {Float32Array} diff - Output of differenceFunction
 * @returns {Float32Array} CMNDF
 */
function cumulativeMeanNormalisedDifference(diff) {
  const cmndf = new Float32Array(diff.length);
  cmndf[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau < diff.length; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  return cmndf;
}

/**
 * Step 4 of YIN: find the first τ below the absolute threshold.
 * Prefer the deepest local minimum if multiple candidates exist below the
 * threshold.
 *
 * @param {Float32Array} cmndf
 * @param {number} threshold
 * @returns {number} τ index or -1 if not found
 */
function absoluteThreshold(cmndf, threshold) {
  // Start at tau = 2 to avoid trivial solution at 0
  for (let tau = 2; tau < cmndf.length; tau++) {
    if (cmndf[tau] < threshold) {
      // Walk to the local minimum
      while (tau + 1 < cmndf.length && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      return tau;
    }
  }
  return -1;
}

/**
 * Step 5 of YIN: parabolic interpolation around the detected τ to refine
 * the period estimate to sub-sample accuracy.
 *
 * @param {Float32Array} cmndf
 * @param {number} tau - Integer τ estimate
 * @returns {number} Refined τ (floating-point)
 */
function parabolicInterpolation(cmndf, tau) {
  const prev = tau > 0 ? tau - 1 : tau;
  const next = tau + 1 < cmndf.length ? tau + 1 : tau;

  if (prev === tau) return tau;

  const denominator = 2 * (cmndf[prev] - 2 * cmndf[tau] + cmndf[next]);
  if (denominator === 0) return tau;

  const delta = (cmndf[prev] - cmndf[next]) / denominator;
  return tau + delta;
}

// ---------------------------------------------------------------------------
// Public pitch detection API
// ---------------------------------------------------------------------------

/**
 * Detect the fundamental frequency of an audio buffer using the YIN algorithm.
 *
 * @param {Float32Array} buffer - Mono audio samples
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Detected frequency in Hz, or -1 if no pitch detected
 */
export function detectPitch(buffer, sampleRate) {
  // Silence detection: check RMS energy
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 1e-6) return -1;

  const diff = differenceFunction(buffer);
  const cmndf = cumulativeMeanNormalisedDifference(diff);
  const tau = absoluteThreshold(cmndf, YIN_THRESHOLD);

  if (tau === -1) return -1;

  const refinedTau = parabolicInterpolation(cmndf, tau);
  const frequency = sampleRate / refinedTau;

  return frequency >= MIN_FREQUENCY ? frequency : -1;
}

// ---------------------------------------------------------------------------
// Browser-only helpers (not unit tested)
// ---------------------------------------------------------------------------

/**
 * Initialise microphone input via the Web Audio API.
 * Returns an object containing the AudioContext and AnalyserNode.
 *
 * @returns {Promise<{audioContext: AudioContext, analyser: AnalyserNode, stream: MediaStream}>}
 */
export async function initMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  return { audioContext, analyser, stream };
}

/**
 * Decode an audio file and run YIN pitch detection on every frame.
 *
 * @param {File} file - Audio file selected by the user
 * @param {number} [frameSize=2048] - Samples per analysis frame
 * @param {number} [hopSize=1024] - Samples between frames
 * @returns {Promise<Array<{time: number, frequency: number}>>} Detected pitches with timestamps
 */
export async function processAudioFile(file, frameSize = 2048, hopSize = 1024) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // mono (left channel)

  const results = [];
  for (let offset = 0; offset + frameSize <= channelData.length; offset += hopSize) {
    const frame = channelData.slice(offset, offset + frameSize);
    const frequency = detectPitch(frame, sampleRate);
    results.push({ time: offset / sampleRate, frequency });
  }

  await audioContext.close();
  return results;
}
