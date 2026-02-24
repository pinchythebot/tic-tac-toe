/**
 * game.js — Tic-Tac-Toe Game Logic
 *
 * Implements the full client-side game engine:
 *  - Move handling (click & keyboard)
 *  - Win / draw detection
 *  - Score tracking across rounds
 *  - DOM updates (turn indicator, status message, aria-labels)
 *  - New Game and Reset Score controls
 *  - Web Audio API sound effects (SoundEngine)
 *  - Mute / unmute toggle
 *
 * Designed to be loaded by index.html after the DOM is fully parsed.
 * All exports are wrapped in a DOMContentLoaded listener so the module
 * can also be required() by Jest/jsdom without immediately touching the DOM.
 */

'use strict';

/* ---------------------------------------------------------------------------
   Win Conditions
   --------------------------------------------------------------------------- */
const WIN_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // main diagonal
  [2, 4, 6], // anti-diagonal
];

/* ---------------------------------------------------------------------------
   Sound Engine — Web Audio API (no external libraries)
   --------------------------------------------------------------------------- *
 *
 * All four sounds are synthesized entirely with OscillatorNode + GainNode.
 *
 * AudioContext creation is deferred until enable() is called, which should
 * only happen inside a user-gesture handler (click / keydown).  This
 * satisfies browser autoplay policies that block AudioContext creation before
 * any user interaction.
 *
 * Sounds:
 *  playPlace()   – short percussive click when a mark is placed
 *  playWin()     – ascending arpeggio fanfare on win
 *  playDraw()    – descending minor-chord sequence on draw
 *  playNewGame() – subtle frequency whoosh on New Game
 */
const SoundEngine = (() => {
  /** Lazily-created AudioContext — null until the first user gesture. */
  let _audioContext = null;

  /** Whether a user gesture has been registered (enables audio creation). */
  let _gestureOccurred = false;

  /** Whether sounds are muted. */
  let _muted = false;

  /* ------------------------------------------------------------------
     Private helpers
     ------------------------------------------------------------------ */

  /**
   * Mark that a user gesture has occurred.
   * Call this inside any user-event handler before playing audio so that
   * the AudioContext is created in the correct gesture context.
   */
  function enable() {
    _gestureOccurred = true;
  }

  /**
   * Return a running AudioContext, or null if audio is unavailable
   * (muted, no gesture yet, or environment without Web Audio API).
   *
   * @returns {AudioContext|null}
   */
  function _getContext() {
    if (_muted) return null;
    if (!_gestureOccurred) return null;
    if (typeof window === 'undefined') return null;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!_audioContext) {
      try {
        _audioContext = new AudioContextClass();
      } catch (_) {
        return null;
      }
    }

    // Resume if the context was suspended (e.g. tab switch)
    if (_audioContext.state === 'suspended') {
      _audioContext.resume().catch(() => {});
    }

    return _audioContext;
  }

  /* ------------------------------------------------------------------
     Sound synthesizers
     ------------------------------------------------------------------ */

  /**
   * Short percussive click — played when a mark is placed on the board.
   *
   * Triangle oscillator with a rapid frequency drop (800 → 200 Hz) and a
   * fast gain decay over ~80 ms gives a clean, tactile "tick".
   */
  function playPlace() {
    const ctx = _getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Ascending arpeggio fanfare — played on a win.
   *
   * Four sine-wave notes (C5 → E5 → G5 → C6) played in quick succession,
   * each with a soft attack and fast decay.
   */
  function playWin() {
    const ctx = _getContext();
    if (!ctx) return;

    // C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteDuration = 0.14;
    const noteGap      = 0.16;
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const t = now + i * noteGap;

      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);

      osc.start(t);
      osc.stop(t + noteDuration);
    });
  }

  /**
   * Descending minor-chord sequence — played on a draw.
   *
   * Three sawtooth notes (A4 → F4 → D4) played in descending order,
   * giving a muted, "oh well" feeling.
   */
  function playDraw() {
    const ctx = _getContext();
    if (!ctx) return;

    // A4, F4, D4 — descending minor-ish
    const notes = [440, 349.23, 293.66];
    const noteDuration = 0.20;
    const noteGap      = 0.22;
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const t = now + i * noteGap;

      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);

      osc.start(t);
      osc.stop(t + noteDuration);
    });
  }

  /**
   * Subtle frequency whoosh — played when a New Game begins.
   *
   * A single sine oscillator sweeps from 1 200 Hz down to 200 Hz over
   * 300 ms while the gain decays, producing a light "swoosh" sound.
   */
  function playNewGame() {
    const ctx = _getContext();
    if (!ctx) return;

    const now      = ctx.currentTime;
    const duration = 0.30;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  /* ------------------------------------------------------------------
     Mute control
     ------------------------------------------------------------------ */

  /**
   * Set the muted state.
   * @param {boolean} muted
   */
  function setMuted(muted) {
    _muted = Boolean(muted);
  }

  /**
   * Return true if audio is currently muted.
   * @returns {boolean}
   */
  function isMuted() {
    return _muted;
  }

  /* ------------------------------------------------------------------
     Testing helpers (prefixed with _ — not part of public API)
     ------------------------------------------------------------------ */

  /**
   * Reset all internal state.  For unit-test use only.
   */
  function _reset() {
    _audioContext     = null;
    _gestureOccurred  = false;
    _muted            = false;
  }

  /** Return whether a user gesture has been registered. */
  function _isEnabled() {
    return _gestureOccurred;
  }

  /** Return the current AudioContext instance (may be null). */
  function _getAudioContext() {
    return _audioContext;
  }

  /* Public API */
  return {
    enable,
    playPlace,
    playWin,
    playDraw,
    playNewGame,
    setMuted,
    isMuted,
    // Testing helpers
    _reset,
    _isEnabled,
    _getAudioContext,
  };
})();

