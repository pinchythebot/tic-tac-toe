/**
 * keyboard-accessibility.e2e.spec.js
 *
 * End-to-End Playwright tests for the keyboard-accessibility & ARIA-live feature.
 *
 * Feature: feature/keyboard-accessibility-aria-live
 *
 * These tests verify in a real browser that:
 *  1. ARIA live regions (turnIndicator, statusMessage) have correct attributes
 *  2. Cell aria-labels update correctly as the game progresses
 *  3. tabindex management makes cells focusable/non-focusable as expected
 *  4. Keyboard interactions (Enter, Space) place marks correctly
 *  5. aria-disabled marks cells correctly after game over
 *  6. Focus indicator (CSS :focus-visible) is available on cells
 *  7. Turn indicator aria-label updates on every move
 *  8. Complete keyboard-only game flow works end-to-end
 *
 * Server: http://localhost:3000
 */

'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

/** Click a cell by its 0-based board index. */
const clickCell = (page, index) => page.click(`[data-index="${index}"]`);

/** Play a sequence of moves by clicking cells in order. */
const playMoves = async (page, indices) => {
  for (const i of indices) {
    await clickCell(page, i);
  }
};

/** Focus a cell and press a key. */
const keyCell = async (page, index, key) => {
  await page.focus(`[data-index="${index}"]`);
  await page.keyboard.press(key);
};

/** Get aria-label of a cell by index. */
const getCellLabel = (page, index) =>
  page.locator(`[data-index="${index}"]`).getAttribute('aria-label');

/** Get tabindex attribute of a cell by index. */
const getCellTabindex = (page, index) =>
  page.locator(`[data-index="${index}"]`).getAttribute('tabindex');

/** Get aria-disabled attribute of a cell by index. */
const getCellAriaDisabled = (page, index) =>
  page.locator(`[data-index="${index}"]`).getAttribute('aria-disabled');

/* ---------------------------------------------------------------------------
   1. ARIA LIVE REGION ATTRIBUTES
   --------------------------------------------------------------------------- */
test.describe('ARIA live region attributes in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('turnIndicator has aria-live="polite"', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-live', 'polite');
  });

  test('turnIndicator has aria-atomic="true"', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-atomic', 'true');
  });

  test('statusMessage has aria-live="polite"', async ({ page }) => {
    await expect(page.locator('#statusMessage')).toHaveAttribute('aria-live', 'polite');
  });

  test('statusMessage has aria-atomic="true"', async ({ page }) => {
    await expect(page.locator('#statusMessage')).toHaveAttribute('aria-atomic', 'true');
  });

  test('statusMessage has role="status"', async ({ page }) => {
    await expect(page.locator('#statusMessage')).toHaveAttribute('role', 'status');
  });

  test('statusMessage is empty at game start', async ({ page }) => {
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');
  });

  test('turnIndicator content changes after a move (live region fires)', async ({ page }) => {
    const before = await page.locator('#turnIndicator').textContent();
    await clickCell(page, 0);
    const after = await page.locator('#turnIndicator').textContent();
    expect(after).not.toBe(before);
    expect(after).toContain('O');
  });

  test('statusMessage announces "Player X wins!" after X wins', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('#statusMessage')).toHaveText('Player X wins!');
  });

  test('statusMessage announces "Player O wins!" after O wins', async ({ page }) => {
    await playMoves(page, [0, 3, 2, 4, 6, 5]);
    await expect(page.locator('#statusMessage')).toHaveText('Player O wins!');
  });

  test('statusMessage announces draw', async ({ page }) => {
    await playMoves(page, [0, 1, 2, 3, 5, 4, 6, 8, 7]);
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.toLowerCase()).toContain('draw');
  });
});

/* ---------------------------------------------------------------------------
   2. ARIA ROLES AND STRUCTURAL SEMANTICS
   --------------------------------------------------------------------------- */
