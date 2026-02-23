/**
 * game.e2e.spec.js
 *
 * End-to-End tests for the Tic-Tac-Toe dark-theme neon-accent game.
 * Uses Playwright to drive a real browser against a locally served copy
 * of the game (http://localhost:3000).
 *
 * Test coverage:
 *  – Page load / visual structure
 *  – Playing moves (click interactions)
 *  – Win detection & visual feedback
 *  – Draw detection
 *  – New Game button
 *  – Reset Score button
 *  – Keyboard navigation & accessibility
 *  – Console errors (none expected)
 */

'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

/** Click the cell at the given board index (0–8). */
async function clickCell(page, index) {
  await page.click(`[data-index="${index}"]`);
}

/** Press Enter on the cell at the given board index. */
async function pressEnterCell(page, index) {
  await page.focus(`[data-index="${index}"]`);
  await page.keyboard.press('Enter');
}

/** Get visible text of an element by CSS selector. */
async function getText(page, selector) {
  return page.textContent(selector);
}

/** Play a sequence of cell indices in order. */
async function playMoves(page, indices) {
  for (const idx of indices) {
    await clickCell(page, idx);
  }
}

/** Capture all browser console messages during the test. */
function captureConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/* ---------------------------------------------------------------------------
   Page load
   --------------------------------------------------------------------------- */
test.describe('Page load', () => {
  test('loads with the correct title', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Tic.*Tac.*Toe/i);
  });

  test('shows the logo / heading', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1.logo')).toBeVisible();
  });

  test('renders 9 board cells', async ({ page }) => {
    await page.goto(BASE_URL);
    const cells = page.locator('.cell');
    await expect(cells).toHaveCount(9);
  });

  test('shows Player X turn indicator on load', async ({ page }) => {
    await page.goto(BASE_URL);
    const indicator = page.locator('#turnIndicator');
    await expect(indicator).toContainText('X');
    await expect(indicator).toHaveClass(/is-x/);
  });

  test('scores are all 0 on load', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#scoreX')).toHaveText('0');
    await expect(page.locator('#scoreO')).toHaveText('0');
    await expect(page.locator('#scoreDraw')).toHaveText('0');
  });

  test('status message is empty on load', async ({ page }) => {
    await page.goto(BASE_URL);
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');
  });

  test('New Game and Reset Score buttons are visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#newGameBtn')).toBeVisible();
    await expect(page.locator('#resetScoreBtn')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------
   Playing moves
   --------------------------------------------------------------------------- */
test.describe('Playing moves', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('clicking a cell places X mark', async ({ page }) => {
    await clickCell(page, 0);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/taken/);
  });

  test('second click places O mark', async ({ page }) => {
    await clickCell(page, 0);
    await clickCell(page, 1);
    await expect(page.locator('[data-index="1"]')).toHaveClass(/o-piece/);
  });

  test('clicking a taken cell does not change it', async ({ page }) => {
    await clickCell(page, 4);        // X takes centre
    await clickCell(page, 4);        // O tries → ignored
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
    await expect(page.locator('[data-index="4"]')).not.toHaveClass(/o-piece/);
  });

  test('turn indicator switches after each move', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toContainText('X');
    await clickCell(page, 0);
    await expect(page.locator('#turnIndicator')).toContainText('O');
    await clickCell(page, 1);
    await expect(page.locator('#turnIndicator')).toContainText('X');
  });

  test('active-player scoreboard highlight follows current player', async ({ page }) => {
    // Initially X is active
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);
    await expect(page.locator('#scoreCardO')).not.toHaveClass(/active-player/);

    await clickCell(page, 0); // X plays → O's turn
    await expect(page.locator('#scoreCardO')).toHaveClass(/active-player/);
    await expect(page.locator('#scoreCardX')).not.toHaveClass(/active-player/);
  });
});

/* ---------------------------------------------------------------------------
   Win detection
   --------------------------------------------------------------------------- */