/* ---------------------------------------------------------------------------
   Game State (module-level — reset by startNewGame())
   --------------------------------------------------------------------------- */
let board        = Array(9).fill(null); // null | 'X' | 'O'
let currentPlayer = 'X';
let gameOver     = false;
let scores       = { X: 0, O: 0, draw: 0 };

/* ---------------------------------------------------------------------------
   DOM Helpers — looked up once after DOMContentLoaded
   --------------------------------------------------------------------------- */
let cells;
let turnIndicator;
let currentPlayerSymbol;
let statusMessage;
let scoreX;
let scoreO;
let scoreDraw;
let scoreCardX;
let scoreCardO;
let newGameBtn;
let resetScoreBtn;
let muteBtn;

/* ---------------------------------------------------------------------------
   Core Game Logic (pure — no DOM side-effects)
   --------------------------------------------------------------------------- */

/**
 * Return the winning line [i, j, k] if `player` has won on `boardState`,
 * otherwise return null.
 *
 * @param {Array<string|null>} boardState
 * @param {string} player  'X' or 'O'
 * @returns {number[]|null}
 */
function checkWin(boardState, player) {
  for (const line of WIN_LINES) {
    if (line.every((idx) => boardState[idx] === player)) {
      return line;
    }
  }
  return null;
}

/**
 * Return the winning player symbol ('X' or 'O') if there is a winner,
 * otherwise return null.
 *
 * @param {Array<string|null>} boardState
 * @returns {'X'|'O'|null}
 */
function checkWinner(boardState) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (boardState[a] !== null &&
        boardState[a] === boardState[b] &&
        boardState[a] === boardState[c]) {
      return boardState[a];
    }
  }
  return null;
}

/**
 * Return true if every cell on boardState is filled (no nulls).
 *
 * @param {Array<string|null>} boardState
 * @returns {boolean}
 */
function checkDraw(boardState) {
  return boardState.every((cell) => cell !== null);
}

/**
 * Return the opposite player symbol.
 *
 * @param {'X'|'O'} current
 * @returns {'X'|'O'}
 */
function switchPlayer(current) {
  return current === 'X' ? 'O' : 'X';
}

/* ---------------------------------------------------------------------------
   DOM Updates
   --------------------------------------------------------------------------- */

