export function createAppState() {
  return Object.freeze({
    mode: null,
    currentSong: null,
    isPlaying: false,
    playedNotes: [],
    score: null,
    page: 'home'
  });
}

export function updateState(state, changes) {
  return Object.freeze({ ...state, ...changes });
}
