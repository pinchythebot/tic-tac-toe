/**
 * game.exported-api.test.js
 *
 * Tests for the newly added public API exported by game.js:
 *   - checkWinner(boardState)  → 'X' | 'O' | null
 *   - switchPlayer(current)    → 'X' | 'O'
 *   - checkWin(boardState, player) → number[]|null  (winning line)
 *   - checkDraw(boardState)    → boolean
 *   - WIN_LINES constant
 *   - handleMove / startNewGame / resetScore via _getState / _setState
 *
 * These tests import the ACTUAL module exports (not replicated copies),
 * verifying the real public API surface introduced in the latest commit.
 *
 * Strategy
 * --------
 *  - Pure-logic functions are tested via a top-level require() (no DOM needed).
 *  - DOM-dependent functions are tested using eval() + DOMContentLoaded dispatch
 *    (same pattern as game.dom.test.js) so module-level state is truly fresh
 *    for every test.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/* ---------------------------------------------------------------------------
   Pure module — loaded once at the top for pure-logic tests.
   No DOM interaction; DOMContentLoaded is never fired for this reference.
   --------------------------------------------------------------------------- */
const pureModule = require(GAME_JS_PATH);

/* ---------------------------------------------------------------------------
   Minimal HTML — same structure used by game.dom.test.js
   --------------------------------------------------------------------------- */
const GAME_HTML = `
<div class="page-wrapper">
  <main class="game-container">
    <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite">
      Player <span class="player-symbol" id="currentPlayerSymbol">X</span>'s turn
    </div>
    <div class="board" id="board" role="grid" aria-label="Tic Tac Toe Board">
      <div class="cell" data-index="0" role="gridcell" tabindex="0" aria-label="Cell 1, empty"></div>
      <div class="cell" data-index="1" role="gridcell" tabindex="0" aria-label="Cell 2, empty"></div>
      <div class="cell" data-index="2" role="gridcell" tabindex="0" aria-label="Cell 3, empty"></div>
      <div class="cell" data-index="3" role="gridcell" tabindex="0" aria-label="Cell 4, empty"></div>
      <div class="cell" data-index="4" role="gridcell" tabindex="0" aria-label="Cell 5, empty"></div>
      <div class="cell" data-index="5" role="gridcell" tabindex="0" aria-label="Cell 6, empty"></div>
      <div class="cell" data-index="6" role="gridcell" tabindex="0" aria-label="Cell 7, empty"></div>
      <div class="cell" data-index="7" role="gridcell" tabindex="0" aria-label="Cell 8, empty"></div>
      <div class="cell" data-index="8" role="gridcell" tabindex="0" aria-label="Cell 9, empty"></div>
    </div>
    <div class="status-message" id="statusMessage" aria-live="polite"></div>
    <div class="controls">
      <button class="btn btn-primary" id="newGameBtn" type="button">New Game</button>
      <button class="btn btn-ghost"   id="resetScoreBtn" type="button">Reset Score</button>
    </div>
    <div class="scoreboard" aria-label="Scoreboard">
      <div class="score-card score-x active-player" id="scoreCardX">
        <span class="score-label">Player X</span>
        <span class="score-value" id="scoreX">0</span>
      </div>
      <div class="score-card score-draw" id="scoreCardDraw">
        <span class="score-label">Draws</span>
        <span class="score-value" id="scoreDraw">0</span>
      </div>
      <div class="score-card score-o" id="scoreCardO">
        <span class="score-label">Player O</span>
        <span class="score-value" id="scoreO">0</span>
      </div>
    </div>
  </main>
</div>
`;

/* ---------------------------------------------------------------------------
   DOM test helpers — eval-based approach (mirrors game.dom.test.js)
   --------------------------------------------------------------------------- */

/**
 * Track DOMContentLoaded handlers registered by eval'd game.js so we can
 * cleanly remove them before the next test.
 */
let _capturedDCLHandlers = [];

/**
 * Eval game.js in the current jsdom context, capturing its module.exports so
 * that state-inspection helpers (_getState, _setState, handleMove, etc.) can
 * be called directly.
 *
 * Using eval (rather than require) gives us fresh closure-level state
 * (board, currentPlayer, gameOver, scores) on every call — the same guarantee
 * game.dom.test.js relies on.
 *
 * @returns {object} game.js's module.exports
 */
