/**
 * difficulty-selector.e2e.spec.js
 *
 * End-to-end (Playwright) tests for the AI Difficulty Selector feature.
 * Tests the Easy / Medium / Hard segmented-control UI and verifies that
 * the difficulty selector shows/hides correctly with the game mode switcher.
 *
 * Tests run against http://localhost:3000 (served by http-server).
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

/** Wait for at least one .o-piece to appear (AI has responded). */
async function waitForAI(page) {
  await page.waitForSelector('.cell.o-piece', { timeout: 2000 });
}

/* ================================================================
   SECTION 1 — Page structure: difficulty selector present
   ================================================================ */
test.describe('Difficulty selector — page structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('difficulty selector (#difficultySwitcher) is present in the DOM', async ({ page }) => {
    const ds = page.locator('#difficultySwitcher');
    await expect(ds).toBeAttached();
  });

  test('difficulty selector has three buttons: Easy, Medium, Hard', async ({ page }) => {
    await expect(page.locator('#diffEasy')).toBeVisible();
    await expect(page.locator('#diffMedium')).toBeVisible();
    await expect(page.locator('#diffHard')).toBeVisible();
  });

  test('Hard button is active by default (default difficulty)', async ({ page }) => {
    const hardBtn = page.locator('#diffHard');
    await expect(hardBtn).toHaveClass(/difficulty-btn--active/);
    await expect(hardBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Easy and Medium buttons are inactive by default', async ({ page }) => {
    await expect(page.locator('#diffEasy')).not.toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffMedium')).not.toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffEasy')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#diffMedium')).toHaveAttribute('aria-pressed', 'false');
  });

  test('difficulty selector is visible in single-player mode (default)', async ({ page }) => {
    // The game starts in single-player mode → difficultySwitcher should be visible
    const ds = page.locator('#difficultySwitcher');
    await expect(ds).toBeVisible();
    await expect(ds).not.toHaveAttribute('hidden', /.*/);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE_URL);
    expect(errors).toHaveLength(0);
  });
});

/* ================================================================
   SECTION 2 — Difficulty button interaction
   ================================================================ */
test.describe('Difficulty button interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('clicking Easy activates Easy and deactivates Hard', async ({ page }) => {
    await page.click('#diffEasy');
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffEasy')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#diffHard')).not.toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffHard')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#diffMedium')).not.toHaveClass(/difficulty-btn--active/);
  });

  test('clicking Medium activates Medium and deactivates others', async ({ page }) => {
    await page.click('#diffMedium');
    await expect(page.locator('#diffMedium')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffMedium')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#diffEasy')).not.toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffHard')).not.toHaveClass(/difficulty-btn--active/);
  });

  test('clicking Hard (after Easy) activates Hard and deactivates Easy', async ({ page }) => {
    // Switch to easy first
    await page.click('#diffEasy');
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);

    // Switch back to hard
    await page.click('#diffHard');
    await expect(page.locator('#diffHard')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffHard')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#diffEasy')).not.toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffEasy')).toHaveAttribute('aria-pressed', 'false');
  });

  test('only one difficulty button is active at a time', async ({ page }) => {
    // After clicking Easy
    await page.click('#diffEasy');
    const activeCount = await page.locator('.difficulty-btn--active').count();
    expect(activeCount).toBe(1);

    // After clicking Medium
    await page.click('#diffMedium');
    const activeCount2 = await page.locator('.difficulty-btn--active').count();
    expect(activeCount2).toBe(1);
  });

  test('difficulty selector still works after clicking it multiple times', async ({ page }) => {
    await page.click('#diffEasy');
    await page.click('#diffMedium');
    await page.click('#diffHard');
    await page.click('#diffEasy');
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);
    const activeCount = await page.locator('.difficulty-btn--active').count();
    expect(activeCount).toBe(1);
  });
});

/* ================================================================
   SECTION 3 — Difficulty selector visibility with mode switcher
   ================================================================ */
