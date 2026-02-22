/**
 * Tic-Tac-Toe — game.js
 *
 * All game logic and DOM manipulation for the dark-theme neon-accent
 * Tic-Tac-Toe application.
 *
 * Architecture overview
 * ─────────────────────
 * • state      — single source of truth (board, currentPlayer, scores, gameActive)
 * • initGame() — resets state and DOM for a fresh game (preserves scores)
 * • User input comes from click events on the board and keyboard (Enter / Space)
 * • After each move the game checks for a winner or draw, then either ends
 *   the game or passes the turn to the next player.
 */

'use strict';

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

/** All 8 possible winning lines (indices into the 9-cell board array). */
const WIN_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // centre column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left → bottom-right
  [2, 4, 6], // diagonal top-right → bottom-left
];

/* ---------------------------------------------------------------------------
   Game State
   --------------------------------------------------------------------------- */

/**
 * Centralised mutable state.
 * @type {{
 *   board: Array<null|'X'|'O'>,
 *   currentPlayer: 'X'|'O',
 *   gameActive: boolean,
 *   scores: {X: number, O: number, draw: number}
 * }}
 */
const state = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  gameActive: true,
  scores: { X: 0, O: 0, draw: 0 },
};

/* ---------------------------------------------------------------------------
   DOM references (cached on DOMContentLoaded)
   --------------------------------------------------------------------------- */
let boardEl;
let cellEls;
let turnIndicatorEl;
let currentPlayerSymbolEl;
let statusMessageEl;
let newGameBtnEl;
let resetScoreBtnEl;
let scoreXEl;
let scoreOEl;
let scoreDrawEl;
let scoreCardXEl;
let scoreCardOEl;

/* ---------------------------------------------------------------------------
   Core Game Functions
   --------------------------------------------------------------------------- */

/**
 * Initialise (or re-initialise) the game.
 * Resets board state and all cell DOM classes.  Scores are NOT reset here —
 * call resetScores() first if a full score wipe is needed.
 */
function initGame() {
  // Reset board data
  state.board = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameActive = true;

  // Clear every cell
  cellEls.forEach((cell) => {
    cell.className = 'cell';              // strip all modifier classes
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-label', `Cell ${Number(cell.dataset.index) + 1}, empty`);
    cell.setAttribute('aria-disabled', 'false');
  });

  // Clear the status message
  statusMessageEl.textContent = '';
  statusMessageEl.className = 'status-message';

  // Sync the turn indicator and scoreboard active-player highlight
  updateTurnIndicator();
  updateScoreboard();
}

/**
 * Place a player's mark on a cell.
 * Updates both the data model and the DOM.
 *
 * @param {number} index    - Board index (0–8)
 * @param {'X'|'O'} player  - Which player is placing
 */
function placeMark(index, player) {
  state.board[index] = player;

  const cell = cellEls[index];
  cell.classList.add(player === 'X' ? 'x-piece' : 'o-piece', 'taken');
  cell.setAttribute('tabindex', '-1');   // remove from tab order once occupied
  cell.setAttribute('aria-label', `Cell ${index + 1}, ${player}`);
  cell.setAttribute('aria-disabled', 'true');
}

/**
 * Check whether the current board has a winner.
 *
 * @returns {number[]|null} The winning line (three indices) or null.
 */
function checkWinner() {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (
      state.board[a] !== null &&
      state.board[a] === state.board[b] &&
      state.board[a] === state.board[c]
    ) {
      return line;
    }
  }
  return null;
}

/**
 * Check whether the board is full with no winner (a draw).
 *
 * @returns {boolean}
 */
function checkDraw() {
  return state.board.every((cell) => cell !== null);
}

/**
 * Add the `.winning` CSS class to the three winning cells.
 *
 * @param {number[]} line - Array of three board indices.
 */
function highlightWinningCells(line) {
  line.forEach((index) => {
    cellEls[index].classList.add('winning');
  });
}

/**
 * End the game: stop further moves, update scores, and show the result.
 *
 * @param {'win'|'draw'} result - Outcome type.
 * @param {number[]|null} [line] - Winning line (only for 'win').
 */
function endGame(result, line = null) {
  state.gameActive = false;

  // Disable all remaining empty cells in the DOM
  cellEls.forEach((cell) => {
    if (!cell.classList.contains('taken')) {
      cell.setAttribute('tabindex', '-1');
      cell.setAttribute('aria-disabled', 'true');
    }
  });

  if (result === 'win') {
    const winner = state.currentPlayer; // still the player who just moved
    state.scores[winner]++;
    highlightWinningCells(line);
    showStatusMessage(`Player ${winner} wins!`, `win-${winner.toLowerCase()}`);
  } else {
    // Draw
    state.scores.draw++;
    showStatusMessage("It's a draw!", 'draw');
  }

  updateScoreboard();
}