function loadGame() {
  // Remove DOMContentLoaded listeners from the previous test run
  _capturedDCLHandlers.forEach((h) =>
    document.removeEventListener('DOMContentLoaded', h)
  );
  _capturedDCLHandlers = [];

  const code = fs.readFileSync(GAME_JS_PATH, 'utf8');

  // Intercept addEventListener so we can track the DOMContentLoaded handler
  const originalAEL = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') _capturedDCLHandlers.push(handler);
    return originalAEL(event, handler, ...rest);
  };

  // Temporarily swap out module.exports so game.js's assignment is captured
  const savedExports   = module.exports;
  module.exports       = {};

  // eslint-disable-next-line no-eval
  eval(code);

  const gameExports  = module.exports;   // game.js exports (with fresh state)
  module.exports     = savedExports;     // restore test file's exports

  // Restore native addEventListener
  document.addEventListener = originalAEL;

  // Run game initialisation
  document.dispatchEvent(new Event('DOMContentLoaded'));

  return gameExports;
}

/* ---------------------------------------------------------------------------
   1. checkWinner — newly exported function (tested via module import)
   --------------------------------------------------------------------------- */
describe('Exported checkWinner(boardState)', () => {
  const { checkWinner } = pureModule;

  test('is exported as a function', () => {
    expect(typeof checkWinner).toBe('function');
  });

  test('returns null for an empty board', () => {
    expect(checkWinner(Array(9).fill(null))).toBeNull();
  });

  test('returns null for a partial board with no three-in-a-row', () => {
    const board = Array(9).fill(null);
    board[0] = 'X';
    board[4] = 'O';
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null for a mixed row (X, O, X — no winner)', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'O'; board[2] = 'X';
    expect(checkWinner(board)).toBeNull();
  });

  test('returns "X" when X wins on top row [0,1,2]', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "O" when O wins on top row [0,1,2]', () => {
    const board = Array(9).fill(null);
    board[0] = 'O'; board[1] = 'O'; board[2] = 'O';
    expect(checkWinner(board)).toBe('O');
  });

  test('returns "X" when X wins on middle row [3,4,5]', () => {
    const board = Array(9).fill(null);
    board[3] = 'X'; board[4] = 'X'; board[5] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on bottom row [6,7,8]', () => {
    const board = Array(9).fill(null);
    board[6] = 'X'; board[7] = 'X'; board[8] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on left column [0,3,6]', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[3] = 'X'; board[6] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on centre column [1,4,7]', () => {
    const board = Array(9).fill(null);
    board[1] = 'X'; board[4] = 'X'; board[7] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on right column [2,5,8]', () => {
    const board = Array(9).fill(null);
    board[2] = 'X'; board[5] = 'X'; board[8] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on main diagonal [0,4,8]', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[4] = 'X'; board[8] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "X" when X wins on anti-diagonal [2,4,6]', () => {
    const board = Array(9).fill(null);
    board[2] = 'X'; board[4] = 'X'; board[6] = 'X';
    expect(checkWinner(board)).toBe('X');
  });

  test('returns "O" when O wins on right column [2,5,8]', () => {
    const board = Array(9).fill(null);
    board[2] = 'O'; board[5] = 'O'; board[8] = 'O';
    expect(checkWinner(board)).toBe('O');
  });

  test('returns "O" when O wins on main diagonal [0,4,8]', () => {
    const board = Array(9).fill(null);
    board[0] = 'O'; board[4] = 'O'; board[8] = 'O';
    expect(checkWinner(board)).toBe('O');
  });

  test('returns null for a fully filled draw board', () => {
    // X O X / O O X / X X O — verified no winning line
    const board = ['X', 'O', 'X', 'O', 'O', 'X', 'X', 'X', 'O'];
    expect(checkWinner(board)).toBeNull();
  });

  test('returns the winner SYMBOL (string), not a line array', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    const result = checkWinner(board);
    expect(typeof result).toBe('string');
    expect(result).toBe('X');
  });

  test('detects a winner on a nearly-full board', () => {
    // X O X / O X O / X _ X — X wins on [0,4,8]
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'X', null, 'X'];
    expect(checkWinner(board)).toBe('X');
  });

  test('returns null when only 2 in a row (one cell still null)', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; // board[2] is null
    expect(checkWinner(board)).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
   2. checkWinner vs checkWin — verify they are distinct exported functions
   --------------------------------------------------------------------------- */
describe('checkWinner() vs checkWin() — API distinction', () => {
  const { checkWinner, checkWin } = pureModule;

  test('both are exported as functions', () => {
    expect(typeof checkWinner).toBe('function');
    expect(typeof checkWin).toBe('function');
  });

  test('they are different functions', () => {
    expect(checkWinner).not.toBe(checkWin);
  });

  test('checkWinner returns the player symbol (string); checkWin returns the line (array)', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';

    const winner = checkWinner(board);   // → 'X'
    const line   = checkWin(board, 'X'); // → [0, 1, 2]

    expect(winner).toBe('X');
    expect(line).toEqual([0, 1, 2]);
  });

  test('both return null when there is no winner', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[4] = 'O';

    expect(checkWinner(board)).toBeNull();
    expect(checkWin(board, 'X')).toBeNull();
    expect(checkWin(board, 'O')).toBeNull();
  });

  test('checkWinner detects O; checkWin(board,"X") still null for same board', () => {
    const board = Array(9).fill(null);
    board[3] = 'O'; board[4] = 'O'; board[5] = 'O';

    expect(checkWinner(board)).toBe('O');
    expect(checkWin(board, 'X')).toBeNull();
    expect(checkWin(board, 'O')).toEqual([3, 4, 5]);
  });
});

