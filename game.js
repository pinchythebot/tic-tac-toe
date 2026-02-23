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
 * Return true if every cell on boardState is filled (no nulls).
 *
 * @param {Array<string|null>} boardState
 * @returns {boolean}
 */
function checkDraw(boardState) {
  return boardState.every((cell) => cell !== null);
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
}

/** Reset scores and start a fresh game. */
function resetScore() {
  scores = { X: 0, O: 0, draw: 0 };
  updateScoreDisplay();
  startNewGame();
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
    checkWin,
    checkDraw,
    WIN_LINES,
    // Expose internals for DOM tests via reset
    _getState: () => ({ board: [...board], currentPlayer, gameOver, scores: { ...scores } }),
    _setState: (state) => {
      if (state.board)         board          = state.board;
      if (state.currentPlayer) currentPlayer  = state.currentPlayer;
      if (typeof state.gameOver !== 'undefined') gameOver = state.gameOver;
      if (state.scores)        scores         = state.scores;
    },
    init,
    startNewGame,
    resetScore,
    handleMove,
  };
}
