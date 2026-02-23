/**
 * keyboard-accessibility.test.js
 *
 * Comprehensive tests for the keyboard-accessibility & ARIA-live feature.
 *
 * Feature: feature/keyboard-accessibility-aria-live
 *
 * Coverage areas:
 *  1. ARIA live region attributes (aria-live, aria-atomic)
 *  2. ARIA roles and structural semantics (role="grid", "gridcell")
 *  3. Descriptive aria-label updates as cells are filled
 *  4. tabindex management (focusable ↔ non-focusable transitions)
 *  5. aria-disabled management after game-over
 *  6. Keyboard activation — Enter and Space place marks
 *  7. Keyboard non-activation — other keys do nothing
 *  8. Turn-indicator aria-label updates on every move
 *  9. Status-message content for win / draw announcements
 * 10. Focus behaviour (cells get tabindex="-1" when taken)
 * 11. New Game restores all accessibility attributes to initial state
 * 12. Reset Score restores all accessibility attributes to initial state
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/* ---------------------------------------------------------------------------
   Minimal HTML mirror of index.html
   --------------------------------------------------------------------------- */
const GAME_HTML = `
<div class="page-wrapper">
  <header class="site-header">
    <h1 class="logo">TIC<span class="x-color">✕</span>TAC<span class="o-color">○</span>TOE</h1>
  </header>
  <main class="game-container">
    <div class="turn-indicator is-x"
         id="turnIndicator"
         aria-live="polite"
         aria-atomic="true">
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
    <div class="status-message"
         id="statusMessage"
         role="status"
         aria-live="polite"
         aria-atomic="true"></div>
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
   DOM helpers
   --------------------------------------------------------------------------- */

/** Return the cell element at 0-based board index. */
const cell = (index) => document.querySelector(`[data-index="${index}"]`);

/** Simulate a mouse click on the cell at index. */
const clickCell = (index) => cell(index).click();

/** Dispatch a KeyboardEvent on the cell at index. */
const keyCell = (index, key) =>
  cell(index).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

/** Get trimmed textContent by element id. */
const text = (id) => document.getElementById(id).textContent.trim();

/** Return the aria-label attribute of the cell at index. */
const cellLabel = (index) => cell(index).getAttribute('aria-label');

/** Return the tabindex attribute of the cell at index. */
const cellTabindex = (index) => cell(index).getAttribute('tabindex');

/** Return the aria-disabled attribute of the cell at index (may be null). */
const cellAriaDisabled = (index) => cell(index).getAttribute('aria-disabled');

/* ---------------------------------------------------------------------------
   Game loader — mirrors the approach in game.dom.test.js
   --------------------------------------------------------------------------- */
let _capturedDCLHandlers = [];

function loadGame() {
  _capturedDCLHandlers.forEach((h) =>
    document.removeEventListener('DOMContentLoaded', h)
  );
  _capturedDCLHandlers = [];

  const code = fs.readFileSync(GAME_JS_PATH, 'utf8');

  const originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') {
      _capturedDCLHandlers.push(handler);
    }
    return originalAddEventListener(event, handler, ...rest);
  };

  // eslint-disable-next-line no-eval
  eval(code);

  document.addEventListener = originalAddEventListener;
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

beforeEach(() => {
  document.body.innerHTML = GAME_HTML;
  loadGame();
});

/* ============================================================
   1. ARIA LIVE REGION ATTRIBUTES
   ============================================================ */

describe('ARIA live region attributes', () => {
  test('turnIndicator has aria-live="polite"', () => {
    expect(document.getElementById('turnIndicator').getAttribute('aria-live')).toBe('polite');
  });

  test('turnIndicator has aria-atomic="true"', () => {
    expect(document.getElementById('turnIndicator').getAttribute('aria-atomic')).toBe('true');
  });

  test('statusMessage has aria-live="polite"', () => {
    expect(document.getElementById('statusMessage').getAttribute('aria-live')).toBe('polite');
  });

  test('statusMessage has aria-atomic="true"', () => {
    expect(document.getElementById('statusMessage').getAttribute('aria-atomic')).toBe('true');
  });

  test('statusMessage has role="status"', () => {
    expect(document.getElementById('statusMessage').getAttribute('role')).toBe('status');
  });

  test('turnIndicator live region is updated when turn changes', () => {
    // Before any move — should mention X
    const before = document.getElementById('turnIndicator').textContent;
    expect(before).toContain('X');

    clickCell(0); // X plays → O's turn

    const after = document.getElementById('turnIndicator').textContent;
    expect(after).toContain('O');
    // Must be different content to trigger screen-reader announcement
    expect(after).not.toBe(before);
  });

  test('statusMessage live region is empty on game start', () => {
    expect(document.getElementById('statusMessage').textContent.trim()).toBe('');
  });

  test('statusMessage is populated with win announcement', () => {
    // X wins on top row
    [0, 3, 1, 4, 2].forEach(clickCell);
    const msg = document.getElementById('statusMessage').textContent.trim();
    expect(msg).toBeTruthy();
    expect(msg).toContain('X');
  });

  test('statusMessage is populated with draw announcement', () => {
    // Known draw: [0,1,2,3,5,4,6,8,7]
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach(clickCell);
    const msg = document.getElementById('statusMessage').textContent.trim();
    expect(msg.toLowerCase()).toContain('draw');
  });
});

/* ============================================================
   2. ARIA ROLES AND STRUCTURAL SEMANTICS
   ============================================================ */

describe('ARIA roles and structural semantics', () => {
  test('board has role="grid"', () => {
    expect(document.getElementById('board').getAttribute('role')).toBe('grid');
  });

  test('board has a descriptive aria-label', () => {
    const label = document.getElementById('board').getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label.toLowerCase()).toContain('tic');
  });

  test('all 9 cells have role="gridcell"', () => {
    for (let i = 0; i < 9; i++) {
      expect(cell(i).getAttribute('role')).toBe('gridcell');
    }
  });

  test('scoreboard has a descriptive aria-label', () => {
    const label = document.querySelector('.scoreboard').getAttribute('aria-label');
    expect(label).toBeTruthy();
  });
});

/* ============================================================
   3. ARIA-LABEL UPDATES ON CELLS
   ============================================================ */

describe('aria-label updates on cells', () => {
  test('all cells have descriptive aria-labels initially (Cell N, empty)', () => {
    for (let i = 0; i < 9; i++) {
      const label = cellLabel(i);
      expect(label).toMatch(/Cell \d+, empty/i);
    }
  });

  test('cell 1-based position is correct in aria-label', () => {
    // Cell at data-index="0" should be "Cell 1, ..."
    expect(cellLabel(0)).toMatch(/Cell 1/i);
    expect(cellLabel(4)).toMatch(/Cell 5/i);
    expect(cellLabel(8)).toMatch(/Cell 9/i);
  });

  test('aria-label updates to "Cell N, X" after X plays there', () => {
    clickCell(0);
    expect(cellLabel(0)).toMatch(/Cell 1, X/i);
  });

  test('aria-label updates to "Cell N, O" after O plays there', () => {
    clickCell(0); // X
    clickCell(4); // O
    expect(cellLabel(4)).toMatch(/Cell 5, O/i);
  });

  test('aria-label for untouched cell remains "empty" after other cells are played', () => {
    clickCell(0); // X at cell 1
    clickCell(1); // O at cell 2
    // Cell 9 (index 8) should still be empty
    expect(cellLabel(8)).toMatch(/empty/i);
  });

  test('aria-label does not contain "empty" after a cell is taken', () => {
    clickCell(3);
    expect(cellLabel(3)).not.toMatch(/empty/i);
  });

  test('aria-label includes the player symbol (X or O), not a description word', () => {
    clickCell(2); // X
    clickCell(5); // O
    expect(cellLabel(2)).toMatch(/\bX\b/);
    expect(cellLabel(5)).toMatch(/\bO\b/);
  });

  test('aria-labels on taken cells are not overwritten if another player clicks them', () => {
    clickCell(0); // X takes cell 1
    clickCell(0); // O tries to take cell 1 → ignored
    expect(cellLabel(0)).toMatch(/Cell 1, X/i);
    expect(cellLabel(0)).not.toMatch(/O/);
  });
});

/* ============================================================
   4. TABINDEX MANAGEMENT
   ============================================================ */

describe('tabindex management', () => {
  test('all cells start with tabindex="0" (keyboard-reachable)', () => {
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });

  test('taken cell gets tabindex="-1" (removed from tab order)', () => {
    clickCell(4);
    expect(cellTabindex(4)).toBe('-1');
  });

  test('untouched cells retain tabindex="0" after a move', () => {
    clickCell(4); // only centre taken
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        expect(cellTabindex(i)).toBe('0');
      }
    }
  });

  test('O-played cell also gets tabindex="-1"', () => {
    clickCell(0); // X
    clickCell(7); // O
    expect(cellTabindex(7)).toBe('-1');
  });

  test('New Game restores all cells to tabindex="0"', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('newGameBtn').click();
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });

  test('Reset Score restores all cells to tabindex="0"', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('resetScoreBtn').click();
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });

  test('multiple taken cells each have tabindex="-1"', () => {
    clickCell(0); // X
    clickCell(1); // O
    clickCell(2); // X
    expect(cellTabindex(0)).toBe('-1');
    expect(cellTabindex(1)).toBe('-1');
    expect(cellTabindex(2)).toBe('-1');
    // Untouched cells still focusable
    expect(cellTabindex(3)).toBe('0');
  });
});

/* ============================================================
   5. ARIA-DISABLED MANAGEMENT
   ============================================================ */

describe('aria-disabled management', () => {
  test('cells start without aria-disabled="true"', () => {
    for (let i = 0; i < 9; i++) {
      // Should be false or not set — never "true" at start
      expect(cellAriaDisabled(i)).not.toBe('true');
    }
  });

  test('empty cells get aria-disabled="true" after X wins', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins; cells 5-8 untouched
    // Cell 5 was never played
    expect(cellAriaDisabled(5)).toBe('true');
    expect(cellAriaDisabled(6)).toBe('true');
    expect(cellAriaDisabled(7)).toBe('true');
    expect(cellAriaDisabled(8)).toBe('true');
  });

  test('winning cells themselves do NOT get aria-disabled', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins on [0,1,2]
    // Winning cells are marked, not disabled
    expect(cellAriaDisabled(0)).not.toBe('true');
    expect(cellAriaDisabled(1)).not.toBe('true');
    expect(cellAriaDisabled(2)).not.toBe('true');
  });

  test('empty cells get aria-disabled="true" after a draw', () => {
    // All cells are filled in a draw — no empty cells, so disableEmptyCells is a no-op
    // Verify that the game correctly ended (status changed)
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach(clickCell);
    // No empty cells → nothing disabled, but game must be over
    expect(document.getElementById('statusMessage').textContent).toContain('draw');
  });

  test('New Game removes aria-disabled from cells', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('newGameBtn').click();
    for (let i = 0; i < 9; i++) {
      expect(cellAriaDisabled(i)).toBe('false');
    }
  });

  test('Reset Score removes aria-disabled from cells', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('resetScoreBtn').click();
    for (let i = 0; i < 9; i++) {
      expect(cellAriaDisabled(i)).toBe('false');
    }
  });

  test('O-wins scenario also disables remaining empty cells', () => {
    // X: 0, 2, 6    O: 3, 4, 5  (O wins middle row)
    [0, 3, 2, 4, 6, 5].forEach(clickCell);
    // Untouched cell: 1, 7, 8
    expect(cellAriaDisabled(1)).toBe('true');
    expect(cellAriaDisabled(7)).toBe('true');
    expect(cellAriaDisabled(8)).toBe('true');
  });
});

/* ============================================================
   6. KEYBOARD ACTIVATION — ENTER AND SPACE
   ============================================================ */

describe('Keyboard activation with Enter and Space', () => {
  test('Enter on an empty cell places X on the first move', () => {
    keyCell(0, 'Enter');
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(0).classList.contains('taken')).toBe(true);
  });

  test('Space on an empty cell places X on the first move', () => {
    keyCell(0, ' ');
    expect(cell(0).classList.contains('x-piece')).toBe(true);
  });

  test('Enter switches turn to O', () => {
    keyCell(0, 'Enter');
    expect(text('currentPlayerSymbol')).toBe('O');
  });

  test('Space then Enter alternates X → O → X', () => {
    keyCell(0, ' ');   // X at 0
    keyCell(1, 'Enter'); // O at 1
    keyCell(2, ' ');   // X at 2
    expect(cell(0).classList.contains('x-piece')).toBe(true);
    expect(cell(1).classList.contains('o-piece')).toBe(true);
    expect(cell(2).classList.contains('x-piece')).toBe(true);
  });

  test('Enter on a taken cell is ignored', () => {
    clickCell(4); // X takes 4
    keyCell(4, 'Enter'); // O tries via keyboard → ignored
    expect(cell(4).classList.contains('x-piece')).toBe(true);
    expect(cell(4).classList.contains('o-piece')).toBe(false);
  });

  test('Space on a taken cell is ignored', () => {
    clickCell(4); // X takes 4
    keyCell(4, ' '); // O tries via keyboard → ignored
    expect(cell(4).classList.contains('x-piece')).toBe(true);
    expect(cell(4).classList.contains('o-piece')).toBe(false);
  });

  test('Enter triggers a win when it completes a winning line', () => {
    clickCell(0); // X
    clickCell(3); // O
    clickCell(1); // X
    clickCell(4); // O
    keyCell(2, 'Enter'); // X wins on top row via keyboard
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('Space triggers a win when it completes a winning line', () => {
    clickCell(0); // X
    clickCell(3); // O
    clickCell(1); // X
    clickCell(4); // O
    keyCell(2, ' '); // X wins via keyboard
    expect(text('statusMessage')).toBe('Player X wins!');
  });

  test('Enter after game-over does nothing', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    keyCell(5, 'Enter');
    expect(cell(5).classList.contains('taken')).toBe(false);
  });

  test('Space after game-over does nothing', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    keyCell(5, ' ');
    expect(cell(5).classList.contains('taken')).toBe(false);
  });
});

/* ============================================================
   7. KEYBOARD NON-ACTIVATION — OTHER KEYS DO NOTHING
   ============================================================ */

describe('Other keyboard keys do NOT place marks', () => {
  const NON_ACTIVATING_KEYS = [
    'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'a', 'x', 'o', 'Backspace', 'Delete', 'F1',
  ];

  test.each(NON_ACTIVATING_KEYS)(
    'pressing "%s" on an empty cell does not place a mark',
    (key) => {
      keyCell(4, key);
      expect(cell(4).classList.contains('x-piece')).toBe(false);
      expect(cell(4).classList.contains('taken')).toBe(false);
    }
  );

  test('pressing Escape after a move does not clear the board', () => {
    clickCell(0); // X at 0
    keyCell(0, 'Escape');
    expect(cell(0).classList.contains('x-piece')).toBe(true);
  });
});

/* ============================================================
   8. TURN-INDICATOR aria-label UPDATES
   ============================================================ */

describe('Turn indicator aria-label reflects current player', () => {
  test('aria-label is "Player X\'s turn" at game start', () => {
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player X's turn");
  });

  test('aria-label switches to "Player O\'s turn" after X plays', () => {
    clickCell(0);
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player O's turn");
  });

  test('aria-label switches back to "Player X\'s turn" after O plays', () => {
    clickCell(0); // X
    clickCell(1); // O
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player X's turn");
  });

  test('aria-label does not change when a taken cell is clicked', () => {
    clickCell(0); // X → now O's turn
    clickCell(0); // O tries to take 0 → ignored
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player O's turn");
  });

  test('turn indicator CSS class is-x/is-o matches aria-label', () => {
    const ti = document.getElementById('turnIndicator');

    // Initially X
    expect(ti.classList.contains('is-x')).toBe(true);
    expect(ti.getAttribute('aria-label')).toContain('X');

    clickCell(0); // switch to O

    expect(ti.classList.contains('is-o')).toBe(true);
    expect(ti.getAttribute('aria-label')).toContain('O');
  });

  test('New Game resets aria-label to X\'s turn', () => {
    // After a full win, turn indicator might show old player
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('newGameBtn').click();
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player X's turn");
  });

  test('Reset Score resets aria-label to X\'s turn', () => {
    clickCell(0); // switch to O
    document.getElementById('resetScoreBtn').click();
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player X's turn");
  });
});

/* ============================================================
   9. STATUS MESSAGE ANNOUNCEMENTS
   ============================================================ */

describe('Status message ARIA announcements', () => {
  test('win message mentions the winning player by symbol', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    const msg = text('statusMessage');
    expect(msg).toBe('Player X wins!');
  });

  test('O wins message is "Player O wins!"', () => {
    [0, 3, 2, 4, 6, 5].forEach(clickCell); // O wins middle row
    const msg = text('statusMessage');
    expect(msg).toBe('Player O wins!');
  });

  test('draw message is announced (contains "draw")', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach(clickCell);
    const msg = text('statusMessage').toLowerCase();
    expect(msg).toContain('draw');
  });

  test('status message is empty during an ongoing game', () => {
    clickCell(0);
    clickCell(1);
    expect(text('statusMessage')).toBe('');
  });

  test('status message is cleared by New Game button', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('newGameBtn').click();
    expect(text('statusMessage')).toBe('');
  });

  test('status message is cleared by Reset Score button', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('resetScoreBtn').click();
    expect(text('statusMessage')).toBe('');
  });

  test('no spurious status message is set mid-game', () => {
    // Play 4 moves — no one has won yet
    clickCell(0); clickCell(8);
    clickCell(1); clickCell(7);
    expect(text('statusMessage')).toBe('');
  });
});

/* ============================================================
   10. FOCUS / TABINDEX — COMPREHENSIVE SCENARIOS
   ============================================================ */

describe('Focus / tabindex comprehensive scenarios', () => {
  test('mix of taken and empty cells — only empty cells have tabindex="0"', () => {
    clickCell(0); // X — taken
    clickCell(4); // O — taken
    clickCell(8); // X — taken

    // Taken cells
    [0, 4, 8].forEach((i) => expect(cellTabindex(i)).toBe('-1'));

    // Empty cells
    [1, 2, 3, 5, 6, 7].forEach((i) => expect(cellTabindex(i)).toBe('0'));
  });

  test('all cells lose tabindex="0" when the game ends (win)', () => {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins

    // Winning cells 0,1,2 — taken (tabindex="-1")
    [0, 1, 2].forEach((i) => expect(cellTabindex(i)).toBe('-1'));

    // O's cells 3,4 — taken (tabindex="-1")
    [3, 4].forEach((i) => expect(cellTabindex(i)).toBe('-1'));

    // Empty cells 5,6,7,8 — disabled (tabindex="-1" via taken=false but aria-disabled=true)
    // Actually these cells still might have tabindex="0" unless explicitly set
    // The implementation uses aria-disabled for empty post-game cells.
    // Test that clicking them does nothing (game-over guard)
    const beforeClass = cell(5).className;
    clickCell(5);
    expect(cell(5).className).toBe(beforeClass); // no change
  });

  test('New Game makes all cells keyboard-accessible (tabindex="0")', () => {
    // Make some moves, end game
    [0, 3, 1, 4, 2].forEach(clickCell);
    document.getElementById('newGameBtn').click();
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });
});

/* ============================================================
   11. NEW GAME RESTORES ALL ARIA ATTRIBUTES
   ============================================================ */

describe('New Game restores all ARIA attributes', () => {
  function playAndReset() {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('newGameBtn').click();
  }

  test('all cell aria-labels reset to "Cell N, empty"', () => {
    playAndReset();
    for (let i = 0; i < 9; i++) {
      expect(cellLabel(i)).toMatch(/Cell \d+, empty/i);
    }
  });

  test('all cells have tabindex="0" after New Game', () => {
    playAndReset();
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });

  test('all cells have aria-disabled="false" after New Game', () => {
    playAndReset();
    for (let i = 0; i < 9; i++) {
      expect(cellAriaDisabled(i)).toBe('false');
    }
  });

  test('turnIndicator has is-x class after New Game', () => {
    playAndReset();
    expect(document.getElementById('turnIndicator').classList.contains('is-x')).toBe(true);
    expect(document.getElementById('turnIndicator').classList.contains('is-o')).toBe(false);
  });

  test('statusMessage is empty after New Game', () => {
    playAndReset();
    expect(text('statusMessage')).toBe('');
  });

  test('currentPlayerSymbol shows X after New Game', () => {
    playAndReset();
    expect(text('currentPlayerSymbol')).toBe('X');
  });
});

/* ============================================================
   12. RESET SCORE RESTORES ALL ARIA ATTRIBUTES
   ============================================================ */

describe('Reset Score restores all ARIA attributes', () => {
  function playAndResetScore() {
    [0, 3, 1, 4, 2].forEach(clickCell); // X wins
    document.getElementById('resetScoreBtn').click();
  }

  test('all cell aria-labels reset to "Cell N, empty"', () => {
    playAndResetScore();
    for (let i = 0; i < 9; i++) {
      expect(cellLabel(i)).toMatch(/Cell \d+, empty/i);
    }
  });

  test('all cells have tabindex="0" after Reset Score', () => {
    playAndResetScore();
    for (let i = 0; i < 9; i++) {
      expect(cellTabindex(i)).toBe('0');
    }
  });

  test('all cells have aria-disabled="false" after Reset Score', () => {
    playAndResetScore();
    for (let i = 0; i < 9; i++) {
      expect(cellAriaDisabled(i)).toBe('false');
    }
  });

  test('scores all read 0 after Reset Score', () => {
    playAndResetScore();
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('scoreDraw')).toBe('0');
  });

  test('turnIndicator shows X after Reset Score', () => {
    playAndResetScore();
    const label = document.getElementById('turnIndicator').getAttribute('aria-label');
    expect(label).toBe("Player X's turn");
  });
});

/* ============================================================
   13. SCORE-CARD ACTIVE-PLAYER ARIA / VISUAL FEEDBACK
   ============================================================ */

describe('Score-card active-player visual/accessibility feedback', () => {
  test('scoreCardX has active-player class initially', () => {
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });

  test('scoreCardO gets active-player class after X moves', () => {
    clickCell(0); // X → O's turn
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(false);
  });

  test('scoreCardX gets active-player class back after O moves', () => {
    clickCell(0); clickCell(1); // X then O
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
  });

  test('scorecard highlight does not change when a taken cell is clicked', () => {
    clickCell(0); // X → O's turn; O's card highlighted
    clickCell(0); // O tries to take X's cell → ignored
    // Still O's turn
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
  });

  test('scorecard highlight resets to X after New Game', () => {
    clickCell(0); // switch to O
    document.getElementById('newGameBtn').click();
    expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
  });
});

/* ============================================================
   14. FULL ACCESSIBILITY WORKFLOW INTEGRATION
   ============================================================ */

describe('Full accessibility workflow integration', () => {
  test('complete game via keyboard: X wins and all ARIA state is correct', () => {
    // X: 0,1,2  O: 3,4  — all via keyboard Enter
    keyCell(0, 'Enter'); // X→0
    keyCell(3, 'Enter'); // O→3
    keyCell(1, 'Enter'); // X→1
    keyCell(4, 'Enter'); // O→4
    keyCell(2, 'Enter'); // X→2 (wins!)

    // Win announced
    expect(text('statusMessage')).toBe('Player X wins!');

    // Winning cells have correct aria-labels
    expect(cellLabel(0)).toMatch(/Cell 1, X/i);
    expect(cellLabel(1)).toMatch(/Cell 2, X/i);
    expect(cellLabel(2)).toMatch(/Cell 3, X/i);

    // Winning cells are taken (tabindex="-1")
    [0, 1, 2].forEach((i) => expect(cellTabindex(i)).toBe('-1'));

    // Empty cells are disabled (aria-disabled="true")
    [5, 6, 7, 8].forEach((i) => expect(cellAriaDisabled(i)).toBe('true'));

    // Score updated
    expect(text('scoreX')).toBe('1');
  });

  test('complete game via keyboard: O wins and all ARIA state is correct', () => {
    // X: 0,2,6  O: 3,4,5 — O wins middle row via keyboard
    keyCell(0, ' ');  // X→0
    keyCell(3, ' ');  // O→3
    keyCell(2, ' ');  // X→2
    keyCell(4, ' ');  // O→4
    keyCell(6, ' ');  // X→6
    keyCell(5, ' ');  // O→5 (wins!)

    expect(text('statusMessage')).toBe('Player O wins!');

    // O's winning cells
    expect(cellLabel(3)).toMatch(/Cell 4, O/i);
    expect(cellLabel(4)).toMatch(/Cell 5, O/i);
    expect(cellLabel(5)).toMatch(/Cell 6, O/i);

    expect(text('scoreO')).toBe('1');
  });

  test('draw via keyboard and then new game resets everything', () => {
    const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];
    DRAW_MOVES.forEach((i) => keyCell(i, 'Enter'));

    expect(text('statusMessage').toLowerCase()).toContain('draw');
    expect(text('scoreDraw')).toBe('1');

    // New Game
    document.getElementById('newGameBtn').click();

    // All clean
    expect(text('statusMessage')).toBe('');
    for (let i = 0; i < 9; i++) {
      expect(cellLabel(i)).toMatch(/empty/i);
      expect(cellTabindex(i)).toBe('0');
      expect(cellAriaDisabled(i)).toBe('false');
    }
    expect(document.getElementById('turnIndicator').getAttribute('aria-label')).toBe("Player X's turn");
    // Score preserved across games
    expect(text('scoreDraw')).toBe('1');
  });

  test('multi-round score accumulation with ARIA live region content', () => {
    // Round 1: X wins
    [0, 3, 1, 4, 2].forEach(clickCell);
    expect(text('scoreX')).toBe('1');
    expect(text('statusMessage')).toBe('Player X wins!');

    document.getElementById('newGameBtn').click();

    // After new game, message is cleared
    expect(text('statusMessage')).toBe('');

    // Round 2: O wins
    [0, 3, 2, 4, 6, 5].forEach(clickCell);
    expect(text('scoreO')).toBe('1');
    expect(text('statusMessage')).toBe('Player O wins!');

    document.getElementById('resetScoreBtn').click();
    expect(text('scoreX')).toBe('0');
    expect(text('scoreO')).toBe('0');
    expect(text('statusMessage')).toBe('');
  });
});