/* ---------------------------------------------------------------------------
   3. switchPlayer — newly exported function
   --------------------------------------------------------------------------- */
describe('Exported switchPlayer(current)', () => {
  const { switchPlayer } = pureModule;

  test('is exported as a function', () => {
    expect(typeof switchPlayer).toBe('function');
  });

  test('switches "X" to "O"', () => {
    expect(switchPlayer('X')).toBe('O');
  });

  test('switches "O" to "X"', () => {
    expect(switchPlayer('O')).toBe('X');
  });

  test('double-switch is the identity (returns original player)', () => {
    expect(switchPlayer(switchPlayer('X'))).toBe('X');
    expect(switchPlayer(switchPlayer('O'))).toBe('O');
  });

  test('alternates correctly through 10 consecutive switches starting with X', () => {
    let current = 'X';
    const expected = ['O', 'X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
    const actual = expected.map(() => {
      current = switchPlayer(current);
      return current;
    });
    expect(actual).toEqual(expected);
  });

  test('result is always either "X" or "O"', () => {
    expect(['X', 'O']).toContain(switchPlayer('X'));
    expect(['X', 'O']).toContain(switchPlayer('O'));
  });

  test('result is always a string', () => {
    expect(typeof switchPlayer('X')).toBe('string');
    expect(typeof switchPlayer('O')).toBe('string');
  });
});

/* ---------------------------------------------------------------------------
   4. checkWin — existing internal export, now verified via module
   --------------------------------------------------------------------------- */
describe('Exported checkWin(boardState, player)', () => {
  const { checkWin } = pureModule;

  test('is exported as a function', () => {
    expect(typeof checkWin).toBe('function');
  });

  test('returns null when the player has no three-in-a-row', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[4] = 'X';
    expect(checkWin(board, 'X')).toBeNull();
  });

  test('returns the winning line array for X on top row', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    expect(checkWin(board, 'X')).toEqual([0, 1, 2]);
  });

  test('returns null for O when only X has the top row', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    expect(checkWin(board, 'O')).toBeNull();
  });

  test('returns the winning line array for O on left column [0,3,6]', () => {
    const board = Array(9).fill(null);
    board[0] = 'O'; board[3] = 'O'; board[6] = 'O';
    expect(checkWin(board, 'O')).toEqual([0, 3, 6]);
  });

  test('returns the FIRST matching line when multiple lines win simultaneously', () => {
    const board = Array(9).fill(null);
    // Both top row [0,1,2] and middle row [3,4,5] win for X
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    board[3] = 'X'; board[4] = 'X'; board[5] = 'X';
    expect(checkWin(board, 'X')).toEqual([0, 1, 2]); // first in WIN_LINES
  });

  test('returns anti-diagonal [2,4,6] when X wins there', () => {
    const board = Array(9).fill(null);
    board[2] = 'X'; board[4] = 'X'; board[6] = 'X';
    expect(checkWin(board, 'X')).toEqual([2, 4, 6]);
  });
});

