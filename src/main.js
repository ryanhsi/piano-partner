/**
 * Piano Partner — Main Entry Point
 * Page router and full app integration.
 *
 * Pages: home → select → practice → report
 * All DOM construction uses safe methods only (createElement, textContent, appendChild).
 * All state updates are immutable via updateState().
 */

import { createAppState, updateState } from './app.js';
import { initMicrophone, detectPitch, frequencyToMidi, processAudioFile } from './audio/pitch-detector.js';
import { initMidi } from './audio/midi-input.js';
import { parseMidiScore } from './score/midi-parser.js';
import { getBuiltInSongs } from './score/built-in-songs.js';
import { createComparatorState, processPlayedNote } from './engine/comparator.js';
import { createReport } from './engine/scorer.js';
import { getKeyLayout, renderKeyboard } from './ui/piano-keyboard.js';
import { renderWaterfall } from './ui/waterfall.js';
import { renderReport } from './ui/report.js';

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

let state = createAppState();

// Mutable practice session resources (cleaned up on leave)
const session = {
  audioContext: null,
  analyser: null,
  stream: null,
  midiAccess: null,
  midiInputs: [],
  rafId: null,
  startTime: null,
  comparatorState: null,
  song: null,
  activeNotes: new Map(), // midi → status
  // Upload mode resources
  mediaRecorder: null,
  recordedChunks: [],
};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function navigate(page, changes = {}) {
  state = updateState(state, { page, ...changes });
  render(state);
}

function render(currentState) {
  const app = document.getElementById('app');
  app.replaceChildren();
  switch (currentState.page) {
    case 'home':
      renderHome(app);
      break;
    case 'select':
      renderSongSelect(app, currentState);
      break;
    case 'practice':
      renderPractice(app, currentState);
      break;
    case 'report':
      renderReportPage(app, currentState);
      break;
    default:
      renderHome(app);
  }
}

// ---------------------------------------------------------------------------
// Helper: safe element creation
// ---------------------------------------------------------------------------

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.textContent !== undefined) node.textContent = opts.textContent;
  if (opts.id) node.id = opts.id;
  return node;
}

// ---------------------------------------------------------------------------
// Page: Home
// ---------------------------------------------------------------------------

function renderHome(container) {
  const page = el('div', { className: 'page page--home' });

  const heading = el('h1', { className: 'home__title', textContent: 'Piano Partner 🎹' });
  page.appendChild(heading);

  const subtitle = el('p', { className: 'home__subtitle', textContent: '選擇你的練習方式' });
  page.appendChild(subtitle);

  const modeGrid = el('div', { className: 'home__mode-grid' });

  const modes = [
    { emoji: '🎤', label: '即時麥克風', mode: 'mic' },
    { emoji: '🎹', label: 'MIDI 鍵盤', mode: 'midi' },
    { emoji: '🎙️', label: '錄音/上傳', mode: 'upload' },
  ];

  for (const { emoji, label, mode } of modes) {
    const btn = el('button', { className: 'mode-btn' });

    const iconEl = el('span', { className: 'mode-btn__icon', textContent: emoji });
    const labelEl = el('span', { className: 'mode-btn__label', textContent: label });
    btn.appendChild(iconEl);
    btn.appendChild(labelEl);

    btn.addEventListener('click', () => {
      navigate('select', { mode });
    });

    modeGrid.appendChild(btn);
  }

  page.appendChild(modeGrid);
  container.appendChild(page);
}

// ---------------------------------------------------------------------------
// Page: Song Select
// ---------------------------------------------------------------------------