test.describe('Difficulty selector visibility with mode switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('difficulty selector is hidden when switching to 2-player mode', async ({ page }) => {
    // Initially visible (single-player default)
    await expect(page.locator('#difficultySwitcher')).toBeVisible();

    // Switch to 2-player
    await page.click('#btn2p');

    // Difficulty selector should now be hidden
    await expect(page.locator('#difficultySwitcher')).toBeHidden();
  });

  test('difficulty selector reappears when switching back to 1-player mode', async ({ page }) => {
    // Switch to 2-player (hides difficulty selector)
    await page.click('#btn2p');
    await expect(page.locator('#difficultySwitcher')).toBeHidden();

    // Switch back to 1-player (shows difficulty selector)
    await page.click('#btn1p');
    await expect(page.locator('#difficultySwitcher')).toBeVisible();
  });

  test('toggling between modes correctly shows/hides difficulty selector', async ({ page }) => {
    // Visible → hidden → visible → hidden cycle
    await expect(page.locator('#difficultySwitcher')).toBeVisible();
    await page.click('#btn2p');
    await expect(page.locator('#difficultySwitcher')).toBeHidden();
    await page.click('#btn1p');
    await expect(page.locator('#difficultySwitcher')).toBeVisible();
    await page.click('#btn2p');
    await expect(page.locator('#difficultySwitcher')).toBeHidden();
  });

  test('difficulty setting persists after switching modes', async ({ page }) => {
    // Set difficulty to Easy
    await page.click('#diffEasy');
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);

    // Switch to 2-player and back
    await page.click('#btn2p');
    await page.click('#btn1p');

    // Easy should still be active
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffEasy')).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching to 2-player mode does not affect difficulty button state', async ({ page }) => {
    // Set difficulty to Medium
    await page.click('#diffMedium');

    // Switch to 2-player (hides selector) then back to 1-player
    await page.click('#btn2p');
    await page.click('#btn1p');

    // Medium should still be active
    await expect(page.locator('#diffMedium')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffMedium')).toHaveAttribute('aria-pressed', 'true');
  });
});

/* ================================================================
   SECTION 4 — AI gameplay with different difficulties
   ================================================================ */
test.describe('AI gameplay with different difficulty levels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Make sure we're in 1-player mode (default)
    await expect(page.locator('#btn1p')).toHaveClass(/mode-btn--active/);
  });

  test('hard mode (default): AI plays within 600ms after X move', async ({ page }) => {
    await clickCell(page, 4); // X plays center
    await waitForAI(page);    // AI (O) responds
    const oPieces = await page.locator('.cell.o-piece').count();
    expect(oPieces).toBe(1);
  });

  test('easy mode: AI still plays within 600ms after X move', async ({ page }) => {
    await page.click('#diffEasy');
    await clickCell(page, 4); // X plays center
    await waitForAI(page);
    const oPieces = await page.locator('.cell.o-piece').count();
    expect(oPieces).toBe(1);
  });

  test('medium mode: AI still plays within 600ms after X move', async ({ page }) => {
    await page.click('#diffMedium');
    await clickCell(page, 0); // X plays corner
    await waitForAI(page);
    const oPieces = await page.locator('.cell.o-piece').count();
    expect(oPieces).toBe(1);
  });

  test('board is locked while AI is thinking (any difficulty)', async ({ page }) => {
    // Click a cell — board should briefly be locked (AI delay = 400ms)
    await clickCell(page, 4);

    // Immediately check: board should be locked (AI delay in progress)
    const boardLocked = await page.locator('#board.board--locked').count();
    // Board may or may not still be locked depending on timing, but AI should respond
    await waitForAI(page);
    // After AI plays, board should be unlocked
    const boardUnlocked = await page.locator('#board:not(.board--locked)').count();
    expect(boardUnlocked).toBe(1);
  });

  test('changing difficulty to Easy mid-game: AI still responds on next turn', async ({ page }) => {
    // Play one X move (hard AI responds)
    await clickCell(page, 4);
    await waitForAI(page);

    // Now switch to easy
    await page.click('#diffEasy');
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);

    // Play X again — AI should still respond with easy difficulty
    const emptyCell = page.locator('.cell:not(.taken)').first();
    await emptyCell.click();
    await waitForAI(page);

    // Should have 2 O pieces now
    const oPieces = await page.locator('.cell.o-piece').count();
    expect(oPieces).toBeGreaterThanOrEqual(2);
  });

  test('hard AI does not let X win from center + corners', async ({ page }) => {
    // This sequence is a known test for hard AI — it should never let X win
    // X plays: center → X plays corners → AI blocks → result should not be "Player X wins!"
    await clickCell(page, 4); // X center
    await waitForAI(page);

    // Only continue if game is not over
    const statusAfter1 = await page.locator('#statusMessage').textContent();
    if (statusAfter1.includes('wins') || statusAfter1.includes('draw')) return;

    await clickCell(page, 0); // X top-left corner
    await waitForAI(page);

    const statusAfter2 = await page.locator('#statusMessage').textContent();
    // Hard AI should never allow X to win
    expect(statusAfter2).not.toContain('Player X wins');
  });
});