/* ---------------------------------------------------------------------------
   5. checkDraw — existing exported function, now verified via module
   --------------------------------------------------------------------------- */
describe('Exported checkDraw(boardState)', () => {
  const { checkDraw } = pureModule;

  test('is exported as a function', () => {
    expect(typeof checkDraw).toBe('function');
  });

  test('returns false for an empty board', () => {
    expect(checkDraw(Array(9).fill(null))).toBe(false);
  });

  test('returns false for a partially filled board', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[4] = 'O';
    expect(checkDraw(board)).toBe(false);
  });

  test('returns false when only one cell is null', () => {
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
    expect(checkDraw(board)).toBe(false);
  });

  test('returns true for a fully filled draw board', () => {
    // X O X / O O X / X X O — draw
    const board = ['X', 'O', 'X', 'O', 'O', 'X', 'X', 'X', 'O'];
    expect(checkDraw(board)).toBe(true);
  });

  test('returns true even for an all-X board (tests fullness only)', () => {
    expect(checkDraw(Array(9).fill('X'))).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   6. WIN_LINES — exported constant
   --------------------------------------------------------------------------- */
describe('Exported WIN_LINES constant', () => {
  const { WIN_LINES } = pureModule;

  test('is exported as an array', () => {
    expect(Array.isArray(WIN_LINES)).toBe(true);
  });

  test('has exactly 8 lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  test('every line contains exactly 3 indices', () => {
    WIN_LINES.forEach((line) => expect(line).toHaveLength(3));
  });

  test('all indices are integers in range 0–8', () => {
    WIN_LINES.forEach((line) => {
      line.forEach((idx) => {
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(8);
      });
    });
  });

  test('includes all 3 row lines', () => {
    expect(WIN_LINES).toContainEqual([0, 1, 2]);
    expect(WIN_LINES).toContainEqual([3, 4, 5]);
    expect(WIN_LINES).toContainEqual([6, 7, 8]);
  });

  test('includes all 3 column lines', () => {
    expect(WIN_LINES).toContainEqual([0, 3, 6]);
    expect(WIN_LINES).toContainEqual([1, 4, 7]);
    expect(WIN_LINES).toContainEqual([2, 5, 8]);
  });

  test('includes both diagonal lines', () => {
    expect(WIN_LINES).toContainEqual([0, 4, 8]);
    expect(WIN_LINES).toContainEqual([2, 4, 6]);
  });

  test('all 8 lines are unique', () => {
    const serialized = WIN_LINES.map((l) => l.join(','));
    const unique = new Set(serialized);
    expect(unique.size).toBe(WIN_LINES.length);
  });
});

/* ---------------------------------------------------------------------------
   7. handleMove / _getState / _setState — DOM-dependent API
   Uses eval (like game.dom.test.js) for guaranteed fresh module state.
   --------------------------------------------------------------------------- */
describe('Exported handleMove() + _getState() + _setState()', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = GAME_HTML;
    game = loadGame();
  });

  test('handleMove, _getState, _setState are all exported', () => {
    expect(typeof game.handleMove).toBe('function');
    expect(typeof game._getState).toBe('function');
    expect(typeof game._setState).toBe('function');
  });

  test('_getState returns correct initial state after init', () => {
    const state = game._getState();
    expect(state.board).toEqual(Array(9).fill(null));
    expect(state.currentPlayer).toBe('X');
    expect(state.gameOver).toBe(false);
    expect(state.scores).toEqual({ X: 0, O: 0, draw: 0 });
  });

  test('handleMove(0) places X at index 0 and switches to O', () => {
    game.handleMove(0);
    const { board, currentPlayer } = game._getState();
    expect(board[0]).toBe('X');
    expect(currentPlayer).toBe('O');
  });

  test('handleMove on a taken cell is a no-op', () => {
    game.handleMove(0); // X takes 0
    game.handleMove(0); // O tries same cell → no-op
    const { board, currentPlayer } = game._getState();
    expect(board[0]).toBe('X');      // still X's mark
    expect(currentPlayer).toBe('O'); // turn still O (O never moved)
  });

  test('handleMove after gameOver is a no-op', () => {
    game._setState({ gameOver: true });
    game.handleMove(3);
    const { board } = game._getState();
    expect(board[3]).toBeNull();
  });

  test('_setState correctly injects board state', () => {
    const customBoard = ['X', null, null, null, 'O', null, null, null, null];
    game._setState({ board: customBoard });
    expect(game._getState().board).toEqual(customBoard);
  });

  test('_setState correctly sets currentPlayer', () => {
    game._setState({ currentPlayer: 'O' });
    expect(game._getState().currentPlayer).toBe('O');
  });

  test('_setState correctly sets gameOver flag', () => {
    game._setState({ gameOver: true });
    expect(game._getState().gameOver).toBe(true);
  });

  test('_setState correctly injects scores', () => {
    game._setState({ scores: { X: 5, O: 3, draw: 2 } });
    expect(game._getState().scores).toEqual({ X: 5, O: 3, draw: 2 });
  });

  test('handleMove sequence of 3 moves updates board correctly', () => {
    game.handleMove(0); // X
    game.handleMove(4); // O
    game.handleMove(1); // X
    const { board, currentPlayer } = game._getState();
    expect(board[0]).toBe('X');
    expect(board[4]).toBe('O');
    expect(board[1]).toBe('X');
    expect(currentPlayer).toBe('O');
  });

  test('win sets gameOver=true and increments winner score', () => {
    // X: 0,1,2  O: 3,4
    game.handleMove(0);
    game.handleMove(3);
    game.handleMove(1);
    game.handleMove(4);
    game.handleMove(2); // X wins!
    const { gameOver, scores } = game._getState();
    expect(gameOver).toBe(true);
    expect(scores.X).toBe(1);
    expect(scores.O).toBe(0);
  });

  test('draw sets gameOver=true and increments draw score', () => {
    // Draw board: X O X / O O X / X X O  — move order verified no mid-game win
    const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];
    DRAW_MOVES.forEach((i) => game.handleMove(i));
    const { gameOver, scores } = game._getState();
    expect(gameOver).toBe(true);
    expect(scores.draw).toBe(1);
    expect(scores.X).toBe(0);
    expect(scores.O).toBe(0);
  });
});

