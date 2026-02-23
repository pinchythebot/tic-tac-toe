/**
 * game.coverage.test.js
 *
 * Coverage-focused tests for all DOM-bound functions in game.js.
 *
 * These tests use require() (instead of eval()) so that Jest's coverage
 * instrumentation can track execution of every branch in game.js.
 *
 * Coverage targets:
 *   - init()                           — DOM wiring
 *   - handleMove()                     — win / draw / normal move paths
 *   - startNewGame()                   — board reset
 *   - resetScore()                     — score + board reset
 *   - renderCell()                     — X, O, and empty branches
 *   - updateScoreCardHighlight()       — X and O active branches
 *   - disableEmptyCells()              — aria-disabled on remaining cells
 *   - updateTurnIndicator()            — DOM class + aria-label sync
 *   - updateScoreDisplay()             — scoreX / scoreO / scoreDraw update
 *   - _getState() / _setState()        — state inspection helpers
 */

'use strict';

/* ---------------------------------------------------------------------------
   Minimal HTML that mirrors the structure expected by game.js init()
   --------------------------------------------------------------------------- */
const GAME_HTML = `
<div class="page-wrapper">
  <header class="site-header">
    <h1 class="logo">TIC<span>X</span>TAC<span>O</span>TOE</h1>
  </header>
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
   Helpers
   --------------------------------------------------------------------------- */

/** Return the cell element at position index (0–8). */
function cell(index) {
  return document.querySelector(`[data-index="${index}"]`);
}

/** Get trimmed text content of element by id. */
function text(id) {
  return document.getElementById(id).textContent.trim();
}

/* ---------------------------------------------------------------------------
   Module loading helpers
   --------------------------------------------------------------------------- */

/**
 * Load a fresh copy of game.js into the current jsdom context.
 * Must be called AFTER document.body.innerHTML has been set.
 * Uses jest.resetModules() so every test gets an independent module instance.
 */
function loadGameModule() {
  jest.resetModules();
  const game = require('../game.js');
  // Manually fire DOMContentLoaded to trigger init()
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return game;
}

/* ---------------------------------------------------------------------------
   Setup
   --------------------------------------------------------------------------- */

let game;

beforeEach(() => {
  document.body.innerHTML = GAME_HTML;
  game = loadGameModule();
});

/* ===========================================================================
   init() — DOM wiring
   =========================================================================== */
describe('init() — DOM wiring', () => {
  test('all 9 cells are registered (cells array length)', () => {
    const state = game._getState();
    // Board should be all null after init
    expect(state.board).toHaveLength(9);
    expect(state.board.every((v) => v === null)).toBe(true);
  });

  test('initial currentPlayer is X', () => {
    expect(game._getState().currentPlayer).toBe('X');
  });

  test('initial gameOver is false', () => {
    expect(game._getState().gameOver).toBe(false);
  });

  test('initial scores are all 0', () => {
    expect(game._getState().scores).toEqual({ X: 0, O: 0, draw: 0 });
  });

  test('turnIndicator has is-x class after init', () => {
    expect(document.getElementById('turnIndicator').classList.contains('is-x')).toBe(true);
  });

  test('currentPlayerSymbol shows X after init', () => {
    expect(text('currentPlayerSymbol')).toBe('X');
  });

  test('score display shows 0/0/0 after init', () => {
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('all cells have tabindex=0 (focusable) after init', () => {
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.getAttribute('tabindex')).toBe('0');
    });
  });

  test('scoreCardX has active-player class initially', () => {
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });
});

/* ===========================================================================
   handleMove() — normal move path
   =========================================================================== */
describe('handleMove() — normal move', () => {
  test('places X in board state at the given index', () => {
    game.handleMove(4);
    expect(game._getState().board[4]).toBe('X');
  });

  test('adds x-piece and taken classes to the cell element', () => {
    game.handleMove(0);
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(0).classList.contains('taken')).toBe(true);
  });

  test('sets aria-label to "Cell N, X" when X plays', () => {
    game.handleMove(0); // cell index 0 → position 1
    expect(cell(0).getAttribute('aria-label')).toBe('Cell 1, X');
  });

  test('sets tabindex to -1 after cell is taken', () => {
    game.handleMove(2);
    expect(cell(2).getAttribute('tabindex')).toBe('-1');
  });

  test('switches currentPlayer from X to O after one move', () => {
    game.handleMove(0);
    expect(game._getState().currentPlayer).toBe('O');
  });

  test('places O in board state on second move', () => {
    game.handleMove(0);
    game.handleMove(1);
    expect(game._getState().board[1]).toBe('O');
  });

  test('adds o-piece class to cell after O plays', () => {
    game.handleMove(0); // X
    game.handleMove(1); // O
    expect(cell(1).classList.contains('o-piece')).toBe(true);
    expect(cell(1).classList.contains('taken')).toBe(true);
  });

  test('sets aria-label to "Cell N, O" when O plays', () => {
    game.handleMove(0); // X at position 1
    game.handleMove(1); // O at position 2
    expect(cell(1).getAttribute('aria-label')).toBe('Cell 2, O');
  });

  test('turn indicator switches to O after X moves', () => {
    game.handleMove(0);
    expect(text('currentPlayerSymbol')).toBe('O');
    expect(document.getElementById('turnIndicator').classList.contains('is-o')).toBe(true);
  });

  test('score card highlight moves to O after X takes a turn', () => {
    game.handleMove(0);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(false);
  });

  test('score card highlight moves back to X after O takes a turn', () => {
    game.handleMove(0); // X → now O's turn
    game.handleMove(1); // O → now X's turn
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });

  test('ignores a move on an already-taken cell', () => {
    game.handleMove(4); // X takes 4
    game.handleMove(4); // O tries to take 4 → ignored
    expect(game._getState().board[4]).toBe('X');
    expect(game._getState().currentPlayer).toBe('O'); // turn still O
  });

  test('ignores all moves when gameOver is true', () => {
    game._setState({ gameOver: true });
    game.handleMove(0);
    expect(game._getState().board[0]).toBe(null);
  });
});

/* ===========================================================================
   handleMove() — win detection path (X wins)
   =========================================================================== */
describe('handleMove() — X wins', () => {
  // X wins on top row: X→0, O→3, X→1, O→4, X→2
  function playXWinsTopRow() {
    game.handleMove(0);
    game.handleMove(3);
    game.handleMove(1);
    game.handleMove(4);
    game.handleMove(2);
  }

  test('gameOver becomes true after X wins', () => {
    playXWinsTopRow();
    expect(game._getState().gameOver).toBe(true);
  });

  test('X score increments by 1', () => {
    playXWinsTopRow();
    expect(game._getState().scores.X).toBe(1);
    expect(game._getState().scores.O).toBe(0);
  });

  test('scoreX DOM element shows 1', () => {
    playXWinsTopRow();
    expect(text('scoreX')).toBe('1');
  });

  test('winning cells get the "winning" CSS class', () => {
    playXWinsTopRow();
    expect(cell(0).classList.contains('winning')).toBe(true);
    expect(cell(1).classList.contains('winning')).toBe(true);
    expect(cell(2).classList.contains('winning')).toBe(true);
  });

  test('non-winning cells do NOT get the "winning" class', () => {
    playXWinsTopRow();
    expect(cell(3).classList.contains('winning')).toBe(false);
    expect(cell(4).classList.contains('winning')).toBe(false);
  });

  test('status message reads "Player X wins!"', () => {
    playXWinsTopRow();
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('remaining empty cells get aria-disabled=true', () => {
    playXWinsTopRow(); // cells 5,6,7,8 are still empty
    [5, 6, 7, 8].forEach((i) => {
      expect(cell(i).getAttribute('aria-disabled')).toBe('true');
    });
  });

  test('further moves after win are ignored', () => {
    playXWinsTopRow();
    game.handleMove(5);
    expect(game._getState().board[5]).toBe(null);
  });

  test('X wins on main diagonal [0,4,8]', () => {
    // X:0, O:1, X:4, O:2, X:8
    game.handleMove(0);
    game.handleMove(1);
    game.handleMove(4);
    game.handleMove(2);
    game.handleMove(8);
    expect(game._getState().gameOver).toBe(true);
    expect(cell(0).classList.contains('winning')).toBe(true);
    expect(cell(4).classList.contains('winning')).toBe(true);
    expect(cell(8).classList.contains('winning')).toBe(true);
  });

  test('X wins on anti-diagonal [2,4,6]', () => {
    // X:2, O:0, X:4, O:1, X:6
    game.handleMove(2);
    game.handleMove(0);
    game.handleMove(4);
    game.handleMove(1);
    game.handleMove(6);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on left column [0,3,6]', () => {
    // X:0, O:1, X:3, O:2, X:6
    game.handleMove(0);
    game.handleMove(1);
    game.handleMove(3);
    game.handleMove(2);
    game.handleMove(6);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on middle column [1,4,7]', () => {
    // X:1, O:0, X:4, O:2, X:7
    game.handleMove(1);
    game.handleMove(0);
    game.handleMove(4);
    game.handleMove(2);
    game.handleMove(7);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on right column [2,5,8]', () => {
    // X:2, O:0, X:5, O:1, X:8
    game.handleMove(2);
    game.handleMove(0);
    game.handleMove(5);
    game.handleMove(1);
    game.handleMove(8);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on middle row [3,4,5]', () => {
    // X:3, O:0, X:4, O:1, X:5
    game.handleMove(3);
    game.handleMove(0);
    game.handleMove(4);
    game.handleMove(1);
    game.handleMove(5);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on bottom row [6,7,8]', () => {
    // X:6, O:0, X:7, O:1, X:8
    game.handleMove(6);
    game.handleMove(0);
    game.handleMove(7);
    game.handleMove(1);
    game.handleMove(8);
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player X wins!');
  });
});

/* ===========================================================================
   handleMove() — win detection path (O wins)
   =========================================================================== */
describe('handleMove() — O wins', () => {
  // O wins on middle row [3,4,5]: X:0,2,6  O:3,4,5
  function playOWinsMiddleRow() {
    game.handleMove(0); // X
    game.handleMove(3); // O
    game.handleMove(2); // X
    game.handleMove(4); // O
    game.handleMove(6); // X
    game.handleMove(5); // O wins
  }

  test('gameOver becomes true after O wins', () => {
    playOWinsMiddleRow();
    expect(game._getState().gameOver).toBe(true);
  });

  test('O score increments by 1', () => {
    playOWinsMiddleRow();
    expect(game._getState().scores.O).toBe(1);
    expect(game._getState().scores.X).toBe(0);
  });

  test('scoreO DOM element shows 1', () => {
    playOWinsMiddleRow();
    expect(text('scoreO')).toBe('1');
  });

  test('status message reads "Player O wins!"', () => {
    playOWinsMiddleRow();
    expect(text('statusMessage')).toBe('Player O wins!');
  });

  test('winning cells [3,4,5] get winning class', () => {
    playOWinsMiddleRow();
    [3, 4, 5].forEach((i) => {
      expect(cell(i).classList.contains('winning')).toBe(true);
    });
  });

  test('remaining empty cells disabled after O wins', () => {
    playOWinsMiddleRow(); // cells 1,7,8 are empty
    [1, 7, 8].forEach((i) => {
      expect(cell(i).getAttribute('aria-disabled')).toBe('true');
    });
  });

  test('O wins on top row [0,1,2]', () => {
    // X:3,4,6   O:0,1,2
    game.handleMove(3); // X
    game.handleMove(0); // O
    game.handleMove(4); // X
    game.handleMove(1); // O
    game.handleMove(6); // X
    game.handleMove(2); // O wins
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player O wins!');
  });

  test('O wins on diagonal [0,4,8]', () => {
    // X:1,2,5   O:0,4,8
    game.handleMove(1); // X
    game.handleMove(0); // O
    game.handleMove(2); // X
    game.handleMove(4); // O
    game.handleMove(5); // X
    game.handleMove(8); // O wins
    expect(game._getState().gameOver).toBe(true);
    expect(text('statusMessage')).toBe('Player O wins!');
  });
});

/* ===========================================================================
   handleMove() — draw detection path
   =========================================================================== */
describe('handleMove() — draw', () => {
  // Draw board: X O X / X O O / O X X  (no winner)
  // Moves: X→0, O→1, X→2, O→3, X→5, O→4, X→6, O→8, X→7
  const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];

  function playDraw() {
    DRAW_MOVES.forEach((i) => game.handleMove(i));
  }

  test('gameOver becomes true after a draw', () => {
    playDraw();
    expect(game._getState().gameOver).toBe(true);
  });

  test('draw score increments by 1', () => {
    playDraw();
    expect(game._getState().scores.draw).toBe(1);
    expect(game._getState().scores.X).toBe(0);
    expect(game._getState().scores.O).toBe(0);
  });

  test('scoreDraw DOM element shows 1', () => {
    playDraw();
    expect(text('scoreDraw')).toBe('1');
  });

  test('status message contains "draw"', () => {
    playDraw();
    expect(text('statusMessage').toLowerCase()).toContain('draw');
  });

  test('no further moves accepted after draw', () => {
    playDraw();
    // All cells are full; try re-clicking — state should not change
    const boardBefore = [...game._getState().board];
    game.handleMove(0);
    expect(game._getState().board).toEqual(boardBefore);
  });
});

/* ===========================================================================
   startNewGame() — board reset
   =========================================================================== */
describe('startNewGame()', () => {
  test('clears all board positions to null', () => {
    game.handleMove(0); // X
    game.handleMove(1); // O
    game.startNewGame();
    expect(game._getState().board.every((v) => v === null)).toBe(true);
  });

  test('resets currentPlayer to X', () => {
    game.handleMove(0); // X → now O's turn
    game.startNewGame();
    expect(game._getState().currentPlayer).toBe('X');
  });

  test('resets gameOver to false', () => {
    // X wins on top row
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    expect(game._getState().gameOver).toBe(true);
    game.startNewGame();
    expect(game._getState().gameOver).toBe(false);
  });

  test('clears status message', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    expect(text('statusMessage')).toBe('Player X wins!');
    game.startNewGame();
    expect(text('statusMessage')).toBe('');
  });

  test('preserves existing scores', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins → scores.X = 1
    game.startNewGame();
    expect(game._getState().scores.X).toBe(1);
    expect(text('scoreX')).toBe('1');
  });

  test('removes piece classes from all cells', () => {
    game.handleMove(0); // X
    game.handleMove(1); // O
    game.startNewGame();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('x-piece')).toBe(false);
      expect(c.classList.contains('o-piece')).toBe(false);
      expect(c.classList.contains('taken')).toBe(false);
      expect(c.classList.contains('winning')).toBe(false);
    });
  });

  test('re-enables all cells (tabindex=0) after a win', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.startNewGame();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.getAttribute('tabindex')).toBe('0');
    });
  });

  test('turn indicator shows X after new game', () => {
    game.handleMove(0); // X → O's turn
    game.startNewGame();
    expect(text('currentPlayerSymbol')).toBe('X');
    expect(document.getElementById('turnIndicator').classList.contains('is-x')).toBe(true);
  });

  test('scoreCardX gets active-player after new game', () => {
    game.handleMove(0); // X → O's turn; scoreCardO active
    game.startNewGame();
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });

  test('can play moves after startNewGame', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.startNewGame();
    game.handleMove(0);
    expect(game._getState().board[0]).toBe('X');
  });
});

/* ===========================================================================
   resetScore()
   =========================================================================== */
describe('resetScore()', () => {
  test('resets all scores to 0', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.resetScore();
    expect(game._getState().scores).toEqual({ X: 0, O: 0, draw: 0 });
  });

  test('scoreX DOM element resets to 0', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins (scoreX = 1)
    game.resetScore();
    expect(text('scoreX')).toBe('0');
  });

  test('scoreO DOM element resets to 0', () => {
    // O wins on middle row
    [0, 3, 2, 4, 6, 5].forEach((i) => game.handleMove(i));
    game.resetScore();
    expect(text('scoreO')).toBe('0');
  });

  test('scoreDraw DOM element resets to 0', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => game.handleMove(i)); // draw
    game.resetScore();
    expect(text('scoreDraw')).toBe('0');
  });

  test('also resets the board (startNewGame is called internally)', () => {
    game.handleMove(0);
    game.handleMove(1);
    game.resetScore();
    expect(game._getState().board.every((v) => v === null)).toBe(true);
  });

  test('resets currentPlayer to X', () => {
    game.handleMove(0); // X → now O's turn
    game.resetScore();
    expect(game._getState().currentPlayer).toBe('X');
  });

  test('resets gameOver to false', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.resetScore();
    expect(game._getState().gameOver).toBe(false);
  });

  test('can play a full game after resetScore', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.resetScore();
    game.handleMove(4);
    expect(game._getState().board[4]).toBe('X');
  });
});

/* ===========================================================================
   newGameBtn and resetScoreBtn click events (event wiring)
   =========================================================================== */
describe('Button event wiring', () => {
  test('clicking newGameBtn calls startNewGame', () => {
    game.handleMove(0); // X at 0
    document.getElementById('newGameBtn').click();
    expect(game._getState().board[0]).toBe(null);
  });

  test('clicking resetScoreBtn calls resetScore', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    document.getElementById('resetScoreBtn').click();
    expect(game._getState().scores).toEqual({ X: 0, O: 0, draw: 0 });
    expect(game._getState().board.every((v) => v === null)).toBe(true);
  });
});

/* ===========================================================================
   Cell click events (event wiring via bindCellEvents)
   =========================================================================== */
describe('Cell click event wiring', () => {
  test('clicking cell 0 triggers handleMove(0)', () => {
    cell(0).click();
    expect(game._getState().board[0]).toBe('X');
  });

  test('clicking cell 8 triggers handleMove(8)', () => {
    cell(8).click();
    expect(game._getState().board[8]).toBe('X');
  });

  test('clicking multiple cells plays the game', () => {
    cell(0).click(); // X
    cell(1).click(); // O
    cell(4).click(); // X
    expect(game._getState().board[0]).toBe('X');
    expect(game._getState().board[1]).toBe('O');
    expect(game._getState().board[4]).toBe('X');
  });
});

/* ===========================================================================
   Cell keyboard events (Enter and Space)
   =========================================================================== */
describe('Cell keyboard event wiring', () => {
  function keyCell(index, key) {
    const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    cell(index).dispatchEvent(evt);
  }

  test('pressing Enter on cell 0 triggers handleMove(0)', () => {
    keyCell(0, 'Enter');
    expect(game._getState().board[0]).toBe('X');
  });

  test('pressing Space on cell 3 triggers handleMove(3)', () => {
    keyCell(3, ' ');
    expect(game._getState().board[3]).toBe('X');
  });

  test('pressing Tab on a cell does NOT place a mark', () => {
    keyCell(0, 'Tab');
    expect(game._getState().board[0]).toBe(null);
  });

  test('pressing Arrow keys do NOT place a mark', () => {
    keyCell(0, 'ArrowRight');
    expect(game._getState().board[0]).toBe(null);
  });

  test('Enter on taken cell is ignored', () => {
    keyCell(0, 'Enter'); // X takes cell 0
    keyCell(0, 'Enter'); // O tries → should be ignored
    expect(game._getState().board[0]).toBe('X');
    expect(game._getState().currentPlayer).toBe('O'); // turn is still O
  });
});

/* ===========================================================================
   renderCell() — all three branches
   =========================================================================== */
describe('renderCell() — all cell rendering branches', () => {
  test('empty cell has aria-label "Cell N, empty"', () => {
    // After init all cells are empty
    expect(cell(0).getAttribute('aria-label')).toBe('Cell 1, empty');
    expect(cell(8).getAttribute('aria-label')).toBe('Cell 9, empty');
  });

  test('X cell has aria-label "Cell N, X"', () => {
    game.handleMove(2); // X at index 2 → position 3
    expect(cell(2).getAttribute('aria-label')).toBe('Cell 3, X');
  });

  test('O cell has aria-label "Cell N, O"', () => {
    game.handleMove(0); // X
    game.handleMove(5); // O at index 5 → position 6
    expect(cell(5).getAttribute('aria-label')).toBe('Cell 6, O');
  });

  test('empty cell has aria-disabled=false initially', () => {
    expect(cell(0).getAttribute('aria-disabled')).toBe('false');
  });

  test('removing x-piece class on new game (class removal in renderCell)', () => {
    game.handleMove(3); // X takes cell 3
    expect(cell(3).classList.contains('x-piece')).toBe(true);
    game.startNewGame();
    expect(cell(3).classList.contains('x-piece')).toBe(false);
  });

  test('removing o-piece class on new game (class removal in renderCell)', () => {
    game.handleMove(0); // X
    game.handleMove(3); // O takes cell 3
    expect(cell(3).classList.contains('o-piece')).toBe(true);
    game.startNewGame();
    expect(cell(3).classList.contains('o-piece')).toBe(false);
  });
});

/* ===========================================================================
   updateTurnIndicator() — aria-label and class sync
   =========================================================================== */
describe('updateTurnIndicator()', () => {
  test('turn indicator has aria-label "Player X\'s turn" initially', () => {
    expect(document.getElementById('turnIndicator').getAttribute('aria-label'))
      .toBe("Player X's turn");
  });

  test('turn indicator has aria-label "Player O\'s turn" after X moves', () => {
    game.handleMove(0);
    expect(document.getElementById('turnIndicator').getAttribute('aria-label'))
      .toBe("Player O's turn");
  });

  test('turn indicator class is is-x initially', () => {
    expect(document.getElementById('turnIndicator').className)
      .toContain('is-x');
  });

  test('turn indicator class switches to is-o after X moves', () => {
    game.handleMove(0);
    expect(document.getElementById('turnIndicator').className)
      .toContain('is-o');
  });

  test('currentPlayerSymbol text matches current player', () => {
    expect(text('currentPlayerSymbol')).toBe('X');
    game.handleMove(0);
    expect(text('currentPlayerSymbol')).toBe('O');
    game.handleMove(1);
    expect(text('currentPlayerSymbol')).toBe('X');
  });
});

/* ===========================================================================
   updateScoreCardHighlight() — X active and O active branches
   =========================================================================== */
describe('updateScoreCardHighlight()', () => {
  test('scoreCardX is active initially (X player)', () => {
    const scoreCardX = document.getElementById('scoreCardX');
    const scoreCardO = document.getElementById('scoreCardO');
    expect(scoreCardX.classList.contains('active-player')).toBe(true);
    expect(scoreCardO.classList.contains('active-player')).toBe(false);
  });

  test('scoreCardO becomes active after X plays (O\'s turn)', () => {
    game.handleMove(0); // X plays → now O's turn
    const scoreCardX = document.getElementById('scoreCardX');
    const scoreCardO = document.getElementById('scoreCardO');
    expect(scoreCardO.classList.contains('active-player')).toBe(true);
    expect(scoreCardX.classList.contains('active-player')).toBe(false);
  });

  test('scoreCardX becomes active again after O plays (X\'s turn)', () => {
    game.handleMove(0); // X
    game.handleMove(1); // O → back to X's turn
    const scoreCardX = document.getElementById('scoreCardX');
    const scoreCardO = document.getElementById('scoreCardO');
    expect(scoreCardX.classList.contains('active-player')).toBe(true);
    expect(scoreCardO.classList.contains('active-player')).toBe(false);
  });

  test('O branch executes: scoreCardO adds active-player, scoreCardX removes it', () => {
    // Force state to O's turn and call startNewGame (which calls updateScoreCardHighlight)
    game.handleMove(0); // after this it's O's turn → updateScoreCardHighlight was called for O
    // Verify: O branch was executed
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
  });
});

/* ===========================================================================
   updateScoreDisplay()
   =========================================================================== */
describe('updateScoreDisplay()', () => {
  test('shows 0/0/0 after init', () => {
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('shows 1/0/0 after X wins once', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    expect(text('scoreX')).toBe('1');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('shows 0/1/0 after O wins once', () => {
    [0, 3, 2, 4, 6, 5].forEach((i) => game.handleMove(i)); // O wins
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('1');
    expect(text('scoreDraw')).toBe('0');
  });

  test('shows 0/0/1 after a draw', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => game.handleMove(i));
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('1');
  });
});

/* ===========================================================================
   _getState() and _setState() — state inspection helpers
   =========================================================================== */
describe('_getState() and _setState()', () => {
  test('_getState returns a snapshot (not live reference)', () => {
    const state = game._getState();
    state.board[0] = 'X'; // mutate the snapshot
    expect(game._getState().board[0]).toBe(null); // original unchanged
  });

  test('_getState scores are a snapshot', () => {
    const state = game._getState();
    state.scores.X = 99;
    expect(game._getState().scores.X).toBe(0);
  });

  test('_setState can inject board state', () => {
    game._setState({ board: ['X', 'O', null, null, null, null, null, null, null] });
    expect(game._getState().board[0]).toBe('X');
    expect(game._getState().board[1]).toBe('O');
  });

  test('_setState can set currentPlayer', () => {
    game._setState({ currentPlayer: 'O' });
    expect(game._getState().currentPlayer).toBe('O');
  });

  test('_setState can set gameOver', () => {
    game._setState({ gameOver: true });
    expect(game._getState().gameOver).toBe(true);
  });

  test('_setState can set scores', () => {
    game._setState({ scores: { X: 3, O: 2, draw: 1 } });
    const state = game._getState();
    expect(state.scores).toEqual({ X: 3, O: 2, draw: 1 });
  });

  test('_setState with partial object does not overwrite missing fields', () => {
    // Only set currentPlayer, board should remain unchanged
    game._setState({ currentPlayer: 'O' });
    expect(game._getState().board.every((v) => v === null)).toBe(true);
  });

  test('handleMove respects injected state (board pre-filled)', () => {
    // Inject a board where cell 0 is already taken
    game._setState({
      board: ['X', null, null, null, null, null, null, null, null],
      currentPlayer: 'O',
    });
    game.handleMove(0); // should be ignored (cell taken)
    expect(game._getState().board[0]).toBe('X');
    expect(game._getState().currentPlayer).toBe('O'); // still O
  });
});

/* ===========================================================================
   disableEmptyCells() — via win scenario
   =========================================================================== */
describe('disableEmptyCells() — aria-disabled on empty cells after game ends', () => {
  test('all empty cells have aria-disabled=true after X wins', () => {
    // X: 0,1,2   O: 3,4  — cells 5,6,7,8 remain empty
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    [5, 6, 7, 8].forEach((i) => {
      expect(cell(i).getAttribute('aria-disabled')).toBe('true');
    });
  });

  test('taken cells are NOT given aria-disabled=true (only empty ones are)', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    // Cells 0,1,2,3,4 are taken — they should NOT have aria-disabled=true
    // (they have tabindex=-1 but not aria-disabled=true)
    [0, 1, 2, 3, 4].forEach((i) => {
      expect(cell(i).getAttribute('aria-disabled')).not.toBe('true');
    });
  });

  test('winning cells still have winning class when empty cells are disabled', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i));
    expect(cell(0).classList.contains('winning')).toBe(true);
    expect(cell(5).getAttribute('aria-disabled')).toBe('true');
  });
});

/* ===========================================================================
   Multi-round score accumulation
   =========================================================================== */
describe('Multi-round score accumulation', () => {
  test('X score accumulates over two wins', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins (1)
    game.startNewGame();
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins (2)
    expect(game._getState().scores.X).toBe(2);
    expect(text('scoreX')).toBe('2');
  });

  test('O score accumulates over two wins', () => {
    [0, 3, 2, 4, 6, 5].forEach((i) => game.handleMove(i)); // O wins (1)
    game.startNewGame();
    [0, 3, 2, 4, 6, 5].forEach((i) => game.handleMove(i)); // O wins (2)
    expect(game._getState().scores.O).toBe(2);
    expect(text('scoreO')).toBe('2');
  });

  test('draw score accumulates over two draws', () => {
    const DRAW = [0, 1, 2, 3, 5, 4, 6, 8, 7];
    DRAW.forEach((i) => game.handleMove(i));
    game.startNewGame();
    DRAW.forEach((i) => game.handleMove(i));
    expect(game._getState().scores.draw).toBe(2);
    expect(text('scoreDraw')).toBe('2');
  });

  test('resetScore zeroes all accumulated scores', () => {
    [0, 3, 1, 4, 2].forEach((i) => game.handleMove(i)); // X wins
    game.startNewGame();
    [0, 3, 2, 4, 6, 5].forEach((i) => game.handleMove(i)); // O wins
    game.resetScore();
    expect(game._getState().scores).toEqual({ X: 0, O: 0, draw: 0 });
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });
});