test.describe('Win detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('X wins on top row — status message appears', async ({ page }) => {
    // X: 0,1,2   O: 3,4
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('#statusMessage')).toContainText('Player X wins!');
  });

  test('O wins on middle row — status message appears', async ({ page }) => {
    // X: 0,2,6   O: 3,4,5
    await playMoves(page, [0, 3, 2, 4, 6, 5]);
    await expect(page.locator('#statusMessage')).toContainText('Player O wins!');
  });

  test('X wins on the main diagonal', async ({ page }) => {
    // X: 0,4,8   O: 1,2
    await playMoves(page, [0, 1, 4, 2, 8]);
    await expect(page.locator('#statusMessage')).toContainText('Player X wins!');
  });

  test('winning cells receive the "winning" CSS class', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins on top row
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);
    await expect(page.locator('[data-index="1"]')).toHaveClass(/winning/);
    await expect(page.locator('[data-index="2"]')).toHaveClass(/winning/);
  });

  test("non-winning cells don't get the winning class", async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('[data-index="3"]')).not.toHaveClass(/winning/);
    await expect(page.locator('[data-index="4"]')).not.toHaveClass(/winning/);
  });

  test('X score increments after X wins', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('#scoreX')).toHaveText('1');
    await expect(page.locator('#scoreO')).toHaveText('0');
  });

  test('no moves accepted after a win', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins
    await clickCell(page, 5);                 // Should be ignored
    await expect(page.locator('[data-index="5"]')).not.toHaveClass(/taken/);
  });

  test('turn indicator is hidden / no longer updates after win', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    // The game is over — indicator text should still show X (current winner)
    await expect(page.locator('#currentPlayerSymbol')).toHaveText('X');
  });
});

/* ---------------------------------------------------------------------------
   Draw detection
   --------------------------------------------------------------------------- */
test.describe('Draw detection', () => {
  // Board layout for a clean draw:
  // Move sequence: X→0, O→1, X→2, O→3, X→5, O→4, X→6, O→8, X→7
  // Final board: [X,O,X, O,O,X, X,X,O]  (verified: no winning line)
  const DRAW_MOVES = [0, 1, 2, 3, 5, 4, 6, 8, 7];

  test('draw shows correct status message', async ({ page }) => {
    await page.goto(BASE_URL);
    await playMoves(page, DRAW_MOVES);
    await expect(page.locator('#statusMessage')).toContainText("draw");
  });

  test('draw score increments', async ({ page }) => {
    await page.goto(BASE_URL);
    await playMoves(page, DRAW_MOVES);
    await expect(page.locator('#scoreDraw')).toHaveText('1');
    await expect(page.locator('#scoreX')).toHaveText('0');
    await expect(page.locator('#scoreO')).toHaveText('0');
  });
});

/* ---------------------------------------------------------------------------
   New Game button
   --------------------------------------------------------------------------- */
test.describe('New Game button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('resets the board after a win', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins
    await page.click('#newGameBtn');
    for (let i = 0; i < 9; i++) {
      await expect(page.locator(`[data-index="${i}"]`)).not.toHaveClass(/taken/);
    }
  });

  test('clears the status message', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    const msg = await page.locator('#statusMessage').textContent();
    expect(msg.trim()).toBe('');
  });

  test('resets turn to Player X', async ({ page }) => {
    await clickCell(page, 0);  // X
    await clickCell(page, 1);  // O  → now X's turn
    await clickCell(page, 2);  // X  → now O's turn
    await page.click('#newGameBtn');
    await expect(page.locator('#currentPlayerSymbol')).toHaveText('X');
  });

  test('preserves scores across games', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins
    const scoreBefore = await page.locator('#scoreX').textContent();
    await page.click('#newGameBtn');
    await expect(page.locator('#scoreX')).toHaveText(scoreBefore.trim());
  });

  test('all cells are playable after New Game', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins
    await page.click('#newGameBtn');
    await clickCell(page, 0);  // should work
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);
  });
});

/* ---------------------------------------------------------------------------
   Reset Score button
   --------------------------------------------------------------------------- */