/* ---------------------------------------------------------------------------
   8. startNewGame — exported DOM-dependent function
   --------------------------------------------------------------------------- */
describe('Exported startNewGame()', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = GAME_HTML;
    game = loadGame();
  });

  test('startNewGame is exported as a function', () => {
    expect(typeof game.startNewGame).toBe('function');
  });

  test('resets board to all-null after some moves', () => {
    game.handleMove(0);
    game.startNewGame();
    expect(game._getState().board).toEqual(Array(9).fill(null));
  });

  test('resets currentPlayer to "X"', () => {
    game.handleMove(0); // X plays → switches to O
    game.startNewGame();
    expect(game._getState().currentPlayer).toBe('X');
  });

  test('clears the gameOver flag', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    expect(game._getState().gameOver).toBe(true);
    game.startNewGame();
    expect(game._getState().gameOver).toBe(false);
  });

  test('preserves scores after a win', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    const scoresBefore = { ...game._getState().scores };
    game.startNewGame();
    expect(game._getState().scores).toEqual(scoresBefore);
  });

  test('allows new moves after startNewGame', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.startNewGame();
    game.handleMove(5);
    expect(game._getState().board[5]).toBe('X');
  });
});

/* ---------------------------------------------------------------------------
   9. resetScore — exported DOM-dependent function
   --------------------------------------------------------------------------- */