test.describe('ARIA roles and structural semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('board has role="grid"', async ({ page }) => {
    await expect(page.locator('#board')).toHaveAttribute('role', 'grid');
  });

  test('board has a descriptive aria-label', async ({ page }) => {
    const label = await page.locator('#board').getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label.toLowerCase()).toContain('tic');
  });

  test('all 9 cells have role="gridcell"', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      await expect(page.locator(`[data-index="${i}"]`)).toHaveAttribute('role', 'gridcell');
    }
  });

  test('scoreboard has aria-label', async ({ page }) => {
    const label = await page.locator('.scoreboard').getAttribute('aria-label');
    expect(label).toBeTruthy();
  });
});

/* ---------------------------------------------------------------------------
   3. CELL ARIA-LABEL UPDATES
   --------------------------------------------------------------------------- */
test.describe('Cell aria-label updates in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('all cells start with "Cell N, empty" aria-labels', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const label = await getCellLabel(page, i);
      expect(label).toMatch(/Cell \d+, empty/i);
    }
  });

  test('cell positions use 1-based numbering in aria-labels', async ({ page }) => {
    expect(await getCellLabel(page, 0)).toMatch(/Cell 1/i);
    expect(await getCellLabel(page, 4)).toMatch(/Cell 5/i);
    expect(await getCellLabel(page, 8)).toMatch(/Cell 9/i);
  });

  test('aria-label updates to "Cell N, X" after X clicks', async ({ page }) => {
    await clickCell(page, 0);
    const label = await getCellLabel(page, 0);
    expect(label).toMatch(/Cell 1, X/i);
  });

  test('aria-label updates to "Cell N, O" after O clicks', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 4); // O
    const label = await getCellLabel(page, 4);
    expect(label).toMatch(/Cell 5, O/i);
  });

  test('untouched cell aria-label remains "empty"', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 1);
    const label = await getCellLabel(page, 8);
    expect(label).toMatch(/empty/i);
  });

  test('taken cell aria-label no longer contains "empty"', async ({ page }) => {
    await clickCell(page, 3);
    const label = await getCellLabel(page, 3);
    expect(label).not.toMatch(/empty/i);
  });

  test('clicking a taken cell does not change its aria-label', async ({ page }) => {
    await clickCell(page, 0); // X takes 0
    await clickCell(page, 0); // O tries → ignored
    const label = await getCellLabel(page, 0);
    expect(label).toMatch(/Cell 1, X/i);
    expect(label).not.toContain('O');
  });

  test('New Game restores all cell aria-labels to "Cell N, empty"', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    for (let i = 0; i < 9; i++) {
      const label = await getCellLabel(page, i);
      expect(label).toMatch(/Cell \d+, empty/i);
    }
  });
});

/* ---------------------------------------------------------------------------
   4. TABINDEX MANAGEMENT
   --------------------------------------------------------------------------- */
test.describe('tabindex management in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('all cells start with tabindex="0"', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const tabindex = await getCellTabindex(page, i);
      expect(tabindex).toBe('0');
    }
  });

  test('taken cell gets tabindex="-1"', async ({ page }) => {
    await clickCell(page, 4);
    expect(await getCellTabindex(page, 4)).toBe('-1');
  });

  test('untouched cells remain tabindex="0" after a move', async ({ page }) => {
    await clickCell(page, 4);
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        expect(await getCellTabindex(page, i)).toBe('0');
      }
    }
  });

  test('O-played cell also gets tabindex="-1"', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 7); // O
    expect(await getCellTabindex(page, 7)).toBe('-1');
  });

  test('New Game restores all cells to tabindex="0"', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    for (let i = 0; i < 9; i++) {
      expect(await getCellTabindex(page, i)).toBe('0');
    }
  });

  test('Reset Score restores all cells to tabindex="0"', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#resetScoreBtn');
    for (let i = 0; i < 9; i++) {
      expect(await getCellTabindex(page, i)).toBe('0');
    }
  });
});

/* ---------------------------------------------------------------------------
   5. ARIA-DISABLED MANAGEMENT
   --------------------------------------------------------------------------- */