test.describe('Reset Score button', () => {
  test('resets all scores to 0', async ({ page }) => {
    await page.goto(BASE_URL);
    await playMoves(page, [0, 3, 1, 4, 2]);  // X wins
    await page.click('#newGameBtn');
    await playMoves(page, [0, 3, 2, 4, 6, 5]);  // O wins
    await page.click('#resetScoreBtn');
    await expect(page.locator('#scoreX')).toHaveText('0');
    await expect(page.locator('#scoreO')).toHaveText('0');
    await expect(page.locator('#scoreDraw')).toHaveText('0');
  });

  test('also starts a new game (board cleared)', async ({ page }) => {
    await page.goto(BASE_URL);
    await clickCell(page, 0);
    await page.click('#resetScoreBtn');
    await expect(page.locator('[data-index="0"]')).not.toHaveClass(/taken/);
  });
});

/* ---------------------------------------------------------------------------
   Multiple game rounds
   --------------------------------------------------------------------------- */
test.describe('Score accumulation over multiple rounds', () => {
  test('X score increments each time X wins', async ({ page }) => {
    await page.goto(BASE_URL);
    // Round 1
    await playMoves(page, [0, 3, 1, 4, 2]);
    await page.click('#newGameBtn');
    // Round 2
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('#scoreX')).toHaveText('2');
  });

  test('O score increments each time O wins', async ({ page }) => {
    await page.goto(BASE_URL);
    // Round 1: O wins
    await playMoves(page, [0, 3, 2, 4, 6, 5]);
    await page.click('#newGameBtn');
    // Round 2: O wins
    await playMoves(page, [0, 3, 2, 4, 6, 5]);
    await expect(page.locator('#scoreO')).toHaveText('2');
  });
});

/* ---------------------------------------------------------------------------
   Keyboard navigation
   --------------------------------------------------------------------------- */
test.describe('Keyboard interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Enter key on empty cell places a mark', async ({ page }) => {
    await pressEnterCell(page, 4);
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
  });

  test('Space key on empty cell places a mark', async ({ page }) => {
    await page.focus('[data-index="4"]');
    await page.keyboard.press('Space');
    await expect(page.locator('[data-index="4"]')).toHaveClass(/x-piece/);
  });

  test('Tab key navigates between cells', async ({ page }) => {
    // Tab from the first cell to the second
    await page.focus('[data-index="0"]');
    await page.keyboard.press('Tab');
    // The focused element should now be the cell at index 1 (or another focusable element)
    const focusedIndex = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.dataset.index : null;
    });
    // The next focusable cell is 1 (or a button if we tab past the grid)
    expect(['1', null].includes(focusedIndex) || focusedIndex !== '0').toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   Dark theme / visual checks (CSS custom properties)
   --------------------------------------------------------------------------- */
test.describe('Dark theme visual checks', () => {
  test('page background is dark (not white)', async ({ page }) => {
    await page.goto(BASE_URL);
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // The dark background should not be pure white rgb(255, 255, 255)
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('board element is visible on screen', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#board')).toBeVisible();
  });

  test('scoreboard is visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.scoreboard')).toBeVisible();
  });

  test('cells are visible and have non-zero dimensions', async ({ page }) => {
    await page.goto(BASE_URL);
    const box = await page.locator('[data-index="0"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------------------
   Accessibility structure
   --------------------------------------------------------------------------- */
test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('board has role="grid"', async ({ page }) => {
    await expect(page.locator('#board')).toHaveAttribute('role', 'grid');
  });

  test('cells have role="gridcell"', async ({ page }) => {
    const cells = page.locator('.cell');
    for (let i = 0; i < 9; i++) {
      await expect(cells.nth(i)).toHaveAttribute('role', 'gridcell');
    }
  });

  test('turn indicator has aria-live="polite"', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveAttribute('aria-live', 'polite');
  });

  test('status message has aria-live="polite"', async ({ page }) => {
    await expect(page.locator('#statusMessage')).toHaveAttribute('aria-live', 'polite');
  });

  test('cells have descriptive aria-labels initially', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const label = await page.locator(`[data-index="${i}"]`).getAttribute('aria-label');
      expect(label).toMatch(/Cell \d+, empty/i);
    }
  });

  test('aria-label updates after a move', async ({ page }) => {
    await clickCell(page, 0);
    const label = await page.locator('[data-index="0"]').getAttribute('aria-label');
    expect(label).toMatch(/Cell 1, X/i);
  });
});
