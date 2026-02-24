/**
 * game.js — Tic-Tac-Toe Game Logic
 *
 * Implements the full client-side game engine:
 *  - Move handling (click & keyboard)
 *  - Win / draw detection
 *  - Score tracking across rounds
 *  - DOM updates (turn indicator, status message, aria-labels)
 *  - New Game and Reset Score controls
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
   Game State (module-level — reset by startNewGame())
   --------------------------------------------------------------------------- */
let board        = Array(9).fill(null); // null | 'X' | 'O'
let currentPlayer = 'X';
let gameOver     = false;
let scores       = { X: 0, O: 0, draw: 0 };

let gameMode    = 'two-player'; // 'single' | 'two-player' — overridden to 'single' in init() when mode-switcher is present
let difficulty  = 'hard';       // 'easy' | 'medium' | 'hard'
let aiThinking  = false;        // true while 400 ms AI delay is active
let isAIMove    = false;        // internal flag: lets the AI bypass the aiThinking guard
let aiTimeoutId = null;         // handle for pending setTimeout (for cancellation)

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
 * Minimax with alpha-beta pruning.
 * AI = 'O' (maximizing), Human = 'X' (minimizing).
 * Returns a numeric score for the given boardState.
 *
 * Scoring:
 *  O win  → +10 − depth  (prefer faster wins)
 *  X win  → depth − 10   (prefer slower losses)
 *  Draw   → 0
 *
 * @param {Array<string|null>} boardState  — mutated in-place then restored (backtracking)
 * @param {number}             depth       — recursive depth (starts at 0)
 * @param {boolean}            isMaximizing — true when it's O's (AI's) virtual turn
 * @param {number}             alpha        — best score the maximizer (O) can guarantee so far
 * @param {number}             beta         — best score the minimizer (X) can guarantee so far
 * @returns {number}
 */
function minimax(boardState, depth, isMaximizing, alpha, beta) {
  const winner = checkWinner(boardState);
  if (winner === 'O') return 10 - depth;   // AI wins — prefer faster wins
  if (winner === 'X') return depth - 10;   // Human wins — prefer slower losses
  if (checkDraw(boardState)) return 0;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        boardState[i] = 'O';
        const score = minimax(boardState, depth + 1, false, alpha, beta);
        boardState[i] = null;  // backtrack
        maxScore = Math.max(maxScore, score);
        alpha    = Math.max(alpha, score);
        if (beta <= alpha) break;  // β cut-off
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        boardState[i] = 'X';
        const score = minimax(boardState, depth + 1, true, alpha, beta);
        boardState[i] = null;  // backtrack
        minScore = Math.min(minScore, score);
        beta     = Math.min(beta, score);
        if (beta <= alpha) break;  // α cut-off
      }
    }
    return minScore;
  }
}

/**
 * Return the best board index for O to play, given the current difficulty.
 *
 * Difficulty tiers:
 *  'hard'   — always optimal (full minimax with alpha-beta pruning). AI never loses.
 *  'medium' — 60 % chance of a random move, 40 % minimax. Beatable by a skilled player.
 *  'easy'   — always picks a random empty cell. Easily beatable.
 *
 * The passed boardState is NEVER mutated.
 *
 * @param {Array<string|null>} boardState  — read-only; spread copies used for minimax
 * @param {'easy'|'medium'|'hard'} diff
 * @returns {number}  index 0–8, or -1 if no empty cell exists
 */
function getBestMove(boardState, diff) {
  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === null) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) return -1;

  const randomMove = () =>
    emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

  if (diff === 'easy') return randomMove();                              // Always random
  if (diff === 'medium' && Math.random() < 0.60) return randomMove();   // 60 % random, 40 % minimax

  // Full minimax for 'hard' (and non-random fallthrough for other tiers)
  let bestScore = -Infinity;
  let bestMove  = emptyIndices[0]; // safe default
  for (const i of emptyIndices) {
    const copy = [...boardState];
    copy[i] = 'O';
    const score = minimax(copy, 0, false, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove  = i;
    }
  }
  return bestMove;
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

