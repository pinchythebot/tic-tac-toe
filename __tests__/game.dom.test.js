/**
 * game.dom.test.js
 *
 * DOM integration tests for the Tic-Tac-Toe game.
 * Uses jsdom (via Jest's default testEnvironment) to load the full game.js
 * and test behaviour through DOM interactions.
 *
 * Strategy
 * --------
 * 1. Before each test, set document.body.innerHTML to replicate index.html.
 * 2. Load + eval game.js so the DOMContentLoaded listener is registered.
 * 3. Fire DOMContentLoaded to run the game's init code.
 * 4. Test by querying/dispatching events on real DOM elements.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/** Minimal HTML structure that mirrors index.html. */
const GAME_HTML = `
<div class="page-wrapper">
  <header class="site-header">
    <h1 class="logo">TIC<span class="x-color">✕</span>TAC<span class="o-color">○</span>TOE</h1>
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

/** Simulate a mouse click on cell at index. */
function clickCell(index) {
  cell(index).click();
}

/** Dispatch a keyboard event on cell at index. */
function keyCell(index, key) {
  const evt = new KeyboardEvent('keydown', { key, bubbles: true });
  cell(index).dispatchEvent(evt);
}

/** Get text content of an element by id. */
function text(id) {
  return document.getElementById(id).textContent.trim();
}

/* ---------------------------------------------------------------------------
   Setup / Teardown
   --------------------------------------------------------------------------- */

/**
 * Track captured DOMContentLoaded handlers so we can remove them before
 * the next test.  Without this, every beforeEach stacks a new handler on
 * `document`, causing scores and state to accumulate across tests.
 */
let _capturedDCLHandlers = [];

/**
 * Load and execute game.js in the current jsdom context, then fire
 * DOMContentLoaded exactly once.
 *
 * Intercepts document.addEventListener to track the DOMContentLoaded handler
 * so it can be unregistered before the next test.
 */
function loadGame() {
  // Remove handlers registered by previous test runs
  _capturedDCLHandlers.forEach((h) =>
    document.removeEventListener('DOMContentLoaded', h)
  );
  _capturedDCLHandlers = [];

  const code = fs.readFileSync(GAME_JS_PATH, 'utf8');

  // Intercept addEventListener to capture the DOMContentLoaded handler
  const originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') {
      _capturedDCLHandlers.push(handler);
    }
    return originalAddEventListener(event, handler, ...rest);
  };

  // eslint-disable-next-line no-eval
  eval(code);

  // Restore native addEventListener
  document.addEventListener = originalAddEventListener;

  // Trigger game initialisation exactly once
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

beforeEach(() => {
  document.body.innerHTML = GAME_HTML;
  loadGame();
});

/* ---------------------------------------------------------------------------
   Initial State
   --------------------------------------------------------------------------- */
describe('Initial game state', () => {
  test('all cells are empty (no x-piece / o-piece class)', () => {
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('x-piece')).toBe(false);
      expect(c.classList.contains('o-piece')).toBe(false);
      expect(c.classList.contains('taken')).toBe(false);
    });
  });

  test('turn indicator shows Player X initially', () => {
    expect(text('currentPlayerSymbol')).toBe('X');
    expect(document.getElementById('turnIndicator').classList.contains('is-x')).toBe(true);
    expect(document.getElementById('turnIndicator').classList.contains('is-o')).toBe(false);
  });

  test('status message is empty initially', () => {
    expect(text('statusMessage')).toBe('');
  });

  test('scores are all zero initially', () => {
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('all cells are focusable (tabindex="0") initially', () => {
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.getAttribute('tabindex')).toBe('0');
    });
  });

  test('scoreCardX has active-player class initially', () => {
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   Placing Marks
   --------------------------------------------------------------------------- */
describe('Placing marks on cells', () => {
  test('clicking a cell adds x-piece class to it', () => {
    clickCell(0);
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(0).classList.contains('taken')).toBe(true);
  });

  test('second click (by O) adds o-piece class', () => {
    clickCell(0);
    clickCell(1);
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(1).classList.contains('o-piece')).toBe(true);
  });

  test('clicking an already-taken cell does not change its mark', () => {
    clickCell(4); // X takes 4
    clickCell(4); // O tries to take 4 → should be ignored
    expect(cell(4).classList.contains('x-piece')).toBe(true);
    expect(cell(4).classList.contains('o-piece')).toBe(false);
  });

  test('aria-label updates when a cell is marked', () => {
    clickCell(0);
    expect(cell(0).getAttribute('aria-label')).toBe('Cell 1, X');
  });

  test('taken cell becomes non-focusable (tabindex="-1")', () => {
    clickCell(0);
    expect(cell(0).getAttribute('tabindex')).toBe('-1');
  });
});

/* ---------------------------------------------------------------------------
   Turn Switching
   --------------------------------------------------------------------------- */
describe('Turn indicator updates', () => {
  test('after one move turn indicator switches to O', () => {
    clickCell(0);
    expect(text('currentPlayerSymbol')).toBe('O');
    expect(document.getElementById('turnIndicator').classList.contains('is-o')).toBe(true);
  });

  test('after two moves indicator is back to X', () => {
    clickCell(0);
    clickCell(1);
    expect(text('currentPlayerSymbol')).toBe('X');
    expect(document.getElementById('turnIndicator').classList.contains('is-x')).toBe(true);
  });

  test('active-player on scoreboard follows current player', () => {
    // After X moves → O's turn → scoreCardO gets active-player
    clickCell(0);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   Keyboard Navigation
   --------------------------------------------------------------------------- */
describe('Keyboard interaction', () => {
  test('pressing Enter on an empty cell places a mark', () => {
    keyCell(3, 'Enter');
    expect(cell(3).classList.contains('x-piece')).toBe(true);
  });

  test('pressing Space on an empty cell places a mark', () => {
    keyCell(5, ' ');
    expect(cell(5).classList.contains('x-piece')).toBe(true);
  });

  test('pressing Tab key on a cell does nothing', () => {
    keyCell(0, 'Tab');
    expect(cell(0).classList.contains('x-piece')).toBe(false);
    expect(cell(0).classList.contains('taken')).toBe(false);
  });

  test('Enter on a taken cell is ignored', () => {
    clickCell(0);           // X takes cell 0
    keyCell(0, 'Enter');    // try to overwrite with O
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(0).classList.contains('o-piece')).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   Win Detection
   --------------------------------------------------------------------------- */
describe('Win detection', () => {
  /**
   * Play moves in order: X→indices[0], O→indices[1], X→indices[2], ...
   * Returns the current status message text.
   */
  function playMoves(indices) {
    indices.forEach((i) => clickCell(i));
  }

  test('X wins on top row → status shows "Player X wins!"', () => {
    // X: 0,1,2   O: 3,4
    playMoves([0, 3, 1, 4, 2]);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('O wins on middle row → status shows "Player O wins!"', () => {
    // X: 0,2,6   O: 3,4,5
    playMoves([0, 3, 2, 4, 6, 5]);
    expect(text('statusMessage')).toBe('Player O wins!');
  });

  test('X wins on the left column', () => {
    // X: 0,3,6   O: 1,2
    playMoves([0, 1, 3, 2, 6]);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on the main diagonal', () => {
    // X: 0,4,8   O: 1,2
    playMoves([0, 1, 4, 2, 8]);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('X wins on the anti-diagonal', () => {
    // X: 2,4,6   O: 0,1
    playMoves([2, 0, 4, 1, 6]);
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('winning cells get the "winning" CSS class', () => {
    // X: 0,1,2   O: 3,4
    playMoves([0, 3, 1, 4, 2]);
    expect(cell(0).classList.contains('winning')).toBe(true);
    expect(cell(1).classList.contains('winning')).toBe(true);
    expect(cell(2).classList.contains('winning')).toBe(true);
  });

  test('non-winning cells do NOT get the "winning" class', () => {
    playMoves([0, 3, 1, 4, 2]);
    // O's cells (3, 4) should not be winning
    expect(cell(3).classList.contains('winning')).toBe(false);
    expect(cell(4).classList.contains('winning')).toBe(false);
  });

  test('score increments for the winner', () => {
    playMoves([0, 3, 1, 4, 2]); // X wins
    expect(text('scoreX')).toBe('1');
    expect(text('scoreO')).toBe('0');
  });

  test('no more moves accepted after a win', () => {
    playMoves([0, 3, 1, 4, 2]); // X wins
    clickCell(5); // Should be ignored — game over
    expect(cell(5).classList.contains('x-piece')).toBe(false);
    expect(cell(5).classList.contains('o-piece')).toBe(false);
  });

  test('empty cells are disabled (aria-disabled=true) after win', () => {
    playMoves([0, 3, 1, 4, 2]); // X wins
    // Cell 5 was never played
    expect(cell(5).getAttribute('aria-disabled')).toBe('true');
  });
});

/* ---------------------------------------------------------------------------
   Draw Detection
   --------------------------------------------------------------------------- */
describe('Draw detection', () => {
  // Force a draw:
  // X O X
  // X O X
  // O X O
  // Moves: X0, O1, X2, X3, O4, X5, O6, X7, O8
  // Wait — that gives X three in a row at [0,3,... no
  // Let me plan carefully:
  // X O X
  // O X O
  // O X O  — winner check: diag [0,4,8]=X,X,O nope; row [0,1,2]=X,O,X nope
  //          col [1,4,7]=O,X,X nope; no winner → draw
  // Moves: X0, O1, X4, O3, X2, O5, X7, O6, X8 → but [0,4,8] = X,X,X → win for X!
  // Let me use a proper no-win full board:
  // X O X
  // X O O
  // O X X
  // Board: [X,O,X, X,O,O, O,X,X] - check winners:
  // row0=XOX no; row1=XOO no; row2=OXX no
  // col0=XXO no; col1=OOX no; col2=XOX no
  // diag0=[0,4,8]=X,O,X no; diag1=[2,4,6]=X,O,O no → draw!
  // Moves sequence (X,O alternating): 0,1,2,3,4,5,8,7,6
  // X takes: 0,2,4,8,6 ... wait that gives diag [2,4,6]=X,O,X? 4 is O here
  // Let me be more careful about which player plays which:
  // Move 1: X→0; Move 2: O→1; Move 3: X→2; Move 4: O→3; Move 5: X→4
  // Board so far: [X,O,X, O,X,_,_,_,_]
  // Move 6: O→5; Move 7: X→8; Move 8: O→7; Move 9: X→6
  // Final: [X,O,X, O,X,O, X,O,X]
  // row0=XOX no; row1=OXO no; row2=XOX no
  // col0=XOX no; col1=OXO no; col2=XOX no
  // diag0=[X,X,X]=[0,4,8] → X WINS! Not a draw.

  // I need a board where no line of 3 is the same.
  // Classic draw board for tic-tac-toe:
  // X O X
  // O O X
  // X X O
  // [X,O,X, O,O,X, X,X,O]
  // row0=XOX no; row1=OOX no; row2=XXO no
  // col0=XOX no; col1=OOX no; col2=XXO no
  // diag0=[X,O,O]=[0,4,8] no; diag1=[X,O,X]=[2,4,6] no → DRAW!
  // Sequence: X0, O1, X2, O3, O4?? NO - O can't play twice
  // Let me do: X→0, O→1, X→2, O→3, X→5, O→4, X→6, O→8, X→7
  // Final: [X,O,X, O,O,X, X,X,O]? Let's check:
  // idx:    0  1  2  3  4  5  6  7  8
  // Player: X  O  X  O  O  X  X  X  O → O played 3 times, X played 5 times... wrong
  // Actually 9 cells, X plays 5 times, O plays 4 times
  // X plays: 0,2,5,6,7 (5 times); O plays: 1,3,4,8 (4 times)
  // Wait idx 4 is O but X played 5 and O played 4 - O plays 4, X plays 5 → X starts
  // X→0, O→1, X→2, O→3, X→5, O→4, X→6, O→8, X→7
  // board: 0=X,1=O,2=X,3=O,4=O,5=X,6=X,7=X,8=O → that's 5X and 4O ✓
  // Check lines:
  // [0,1,2]=X,O,X no; [3,4,5]=O,O,X no; [6,7,8]=X,X,O no
  // [0,3,6]=X,O,X no; [1,4,7]=O,O,X no; [2,5,8]=X,X,O no
  // [0,4,8]=X,O,O no; [2,4,6]=X,O,X no → DRAW! ✓
  // But we need to check mid-game: after X→5, board=[X,O,X,O,O,X,_,_,_]
  // no winner yet; after O→4, board=[X,O,X,O,O,X,_,_,_]... X plays [0,2,5] - no 3 in a row yet ✓

  const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];

  test('recognises a draw correctly', () => {
    DRAW_MOVES.forEach((i) => clickCell(i));
    expect(text('statusMessage')).toContain("draw");
  });

  test('draw score increments', () => {
    DRAW_MOVES.forEach((i) => clickCell(i));
    expect(text('scoreDraw')).toBe('1');
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
  });

  test('no moves accepted after a draw', () => {
    DRAW_MOVES.forEach((i) => clickCell(i));
    // All 9 cells taken already in this draw scenario — verify no changes
    const classListBefore = Array.from(document.querySelectorAll('.cell')).map(
      (c) => c.className
    );
    // Attempting another click won't change anything
    clickCell(0);
    const classListAfter = Array.from(document.querySelectorAll('.cell')).map(
      (c) => c.className
    );
    expect(classListAfter).toEqual(classListBefore);
  });
});

/* ---------------------------------------------------------------------------
   New Game Button
   --------------------------------------------------------------------------- */
describe('New Game button', () => {
  test('clicking New Game resets the board', () => {
    clickCell(0); // X plays
    clickCell(1); // O plays
    document.getElementById('newGameBtn').click();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('x-piece')).toBe(false);
      expect(c.classList.contains('o-piece')).toBe(false);
      expect(c.classList.contains('taken')).toBe(false);
    });
  });

  test('clicking New Game clears the status message', () => {
    // X wins
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(text('statusMessage')).toBe('Player X wins!');
    document.getElementById('newGameBtn').click();
    expect(text('statusMessage')).toBe('');
  });

  test('clicking New Game resets player to X', () => {
    clickCell(0); // X
    clickCell(1); // O → now X's turn again
    clickCell(2); // X → now O's turn
    document.getElementById('newGameBtn').click();
    expect(text('currentPlayerSymbol')).toBe('X');
  });

  test('clicking New Game preserves scores', () => {
    // X wins
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(text('scoreX')).toBe('1');
    document.getElementById('newGameBtn').click();
    expect(text('scoreX')).toBe('1'); // score preserved
  });

  test('clicking New Game makes all cells interactive again', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins
    document.getElementById('newGameBtn').click();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.getAttribute('tabindex')).toBe('0');
      expect(c.getAttribute('aria-disabled')).toBe('false');
    });
  });

  test('can play a full game after New Game', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins
    document.getElementById('newGameBtn').click();
    clickCell(0); // X can click again
    expect(cell(0).classList.contains('x-piece')).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   Reset Score Button
   --------------------------------------------------------------------------- */
describe('Reset Score button', () => {
  test('clicking Reset Score sets all scores to 0', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins (score X = 1)
    document.getElementById('newGameBtn').click();
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins again (score X = 2)
    document.getElementById('resetScoreBtn').click();
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('clicking Reset Score also starts a new game (board cleared)', () => {
    clickCell(0);
    clickCell(1);
    document.getElementById('resetScoreBtn').click();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('taken')).toBe(false);
    });
  });
});

/* ---------------------------------------------------------------------------
   Multiple game rounds (accumulated scores)
   --------------------------------------------------------------------------- */
describe('Multiple game rounds', () => {
  test('X score accumulates over multiple wins', () => {
    // Round 1: X wins
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    document.getElementById('newGameBtn').click();
    // Round 2: X wins again
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(text('scoreX')).toBe('2');
  });

  test('O score accumulates over multiple wins', () => {
    // Round 1: O wins on middle row (X:0,2,6  O:3,4,5)
    [0, 3, 2, 4, 6, 5].forEach((i) => clickCell(i));
    document.getElementById('newGameBtn').click();
    // Round 2: O wins again
    [0, 3, 2, 4, 6, 5].forEach((i) => clickCell(i));
    expect(text('scoreO')).toBe('2');
  });

  test('draw score accumulates over multiple draws', () => {
    const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];
    DRAW_MOVES.forEach((i) => clickCell(i));
    document.getElementById('newGameBtn').click();
    DRAW_MOVES.forEach((i) => clickCell(i));
    expect(text('scoreDraw')).toBe('2');
  });
});

/* ---------------------------------------------------------------------------
   Accessibility attributes
   --------------------------------------------------------------------------- */
describe('Accessibility', () => {
  test('turn indicator has aria-live="polite"', () => {
    expect(document.getElementById('turnIndicator').getAttribute('aria-live')).toBe('polite');
  });

  test('status message has aria-live="polite"', () => {
    expect(document.getElementById('statusMessage').getAttribute('aria-live')).toBe('polite');
  });

  test('board has role="grid"', () => {
    expect(document.getElementById('board').getAttribute('role')).toBe('grid');
  });

  test('each cell has role="gridcell"', () => {
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.getAttribute('role')).toBe('gridcell');
    });
  });

  test('turn indicator aria-label reflects current player', () => {
    const ti = document.getElementById('turnIndicator');
    expect(ti.getAttribute('aria-label')).toBe("Player X's turn");
    clickCell(0); // switch to O
    expect(ti.getAttribute('aria-label')).toBe("Player O's turn");
  });
});