function renderSongSelect(container, currentState) {
  const page = el('div', { className: 'page page--select' });

  const heading = el('h2', { className: 'select__title', textContent: '選擇歌曲' });
  page.appendChild(heading);

  const modeLabel = el('p', { className: 'select__mode' });
  const modeNames = { mic: '🎤 即時麥克風', midi: '🎹 MIDI 鍵盤', upload: '🎙️ 錄音/上傳' };
  modeLabel.textContent = `模式：${modeNames[currentState.mode] ?? currentState.mode}`;
  page.appendChild(modeLabel);

  // Built-in song grid
  const grid = el('div', { className: 'song-grid' });
  const songs = getBuiltInSongs();

  for (const song of songs) {
    const card = el('button', { className: 'song-card' });

    const songName = el('span', { className: 'song-card__name', textContent: song.name });
    const songInfo = el('span', {
      className: 'song-card__info',
      textContent: `BPM: ${song.bpm} · ${Math.round(song.duration)}s`,
    });

    card.appendChild(songName);
    card.appendChild(songInfo);

    card.addEventListener('click', () => {
      navigate('practice', { currentSong: song });
    });

    grid.appendChild(card);
  }

  page.appendChild(grid);

  // Upload MIDI divider
  const divider = el('p', { className: 'select__divider', textContent: '— 或者 —' });
  page.appendChild(divider);

  // Upload MIDI button + hidden file input
  const uploadBtn = el('button', { className: 'upload-btn', textContent: '📂 上傳 MIDI 檔案' });
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.mid,.midi';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const song = parseMidiScore(arrayBuffer);
      song.id = 'uploaded';
      song.name = file.name.replace(/\.(mid|midi)$/i, '');
      navigate('practice', { currentSong: song });
    } catch (err) {
      console.error('Failed to parse MIDI file:', err);
      const errMsg = el('p', { className: 'select__error', textContent: '無法讀取 MIDI 檔案，請確認格式是否正確。' });
      page.appendChild(errMsg);
    }
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  page.appendChild(uploadBtn);
  page.appendChild(fileInput);

  // Back button
  const backBtn = el('button', { className: 'back-btn', textContent: '← 返回首頁' });
  backBtn.addEventListener('click', () => navigate('home'));
  page.appendChild(backBtn);

  container.appendChild(page);
}

// ---------------------------------------------------------------------------
// Practice session: audio pipeline
// ---------------------------------------------------------------------------

async function startMicPipeline(song, onNote) {
  const { audioContext, analyser, stream } = await initMicrophone();
  session.audioContext = audioContext;
  session.analyser = analyser;
  session.stream = stream;

  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);

  function processAudio() {
    if (!session.rafId) return; // session ended
    analyser.getFloatTimeDomainData(buffer);
    const freq = detectPitch(buffer, audioContext.sampleRate);
    if (freq > 0) {
      const midiNote = frequencyToMidi(freq);
      if (midiNote >= 0 && midiNote <= 127) {
        const elapsed = (performance.now() - session.startTime) / 1000;
        onNote({ midi: midiNote, time: elapsed });
      }
    }
  }

  // processAudio is called from the rAF loop defined in startPracticeLoop
  session.micProcessor = processAudio;
}

async function startMidiPipeline(onNote) {
  const { access, inputs } = await initMidi((event) => {
    if (event.type === 'noteOn') {
      const elapsed = (performance.now() - session.startTime) / 1000;
      onNote({ midi: event.note, time: elapsed });
    }
  });
  session.midiAccess = access;
  session.midiInputs = inputs;
}

// ---------------------------------------------------------------------------
// Page: Practice
// ---------------------------------------------------------------------------

function renderPractice(container, currentState) {
  const song = currentState.currentSong;
  if (!song) {
    navigate('select', {});
    return;
  }

  if (currentState.mode === 'upload') {
    renderUploadPractice(container, currentState, song);
  } else {
    renderLivePractice(container, currentState, song);
  }
}

// ---------------------------------------------------------------------------
// Practice: Upload / Record mode
// ---------------------------------------------------------------------------