/** Add board--locked class to prevent pointer interaction during AI thinking. */
function lockBoard() {
  const boardEl = document.getElementById('board');
  if (boardEl) boardEl.classList.add('board--locked');
}

/** Remove board--locked class once AI has played. */
function unlockBoard() {
  const boardEl = document.getElementById('board');
  if (boardEl) boardEl.classList.remove('board--locked');
}

/**
 * Schedule an AI move after a 400 ms delay.
 * Locks the board during the thinking period to prevent human double-moves.
 * The callback is guarded against stale invocation (checks !gameOver).
 */
function scheduleAIMove() {
  aiThinking = true;
  lockBoard();
  aiTimeoutId = setTimeout(() => {
    aiTimeoutId = null;
    if (!gameOver) {
      const move = getBestMove([...board], difficulty);
      if (move !== -1) {
        isAIMove = true;
        handleMove(move);
        isAIMove = false;
      }
    }
    aiThinking = false;
    unlockBoard();
  }, 400);
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
  if (aiThinking && !isAIMove) return;  // Block human input during AI thinking delay

  // Place the mark
  board[index] = currentPlayer;
  renderCell(cells[index], index);

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

    // Keep the turn indicator showing the winner (no change)
    return;
  }

  // Check draw
  if (checkDraw(board)) {
    gameOver = true;
    scores.draw++;
    updateScoreDisplay();
    statusMessage.textContent = "It's a draw!";
    return;
  }

  // Advance turn
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();
  updateScoreCardHighlight();

  // In single-player mode, schedule AI response when it is O's turn
  if (gameMode === 'single' && !gameOver && currentPlayer === 'O') {
    scheduleAIMove();
  }
}

/* ---------------------------------------------------------------------------
   New Game / Reset Score
   --------------------------------------------------------------------------- */

/** Reset the board for a new round (scores preserved). */
function startNewGame() {
  // Cancel any in-flight AI move to prevent stale callbacks on a fresh board
  if (aiTimeoutId !== null) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
  }
  aiThinking = false;
  isAIMove   = false;
  unlockBoard();

  board         = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver      = false;

  statusMessage.textContent = '';
  renderBoard();
  updateTurnIndicator();
  updateScoreCardHighlight();
}

/** Reset scores and start a fresh game. */
function resetScore() {
  scores = { X: 0, O: 0, draw: 0 };
  updateScoreDisplay();
  startNewGame();
}

/**
 * Switch between 'single' and 'two-player' game modes.
 * Cancels any pending AI move, updates the pill button UI,
 * and resets the board so the new mode takes effect immediately.
 *
 * @param {'single'|'two-player'} mode
 */
function setGameMode(mode) {
  gameMode = mode;

  // Update pill button visual state
  const btn1p = document.getElementById('btn1p');
  const btn2p = document.getElementById('btn2p');
  if (btn1p && btn2p) {
    btn1p.classList.toggle('mode-btn--active', mode === 'single');
    btn2p.classList.toggle('mode-btn--active', mode === 'two-player');
    btn1p.setAttribute('aria-pressed', mode === 'single'     ? 'true' : 'false');
    btn2p.setAttribute('aria-pressed', mode === 'two-player' ? 'true' : 'false');
  }

  // Cancel any pending AI move (startNewGame will also do this, but be explicit here)
  if (aiTimeoutId !== null) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
    aiThinking  = false;
    unlockBoard();
  }

  // Show or hide the difficulty selector based on active mode
  const difficultySwitcher = document.getElementById('difficultySwitcher');
  if (difficultySwitcher) {
    if (mode === 'single') {
      difficultySwitcher.removeAttribute('hidden');
    } else {
      difficultySwitcher.setAttribute('hidden', '');
    }
  }

  startNewGame();
}

/**
 * Set the AI difficulty level and update the difficulty selector UI.
 *
 * @param {'easy'|'medium'|'hard'} diff
 */