/**
 * Switch the active player (X → O or O → X).
 */
function switchPlayer() {
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
}

/* ---------------------------------------------------------------------------
   DOM Update Helpers
   --------------------------------------------------------------------------- */

/**
 * Set the text content and modifier class of the status message element.
 *
 * @param {string} message    - Text to display.
 * @param {string} cssClass   - Modifier class (e.g. 'win-x', 'win-o', 'draw').
 */
function showStatusMessage(message, cssClass) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${cssClass}`;
}

/**
 * Update the turn indicator label and colour class to reflect currentPlayer.
 */
function updateTurnIndicator() {
  const p = state.currentPlayer;
  currentPlayerSymbolEl.textContent = p;

  // Swap the .is-x / .is-o modifier
  turnIndicatorEl.classList.remove('is-x', 'is-o');
  turnIndicatorEl.classList.add(p === 'X' ? 'is-x' : 'is-o');

  // Screen-reader friendly update
  turnIndicatorEl.setAttribute(
    'aria-label',
    `Player ${p}'s turn`
  );
}

/**
 * Write current scores to the DOM and apply the .active-player highlight
 * to the scoreboard card for the current player.
 */
function updateScoreboard() {
  scoreXEl.textContent    = state.scores.X;
  scoreOEl.textContent    = state.scores.O;
  scoreDrawEl.textContent = state.scores.draw;

  // Toggle the active-player border highlight
  scoreCardXEl.classList.toggle('active-player', state.currentPlayer === 'X' && state.gameActive);
  scoreCardOEl.classList.toggle('active-player', state.currentPlayer === 'O' && state.gameActive);
}

/**
 * Reset all scores to zero, then start a new game.
 */
function resetScores() {
  state.scores.X    = 0;
  state.scores.O    = 0;
  state.scores.draw = 0;
}

/* ---------------------------------------------------------------------------
   Event Handlers
   --------------------------------------------------------------------------- */

/**
 * Handle a click on the game board.
 * The board uses event delegation — any click bubbles up from a cell.
 *
 * @param {MouseEvent} e
 */
function handleCellClick(e) {
  const cell = e.target.closest('.cell');
  if (!cell) return;             // click outside a cell
  activateCell(cell);
}

/**
 * Handle keyboard input on the game board.
 * Enter or Space activates the currently focused cell.
 *
 * @param {KeyboardEvent} e
 */
function handleKeyboard(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();            // prevent page scroll on Space
  const cell = e.target.closest('.cell');
  if (!cell) return;
  activateCell(cell);
}

/**
 * Core move handler — shared by mouse click and keyboard activation.
 * Validates the move, places the mark, then checks for win/draw/continue.
 *
 * @param {HTMLElement} cell - The cell element to activate.
 */
function activateCell(cell) {
  // Guard: game must be active and cell must be empty
  if (!state.gameActive) return;
  if (cell.classList.contains('taken')) return;

  const index = Number(cell.dataset.index);
  placeMark(index, state.currentPlayer);

  // Check outcome
  const winLine = checkWinner();
  if (winLine) {
    endGame('win', winLine);
    return;
  }

  if (checkDraw()) {
    endGame('draw');
    return;
  }

  // Game continues — pass turn to the next player
  switchPlayer();
  updateTurnIndicator();
  updateScoreboard();
}

/* ---------------------------------------------------------------------------
   Initialisation on DOM Ready
   --------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM references
  boardEl               = document.getElementById('board');
  cellEls               = Array.from(boardEl.querySelectorAll('.cell'));
  turnIndicatorEl       = document.getElementById('turnIndicator');
  currentPlayerSymbolEl = document.getElementById('currentPlayerSymbol');
  statusMessageEl       = document.getElementById('statusMessage');
  newGameBtnEl          = document.getElementById('newGameBtn');
  resetScoreBtnEl       = document.getElementById('resetScoreBtn');
  scoreXEl              = document.getElementById('scoreX');
  scoreOEl              = document.getElementById('scoreO');
  scoreDrawEl           = document.getElementById('scoreDraw');
  scoreCardXEl          = document.getElementById('scoreCardX');
  scoreCardOEl          = document.getElementById('scoreCardO');

  // Wire events
  boardEl.addEventListener('click',   handleCellClick);
  boardEl.addEventListener('keydown', handleKeyboard);

  newGameBtnEl.addEventListener('click', () => {
    initGame();
  });

  resetScoreBtnEl.addEventListener('click', () => {
    resetScores();
    initGame();
  });

  // Kick off the first game
  initGame();
});