function renderUploadPractice(container, currentState, song) {
  const page = el('div', { className: 'page page--practice page--upload' });

  // Header
  const header = el('div', { className: 'practice__header' });
  const songTitle = el('h2', { className: 'practice__title', textContent: song.name });
  header.appendChild(songTitle);
  page.appendChild(header);

  // Instructions
  const instructions = el('p', {
    className: 'upload__instructions',
    textContent: '上傳音頻檔案或錄製你的演奏，系統將自動分析並給出成績。',
  });
  page.appendChild(instructions);

  // Upload button + hidden file input
  const uploadBtn = el('button', { className: 'upload-audio-btn', textContent: '📂 上傳音頻檔案' });
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.wav,.mp3,.m4a';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    analyseAudioFile(file, song, page, currentState);
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  page.appendChild(uploadBtn);
  page.appendChild(fileInput);

  // Divider
  const divider = el('p', { className: 'upload__divider', textContent: '— 或者 —' });
  page.appendChild(divider);

  // Record button
  const recordBtn = el('button', { className: 'record-btn', textContent: '🎙️ 開始錄音' });
  const recordStatus = el('p', { className: 'record__status', textContent: '' });

  let isRecording = false;

  recordBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording(recordBtn, recordStatus, song, page, currentState);
      isRecording = true;
    } else {
      stopRecording(recordBtn, recordStatus);
      isRecording = false;
    }
  });

  page.appendChild(recordBtn);
  page.appendChild(recordStatus);

  // Back button
  const backBtn = el('button', { className: 'back-btn', textContent: '← 返回選歌' });
  backBtn.addEventListener('click', () => {
    cleanupUploadSession();
    navigate('select', {});
  });
  page.appendChild(backBtn);

  container.appendChild(page);
}

/**
 * Start recording via MediaRecorder API.
 * When recording stops, automatically analyse the recorded audio.
 */
function startRecording(recordBtn, recordStatus, song, page, currentState) {
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then((stream) => {
      session.stream = stream;
      session.recordedChunks = [];

      const recorder = new MediaRecorder(stream);
      session.mediaRecorder = recorder;

      recorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) {
          session.recordedChunks = [...session.recordedChunks, e.data];
        }
      });

      recorder.addEventListener('stop', () => {
        if (session.recordedChunks.length === 0) {
          showUploadError(page, '錄音為空，請重試。');
          return;
        }
        const blob = new Blob(session.recordedChunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        cleanupUploadSession();
        analyseAudioFile(file, song, page, currentState);
      });

      recorder.start();
      recordBtn.textContent = '⏹ 停止錄音';
      recordStatus.textContent = '錄音中…';
    })
    .catch((err) => {
      console.error('Microphone access failed:', err);
      showUploadError(page, '無法存取麥克風，請確認權限設定。');
    });
}

/**
 * Stop the active MediaRecorder, which will trigger the 'stop' event.
 */
function stopRecording(recordBtn, recordStatus) {
  if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
    session.mediaRecorder.stop();
    recordBtn.textContent = '🎙️ 開始錄音';
    recordStatus.textContent = '處理中…';
  }
}

/**
 * Clean up MediaRecorder and mic stream.
 */
function cleanupUploadSession() {
  if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
    session.mediaRecorder.stop();
  }
  session.mediaRecorder = null;
  session.recordedChunks = [];

  if (session.stream) {
    session.stream.getTracks().forEach((track) => track.stop());
    session.stream = null;
  }
}

/**
 * Decode and analyse an audio file, then navigate to the report page.
 *
 * @param {File} file
 * @param {{ notes: object[], name: string }} song
 * @param {HTMLElement} page - Parent element for error messages
 * @param {object} currentState
 */