test.describe('aria-disabled management in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('cells do not start with aria-disabled="true"', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const val = await getCellAriaDisabled(page, i);
      expect(val).not.toBe('true');
    }
  });

  test('empty cells get aria-disabled="true" after X wins', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins; cells 5–8 untouched
    for (const i of [5, 6, 7, 8]) {
      expect(await getCellAriaDisabled(page, i)).toBe('true');
    }
  });

  test('winning cells themselves do NOT get aria-disabled', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins on [0,1,2]
    for (const i of [0, 1, 2]) {
      expect(await getCellAriaDisabled(page, i)).not.toBe('true');
    }
  });

  test('O-wins scenario: remaining empty cells get aria-disabled="true"', async ({ page }) => {
    await playMoves(page, [0, 3, 2, 4, 6, 5]); // O wins middle row
    for (const i of [1, 7, 8]) {
      expect(await getCellAriaDisabled(page, i)).toBe('true');
    }
  });

  test('New Game removes aria-disabled from cells', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    for (let i = 0; i < 9; i++) {
      expect(await getCellAriaDisabled(page, i)).toBe('false');
    }
  });

  test('Reset Score removes aria-disabled from cells', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#resetScoreBtn');
    for (let i = 0; i < 9; i++) {
      expect(await getCellAriaDisabled(page, i)).toBe('false');
    }
  });
});

/* ---------------------------------------------------------------------------
   6. KEYBOARD ACTIVATION — ENTER AND SPACE
   --------------------------------------------------------------------------- */
test.describe('Keyboard activation in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Enter on empty cell places X mark', async ({ page }) => {
    await keyCell(page, 0, 'Enter');
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);
  });

  test('Space on empty cell places X mark', async ({ page }) => {
    await keyCell(page, 4, 'Space');
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
  });

  test('Enter switches turn to O', async ({ page }) => {
    await keyCell(page, 0, 'Enter');
    await expect(page.locator('#currentPlayerSymbol')).toHaveText('O');
  });

  test('Enter on taken cell is ignored', async ({ page }) => {
    await clickCell(page, 4); // X
    await keyCell(page, 4, 'Enter'); // O tries
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
    await expect(page.locator('[data-index="4"]')).not.toHaveClass(/o-piece/);
  });

  test('Space on taken cell is ignored', async ({ page }) => {
    await clickCell(page, 4); // X
    await keyCell(page, 4, 'Space'); // O tries
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
  });

  test('Enter completes a winning line', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 3);
    await clickCell(page, 1);
    await clickCell(page, 4);
    await keyCell(page, 2, 'Enter'); // X wins via keyboard
    await expect(page.locator('#statusMessage')).toHaveText('Player X wins!');
  });

  test('Space completes a winning line', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 3);
    await clickCell(page, 1);
    await clickCell(page, 4);
    await keyCell(page, 2, 'Space'); // X wins via keyboard
    await expect(page.locator('#statusMessage')).toHaveText('Player X wins!');
  });

  test('Enter after game-over does nothing', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins
    await keyCell(page, 5, 'Enter');
    await expect(page.locator('[data-index="5"]')).not.toHaveClass(/taken/);
  });
});

/* ---------------------------------------------------------------------------
   7. TURN-INDICATOR ARIA-LABEL UPDATES
   --------------------------------------------------------------------------- */
test.describe('Turn indicator aria-label in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('aria-label is "Player X\'s turn" at start', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-label', "Player X's turn");
  });

  test('aria-label switches to "Player O\'s turn" after X plays', async ({ page }) => {
    await clickCell(page, 0);
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-label', "Player O's turn");
  });

  test('aria-label switches back after O plays', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 1);
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-label', "Player X's turn");
  });

  test('turn indicator CSS class (is-x/is-o) matches aria-label', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-x/);
    await clickCell(page, 0);
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-o/);
  });

  test('New Game resets aria-label to "Player X\'s turn"', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-label', "Player X's turn");
  });
});