describe('Exported resetScore()', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = GAME_HTML;
    game = loadGame();
  });

  test('resetScore is exported as a function', () => {
    expect(typeof game.resetScore).toBe('function');
  });

  test('resets all scores to zero', () => {
    // Accumulate scores: X wins, new game, X wins again
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    game.startNewGame();
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    game.resetScore();
    expect(game._getState().scores).toEqual({ X: 0, O: 0, draw: 0 });
  });

  test('also resets the board to all-null (implies startNewGame)', () => {
    game.handleMove(0);
    game.handleMove(1);
    game.resetScore();
    expect(game._getState().board).toEqual(Array(9).fill(null));
  });

  test('resets currentPlayer to "X"', () => {
    game.handleMove(0); // X → now O's turn
    game.resetScore();
    expect(game._getState().currentPlayer).toBe('X');
  });

  test('clears the gameOver flag', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.resetScore();
    expect(game._getState().gameOver).toBe(false);
  });

  test('allows a full new game to be played after resetScore', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.resetScore();
    game.handleMove(0);
    const { board, scores } = game._getState();
    expect(board[0]).toBe('X');
    expect(scores.X).toBe(0); // not yet won in the fresh game
  });
});

/* ---------------------------------------------------------------------------
   10. init — exported function
   --------------------------------------------------------------------------- */
describe('Exported init()', () => {
  test('init is exported as a function', () => {
    expect(typeof pureModule.init).toBe('function');
  });
});

/* ---------------------------------------------------------------------------
   11. Integration — checkWinner and switchPlayer working together
   --------------------------------------------------------------------------- */
describe('Integration: checkWinner + switchPlayer game loop simulation', () => {
  // Access lazily since pureModule is a top-level require
  const { checkWinner, switchPlayer, checkDraw } = pureModule;

  /**
   * Simulate a game by applying a move sequence and tracking
   * winner/draw detection using the exported pure functions.
   */
  function simulateGame(moveSequence) {
    const board = Array(9).fill(null);
    let player = 'X';
    for (const idx of moveSequence) {
      if (board[idx] !== null) continue; // skip taken cells
      board[idx] = player;
      const winner = checkWinner(board);
      if (winner) return { winner, draw: false, finalBoard: board };
      if (checkDraw(board)) return { winner: null, draw: true, finalBoard: board };
      player = switchPlayer(player);
    }
    return { winner: null, draw: false, finalBoard: board };
  }

  test('X wins on top row via simulateGame', () => {
    const result = simulateGame([0, 3, 1, 4, 2]);
    expect(result.winner).toBe('X');
    expect(result.draw).toBe(false);
  });

  test('O wins on middle row via simulateGame', () => {
    const result = simulateGame([0, 3, 2, 4, 6, 5]);
    expect(result.winner).toBe('O');
    expect(result.draw).toBe(false);
  });

  test('X wins on main diagonal via simulateGame', () => {
    const result = simulateGame([0, 1, 4, 2, 8]);
    expect(result.winner).toBe('X');
    expect(result.draw).toBe(false);
  });

  test('game ends in draw via simulateGame', () => {
    // X O X / O O X / X X O — verified draw board
    const result = simulateGame([0, 1, 2, 3, 5, 4, 6, 8, 7]);
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(true);
  });

  test('checkWinner returns null mid-game', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'O'; board[4] = 'X';
    expect(checkWinner(board)).toBeNull();
    expect(checkDraw(board)).toBe(false);
  });

  test('switchPlayer returns the next player correctly after each move', () => {
    // Track who plays each move and verify switchPlayer drives alternation
    const moves   = [0, 3, 1, 4, 2];
    const players = ['X', 'O', 'X', 'O', 'X'];
    let   current = 'X';
    const board   = Array(9).fill(null);

    moves.forEach((idx, i) => {
      expect(current).toBe(players[i]);
      board[idx] = current;
      if (!checkWinner(board)) current = switchPlayer(current);
    });

    expect(checkWinner(board)).toBe('X');
  });

  test('winner detection is consistent with switchPlayer turn tracking', () => {
    const board  = Array(9).fill(null);
    let player   = 'X';
    const moves  = [0, 3, 1, 4, 2]; // X wins

    // No winner during the first 4 moves
    for (let i = 0; i < moves.length - 1; i++) {
      board[moves[i]] = player;
      expect(checkWinner(board)).toBeNull();
      player = switchPlayer(player);
    }
    // Final winning move
    board[moves[moves.length - 1]] = player;
    expect(checkWinner(board)).toBe('X');
  });
});