async function analyseAudioFile(file, song, page, currentState) {
  const statusEl = el('p', { className: 'upload__progress', textContent: '🔍 分析中，請稍候…' });
  page.appendChild(statusEl);

  try {
    const pitches = await processAudioFile(file);

    if (pitches.length === 0) {
      page.removeChild(statusEl);
      showUploadError(page, '未偵測到音符，請確認音頻內容是否正確。');
      return;
    }

    // Convert pitch results to played notes (filter silence)
    const playedNotes = pitches
      .filter((p) => p.frequency > 0)
      .map((p) => ({ midi: frequencyToMidi(p.frequency), time: p.time }))
      .filter((n) => n.midi >= 0 && n.midi <= 127);

    if (playedNotes.length === 0) {
      page.removeChild(statusEl);
      showUploadError(page, '未偵測到有效音符，請確認錄音品質。');
      return;
    }

    // Run all notes through the comparator
    let comparatorState = createComparatorState(song.notes);
    for (const note of playedNotes) {
      comparatorState = processPlayedNote(comparatorState, note);
    }

    const report = createReport(comparatorState, currentState.currentSong);
    navigate('report', { score: report });
  } catch (err) {
    console.error('Audio analysis failed:', err);
    if (page.contains(statusEl)) {
      page.removeChild(statusEl);
    }
    showUploadError(page, '音頻解析失敗，請確認檔案格式是否正確（支援 .wav、.mp3、.m4a）。');
  }
}

function showUploadError(page, message) {
  const errEl = el('p', { className: 'upload__error', textContent: message });
  page.appendChild(errEl);
}

// ---------------------------------------------------------------------------
// Practice: Live (mic / midi) mode
// ---------------------------------------------------------------------------

function renderLivePractice(container, currentState, song) {
  const page = el('div', { className: 'page page--practice' });

  // Header bar
  const header = el('div', { className: 'practice__header' });
  const songTitle = el('h2', { className: 'practice__title', textContent: song.name });
  header.appendChild(songTitle);

  const accuracyEl = el('span', { className: 'practice__accuracy', textContent: '準確率: --' });
  header.appendChild(accuracyEl);

  const stopBtn = el('button', { className: 'stop-btn', textContent: '⏹ 停止' });
  header.appendChild(stopBtn);
  page.appendChild(header);

  // Waterfall canvas
  const waterfallCanvas = el('canvas', { className: 'waterfall-canvas', id: 'waterfall' });
  waterfallCanvas.width = 800;
  waterfallCanvas.height = 300;
  page.appendChild(waterfallCanvas);

  // Piano keyboard canvas
  const pianoCanvas = el('canvas', { className: 'piano-canvas', id: 'piano' });
  const MIDI_START = 48; // C3
  const MIDI_END = 84;   // C6
  const keyLayout = getKeyLayout(MIDI_START, MIDI_END);
  const totalWhiteKeys = keyLayout.filter(k => !k.isBlack).length;
  pianoCanvas.width = totalWhiteKeys * 24;
  pianoCanvas.height = 120;
  page.appendChild(pianoCanvas);

  container.appendChild(page);

  // Initialise session
  session.song = song;
  session.startTime = performance.now();
  session.comparatorState = createComparatorState(song.notes);
  session.activeNotes = new Map();

  const wCtx = waterfallCanvas.getContext('2d');
  const pCtx = pianoCanvas.getContext('2d');

  function onNoteDetected(playedNote) {
    session.comparatorState = processPlayedNote(session.comparatorState, playedNote);

    // Update active notes for keyboard display
    const newMap = new Map(session.activeNotes);
    // Find the last result for this midi to get status
    const results = session.comparatorState.results;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].played.midi === playedNote.midi) {
        newMap.set(playedNote.midi, results[i].status);
        break;
      }
    }
    session.activeNotes = newMap;

    // Update accuracy display
    const total = session.comparatorState.results.length;
    const correct = session.comparatorState.results.filter(r => r.status === 'correct').length;
    if (total > 0) {
      const pct = Math.round((correct / total) * 100);
      accuracyEl.textContent = `準確率: ${pct}%`;
    }

    // Clear active note highlight after 500ms
    setTimeout(() => {
      const clearedMap = new Map(session.activeNotes);
      clearedMap.delete(playedNote.midi);
      session.activeNotes = clearedMap;
    }, 500);
  }

  // Start the animation loop
  const WINDOW_SIZE = 3; // seconds of notes to show ahead

  function loop() {
    const elapsed = (performance.now() - session.startTime) / 1000;

    // Run mic processor if applicable
    if (session.micProcessor) {
      session.micProcessor();
    }

    // Render waterfall
    renderWaterfall(
      wCtx,
      song.notes,
      elapsed,
      WINDOW_SIZE,
      waterfallCanvas.width,
      waterfallCanvas.height,
    );

    // Render keyboard
    renderKeyboard(pCtx, keyLayout, session.activeNotes);

    // Check if song finished (elapsed > song duration + buffer)
    if (elapsed > song.duration + 2) {
      endPractice(currentState);
      return;
    }

    session.rafId = requestAnimationFrame(loop);
  }

  function endPractice(practiceState) {
    cleanupSession();
    const report = createReport(session.comparatorState, practiceState.currentSong);
    navigate('report', { score: report });
  }

  stopBtn.addEventListener('click', () => endPractice(currentState));

  // Start audio pipeline then begin loop
  const mode = currentState.mode;
  session.rafId = 1; // Mark as active before async init

  if (mode === 'mic') {
    startMicPipeline(song, onNoteDetected)
      .then(() => {
        session.rafId = requestAnimationFrame(loop);
      })
      .catch((err) => {
        console.error('Microphone init failed:', err);
        showPracticeError(page, '無法存取麥克風，請確認權限設定。');
        session.rafId = null;
      });
  } else if (mode === 'midi') {
    startMidiPipeline(onNoteDetected)
      .then(() => {
        session.rafId = requestAnimationFrame(loop);
      })
      .catch((err) => {
        console.error('MIDI init failed:', err);
        showPracticeError(page, '找不到 MIDI 裝置，請確認連接後重試。');
        session.rafId = null;
      });
  } else {
    session.rafId = requestAnimationFrame(loop);
  }
}