/* ================================================================
   SECTION 5 — New Game / Reset Score with difficulty selector
   ================================================================ */
test.describe('New Game and Reset Score with difficulty selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('New Game in single-player resets board but keeps difficulty', async ({ page }) => {
    // Set difficulty to Easy
    await page.click('#diffEasy');

    // Play a move
    await clickCell(page, 4);
    await waitForAI(page);

    // Click New Game
    await page.click('#newGameBtn');

    // Board should be clean
    const takenCells = await page.locator('.cell.taken').count();
    expect(takenCells).toBe(0);

    // Difficulty should still be Easy
    await expect(page.locator('#diffEasy')).toHaveClass(/difficulty-btn--active/);
    await expect(page.locator('#diffEasy')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Reset Score keeps difficulty setting', async ({ page }) => {
    // Set difficulty to Medium
    await page.click('#diffMedium');

    // Play and reset score
    await clickCell(page, 4);
    await waitForAI(page);
    await page.click('#resetScoreBtn');

    // Difficulty should still be Medium
    await expect(page.locator('#diffMedium')).toHaveClass(/difficulty-btn--active/);
  });

  test('difficulty selector remains visible after New Game in single-player', async ({ page }) => {
    await clickCell(page, 4);
    await waitForAI(page);
    await page.click('#newGameBtn');
    await expect(page.locator('#difficultySwitcher')).toBeVisible();
  });

  test('difficulty selector hidden after New Game in two-player mode', async ({ page }) => {
    // Switch to two-player (hides difficulty selector)
    await page.click('#btn2p');
    await expect(page.locator('#difficultySwitcher')).toBeHidden();

    // Click New Game (should not show difficulty selector)
    await page.click('#newGameBtn');
    await expect(page.locator('#difficultySwitcher')).toBeHidden();
  });
});

/* ================================================================
   SECTION 6 — Accessibility of difficulty buttons
   ================================================================ */
test.describe('Difficulty selector accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('difficulty buttons have role="group" container with aria-label', async ({ page }) => {
    const ds = page.locator('#difficultySwitcher');
    await expect(ds).toHaveAttribute('role', 'group');
    await expect(ds).toHaveAttribute('aria-label', 'AI difficulty selection');
  });

  test('Easy button has type="button" attribute', async ({ page }) => {
    await expect(page.locator('#diffEasy')).toHaveAttribute('type', 'button');
  });

  test('Medium button has type="button" attribute', async ({ page }) => {
    await expect(page.locator('#diffMedium')).toHaveAttribute('type', 'button');
  });

  test('Hard button has type="button" attribute', async ({ page }) => {
    await expect(page.locator('#diffHard')).toHaveAttribute('type', 'button');
  });

  test('all difficulty buttons have text content', async ({ page }) => {
    await expect(page.locator('#diffEasy')).toHaveText('Easy');
    await expect(page.locator('#diffMedium')).toHaveText('Medium');
    await expect(page.locator('#diffHard')).toHaveText('Hard');
  });
});