/** Refresh the turn-indicator element to reflect currentPlayer. */
function updateTurnIndicator() {
  currentPlayerSymbol.textContent = currentPlayer;
  turnIndicator.className = `turn-indicator is-${currentPlayer.toLowerCase()}`;
  turnIndicator.setAttribute('aria-label', `Player ${currentPlayer}'s turn`);
}

/** Highlight the active player's score card. */
function updateScoreCardHighlight() {
  if (currentPlayer === 'X') {
    scoreCardX.classList.add('active-player');
    scoreCardO.classList.remove('active-player');
  } else {
    scoreCardO.classList.add('active-player');
    scoreCardX.classList.remove('active-player');
  }
}

/** Push current score values to the DOM. */
function updateScoreDisplay() {
  scoreX.textContent    = String(scores.X);
  scoreO.textContent    = String(scores.O);
  scoreDraw.textContent = String(scores.draw);
}

/**
 * Apply the correct CSS classes and aria-label to a single cell element.
 *
 * @param {HTMLElement} cellEl
 * @param {number}      index  0–8
 */
function renderCell(cellEl, index) {
  const value = board[index];
  const position = index + 1; // 1-based for human-readable label

  // Remove previous state classes
  cellEl.classList.remove('x-piece', 'o-piece', 'winning', 'taken');

  if (value === 'X') {
    cellEl.classList.add('x-piece', 'taken');
    cellEl.setAttribute('aria-label', `Cell ${position}, X`);
    cellEl.setAttribute('tabindex', '-1');
  } else if (value === 'O') {
    cellEl.classList.add('o-piece', 'taken');
    cellEl.setAttribute('aria-label', `Cell ${position}, O`);
    cellEl.setAttribute('tabindex', '-1');
  } else {
    cellEl.setAttribute('aria-label', `Cell ${position}, empty`);
    cellEl.setAttribute('tabindex', '0');
    cellEl.setAttribute('aria-disabled', 'false');
  }
}

/** Re-render all 9 cells from the current board state. */
function renderBoard() {
  cells.forEach((cellEl, index) => renderCell(cellEl, index));
}

/** Mark all remaining empty cells as aria-disabled when the game ends. */
function disableEmptyCells() {
  cells.forEach((cellEl, index) => {
    if (board[index] === null) {
      cellEl.setAttribute('aria-disabled', 'true');
    }
  });
}

/* ---------------------------------------------------------------------------
   Move Handler
   --------------------------------------------------------------------------- */

/**
 * Process a move at the given board index.
 * No-ops if the game is over or the cell is taken.
 *
 * @param {number} index  0–8
 */
function handleMove(index) {
  if (gameOver || board[index] !== null) return;

  // Place the mark
  board[index] = currentPlayer;
  renderCell(cells[index], index);

  // Sound: mark placed
  SoundEngine.playPlace();

  // Check win
  const winLine = checkWin(board, currentPlayer);
  if (winLine) {
    gameOver = true;
    scores[currentPlayer]++;
    updateScoreDisplay();

    // Apply winning CSS class to the winning cells
    winLine.forEach((idx) => cells[idx].classList.add('winning'));

    // Disable remaining empty cells
    disableEmptyCells();

    // Show status
    statusMessage.textContent = `Player ${currentPlayer} wins!`;

    // Sound: win fanfare
    SoundEngine.playWin();

    // Keep the turn indicator showing the winner (no change)
    return;
  }

  // Check draw
  if (checkDraw(board)) {
    gameOver = true;
    scores.draw++;
    updateScoreDisplay();
    statusMessage.textContent = "It's a draw!";

    // Sound: draw chord
    SoundEngine.playDraw();

    return;
  }

  // Advance turn
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();
  updateScoreCardHighlight();
}

/* ---------------------------------------------------------------------------
   New Game / Reset Score
   --------------------------------------------------------------------------- */