function showPracticeError(page, message) {
  const errEl = el('p', { className: 'practice__error', textContent: message });
  page.appendChild(errEl);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function cleanupSession() {
  // Stop animation loop
  if (session.rafId) {
    cancelAnimationFrame(session.rafId);
    session.rafId = null;
  }

  // Close mic
  if (session.stream) {
    session.stream.getTracks().forEach(track => track.stop());
    session.stream = null;
  }
  if (session.audioContext) {
    session.audioContext.close().catch(() => {});
    session.audioContext = null;
  }
  session.analyser = null;
  session.micProcessor = null;

  // Remove MIDI listeners
  for (const input of session.midiInputs) {
    input.onmidimessage = null;
  }
  session.midiInputs = [];
  session.midiAccess = null;

  // Clean up upload/record session
  cleanupUploadSession();
}

// ---------------------------------------------------------------------------
// Page: Report
// ---------------------------------------------------------------------------

function renderReportPage(container, currentState) {
  const page = el('div', { className: 'page page--report' });

  const report = currentState.score;

  if (!report) {
    const msg = el('p', { textContent: '沒有練習資料。' });
    page.appendChild(msg);
  } else {
    // Use renderReport from ui/report.js
    renderReport(page, report);
  }

  // Action buttons
  const actions = el('div', { className: 'report__actions' });

  const againBtn = el('button', { className: 'action-btn action-btn--again', textContent: '🔁 再練一次' });
  againBtn.addEventListener('click', () => {
    navigate('select', { score: null });
  });

  const homeBtn = el('button', { className: 'action-btn action-btn--home', textContent: '🏠 回首頁' });
  homeBtn.addEventListener('click', () => {
    navigate('home', { score: null, currentSong: null, mode: null });
  });

  actions.appendChild(againBtn);
  actions.appendChild(homeBtn);
  page.appendChild(actions);

  container.appendChild(page);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

render(state);