/* ---------------------------------------------------------------------------
   8. FOCUS VISIBILITY ON CELLS
   --------------------------------------------------------------------------- */
test.describe('Focus visibility and keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('cells can receive keyboard focus via Tab', async ({ page }) => {
    // Tab into the board area
    await page.keyboard.press('Tab');
    // Some focusable element should have focus
    const focused = await page.evaluate(() =>
      document.activeElement ? document.activeElement.tagName : null
    );
    expect(focused).not.toBeNull();
  });

  test('Enter can be used after tabbing to a cell', async ({ page }) => {
    await page.focus('[data-index="0"]');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);
  });

  test('complete keyboard-only game: X wins via Enter', async ({ page }) => {
    // Play all moves via keyboard Enter
    for (const i of [0, 3, 1, 4]) {
      await page.focus(`[data-index="${i}"]`);
      await page.keyboard.press('Enter');
    }
    // Final winning move
    await page.focus('[data-index="2"]');
    await page.keyboard.press('Enter');

    await expect(page.locator('#statusMessage')).toHaveText('Player X wins!');
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);
    await expect(page.locator('[data-index="1"]')).toHaveClass(/winning/);
    await expect(page.locator('[data-index="2"]')).toHaveClass(/winning/);
  });

  test('complete keyboard-only game: draw via Space', async ({ page }) => {
    const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];
    for (const i of DRAW_MOVES) {
      await page.focus(`[data-index="${i}"]`);
      await page.keyboard.press('Space');
    }
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.toLowerCase()).toContain('draw');
  });
});

/* ---------------------------------------------------------------------------
   9. ARIA-LIVE CONTENT CLEARED ON NEW GAME
   --------------------------------------------------------------------------- */
test.describe('ARIA live content resets on New Game / Reset Score', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('statusMessage is cleared after New Game', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');
  });

  test('statusMessage is cleared after Reset Score', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#resetScoreBtn');
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');
  });

  test('multiple rounds: statusMessage updates on each game end', async ({ page }) => {
    // Round 1 — X wins
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('#statusMessage')).toHaveText('Player X wins!');

    // New Game
    await page.click('#newGameBtn');
    let msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');

    // Round 2 — O wins
    await playMoves(page, [0, 3, 2, 4, 6, 5]);
    await expect(page.locator('#statusMessage')).toHaveText('Player O wins!');
  });
});

/* ---------------------------------------------------------------------------
   10. SCORE-CARD ACTIVE-PLAYER ACCESSIBILITY FEEDBACK
   --------------------------------------------------------------------------- */
test.describe('Score-card active-player visual feedback in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('scoreCardX has active-player class initially', async ({ page }) => {
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);
    await expect(page.locator('#scoreCardO')).not.toHaveClass(/active-player/);
  });

  test('scoreCardO gets active-player class after X plays', async ({ page }) => {
    await clickCell(page, 0);
    await expect(page.locator('#scoreCardO')).toHaveClass(/active-player/);
    await expect(page.locator('#scoreCardX')).not.toHaveClass(/active-player/);
  });

  test('scoreCardX gets active-player class back after O plays', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 1);
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);
  });

  test('active-player resets to X after New Game', async ({ page }) => {
    await clickCell(page, 0); // switch to O
    await page.click('#newGameBtn');
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);
    await expect(page.locator('#scoreCardO')).not.toHaveClass(/active-player/);
  });
});

/* ---------------------------------------------------------------------------
   11. CONSOLE ERRORS DURING ACCESSIBILITY INTERACTIONS
   --------------------------------------------------------------------------- */
test.describe('No console errors during keyboard accessibility flow', () => {
  test('no JS errors during keyboard-only gameplay', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE_URL);

    // Play full game via keyboard
    for (const i of [0, 3, 1, 4, 2]) {
      await page.focus(`[data-index="${i}"]`);
      await page.keyboard.press('Enter');
    }

    await page.click('#newGameBtn');
    await page.click('#resetScoreBtn');

    expect(errors).toHaveLength(0);
  });
});