/** Reset the board for a new round (scores preserved). */
function startNewGame() {
  board         = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver      = false;

  statusMessage.textContent = '';
  renderBoard();
  updateTurnIndicator();
  updateScoreCardHighlight();

  // Sound: whoosh
  SoundEngine.playNewGame();
}

/** Reset scores and start a fresh game. */
function resetScore() {
  scores = { X: 0, O: 0, draw: 0 };
  updateScoreDisplay();
  startNewGame();
}

/* ---------------------------------------------------------------------------
   Mute Toggle
   --------------------------------------------------------------------------- */

/**
 * Toggle the mute state and update the mute button's appearance and
 * aria attributes to reflect the new state.
 */
function toggleMute() {
  const nowMuted = !SoundEngine.isMuted();
  SoundEngine.setMuted(nowMuted);

  if (muteBtn) {
    muteBtn.textContent = nowMuted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(nowMuted));
    muteBtn.setAttribute('aria-label', nowMuted ? 'Unmute sounds' : 'Mute sounds');
  }
}

/* ---------------------------------------------------------------------------
   Event Wiring
   --------------------------------------------------------------------------- */

/** Wire click and keyboard events to all 9 cells. */
function bindCellEvents() {
  cells.forEach((cellEl, index) => {
    cellEl.addEventListener('click', () => {
      // Register user gesture so AudioContext may be created
      SoundEngine.enable();
      handleMove(index);
    });
    cellEl.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        // Register user gesture so AudioContext may be created
        SoundEngine.enable();
        handleMove(index);
      }
    });
  });
}

/* ---------------------------------------------------------------------------
   Initialisation
   --------------------------------------------------------------------------- */

function init() {
  // Cache DOM references
  cells               = Array.from(document.querySelectorAll('.cell'));
  turnIndicator       = document.getElementById('turnIndicator');
  currentPlayerSymbol = document.getElementById('currentPlayerSymbol');
  statusMessage       = document.getElementById('statusMessage');
  scoreX              = document.getElementById('scoreX');
  scoreO              = document.getElementById('scoreO');
  scoreDraw           = document.getElementById('scoreDraw');
  scoreCardX          = document.getElementById('scoreCardX');
  scoreCardO          = document.getElementById('scoreCardO');
  newGameBtn          = document.getElementById('newGameBtn');
  resetScoreBtn       = document.getElementById('resetScoreBtn');
  muteBtn             = document.getElementById('muteBtn');

  // Bind controls — each user gesture also enables the SoundEngine
  newGameBtn.addEventListener('click', () => {
    SoundEngine.enable();
    startNewGame();
  });

  resetScoreBtn.addEventListener('click', () => {
    SoundEngine.enable();
    resetScore();
  });

  // Mute toggle
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      SoundEngine.enable();
      toggleMute();
    });
  }

  // Bind cell interactions
  bindCellEvents();

  // Render initial state
  renderBoard();
  updateTurnIndicator();
  updateScoreCardHighlight();
  updateScoreDisplay();
}

document.addEventListener('DOMContentLoaded', init);

/* ---------------------------------------------------------------------------
   Exports (for unit testing with Jest / Node require())
   --------------------------------------------------------------------------- */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Public API — core constants and pure logic
    WIN_LINES,
    checkWinner,     // (board) → 'X' | 'O' | null
    checkDraw,       // (board) → boolean
    switchPlayer,    // (current) → 'X' | 'O'
    // Internal helpers (also exported for advanced testing)
    checkWin,        // (boardState, player) → number[]|null  (winning line)
    // DOM-bound game actions
    init,
    startNewGame,
    resetScore,
    handleMove,
    toggleMute,
    // Sound engine (exported for testing with mocked AudioContext)
    SoundEngine,
    // State inspection / injection for DOM test harness
    _getState: () => ({ board: [...board], currentPlayer, gameOver, scores: { ...scores } }),
    _setState: (state) => {
      if (state.board)         board          = state.board;
      if (state.currentPlayer) currentPlayer  = state.currentPlayer;
      if (typeof state.gameOver !== 'undefined') gameOver = state.gameOver;
      if (state.scores)        scores         = state.scores;
    },
  };
}