function setDifficulty(diff) {
  difficulty = diff;

  const btnEasy   = document.getElementById('diffEasy');
  const btnMedium = document.getElementById('diffMedium');
  const btnHard   = document.getElementById('diffHard');

  if (btnEasy && btnMedium && btnHard) {
    // Reset all buttons
    [btnEasy, btnMedium, btnHard].forEach((btn) => {
      btn.classList.remove('difficulty-btn--active');
      btn.setAttribute('aria-pressed', 'false');
    });

    // Activate the selected difficulty button
    const activeBtn = diff === 'easy' ? btnEasy : diff === 'medium' ? btnMedium : btnHard;
    activeBtn.classList.add('difficulty-btn--active');
    activeBtn.setAttribute('aria-pressed', 'true');
  }
}

/* ---------------------------------------------------------------------------
   Event Wiring
   --------------------------------------------------------------------------- */

/** Wire click and keyboard events to all 9 cells. */
function bindCellEvents() {
  cells.forEach((cellEl, index) => {
    cellEl.addEventListener('click', () => handleMove(index));
    cellEl.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
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

  // Bind controls
  newGameBtn.addEventListener('click', startNewGame);
  resetScoreBtn.addEventListener('click', resetScore);

  // Bind mode-switcher buttons and set initial mode to 'single' when present
  const btn1p = document.getElementById('btn1p');
  const btn2p = document.getElementById('btn2p');
  if (btn1p) {
    btn1p.addEventListener('click', () => setGameMode('single'));
    // Mode-switcher is present in the DOM → default to single-player
    gameMode = 'single';
  }
  if (btn2p) btn2p.addEventListener('click', () => setGameMode('two-player'));

  // Bind difficulty selector buttons
  const btnDiffEasy   = document.getElementById('diffEasy');
  const btnDiffMedium = document.getElementById('diffMedium');
  const btnDiffHard   = document.getElementById('diffHard');
  if (btnDiffEasy)   btnDiffEasy.addEventListener('click',   () => setDifficulty('easy'));
  if (btnDiffMedium) btnDiffMedium.addEventListener('click', () => setDifficulty('medium'));
  if (btnDiffHard)   btnDiffHard.addEventListener('click',   () => setDifficulty('hard'));

  // Sync difficulty selector: show when single-player, hide when two-player
  const difficultySwitcher = document.getElementById('difficultySwitcher');
  if (difficultySwitcher) {
    if (gameMode !== 'single') {
      difficultySwitcher.setAttribute('hidden', '');
    }
    // Initialise the active button to match the current difficulty state
    setDifficulty(difficulty);
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
    // AI functions (pure — no DOM, no module state)
    minimax,         // (boardState, depth, isMaximizing, alpha, beta) → number
    getBestMove,     // (boardState, diff) → number (0–8) | -1
    // Board locking helpers
    lockBoard,       // () → void
    unlockBoard,     // () → void
    // AI scheduling
    scheduleAIMove,  // () → void
    // Mode management
    setGameMode,     // ('single'|'two-player') → void
    setDifficulty,   // ('easy'|'medium'|'hard') → void
    // DOM-bound game actions
    init,
    startNewGame,
    resetScore,
    handleMove,
    // State inspection / injection for DOM test harness
    _getState: () => ({
      board: [...board],
      currentPlayer,
      gameOver,
      scores: { ...scores },
      gameMode,
      difficulty,
      aiThinking,
      isAIMove,
      aiTimeoutId,
    }),
    _setState: (state) => {
      if (state.board)         board          = state.board;
      if (state.currentPlayer) currentPlayer  = state.currentPlayer;
      if (typeof state.gameOver    !== 'undefined') gameOver    = state.gameOver;
      if (state.scores)            scores      = state.scores;
      if (state.gameMode)          gameMode    = state.gameMode;
      if (state.difficulty)        difficulty  = state.difficulty;
      if (typeof state.aiThinking  !== 'undefined') aiThinking  = state.aiThinking;
      if (typeof state.isAIMove    !== 'undefined') isAIMove    = state.isAIMove;
    },
  };
}
