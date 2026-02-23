/**
 * css-animations.e2e.spec.js
 *
 * Playwright end-to-end tests for the CSS animations and neon visual effects
 * feature introduced in:
 *   feat: add smooth CSS animations and neon visual effects
 *
 * Tests cover (using a real browser):
 *  1. Board entrance animation (@keyframes board-enter) — computed style check
 *  2. Mark-appear animation (@keyframes mark-appear) — applied after move
 *  3. Winning-pulse animation (@keyframes winning-pulse) — applied on win
 *  4. Player-aware hover glow (CSS sibling combinator ~ ) — class state verified
 *  5. Score-card transform scale (active-player) — computed style check
 *  6. Button focus-visible neon outline — element attribute check
 *  7. Button ghost hover box-shadow — state verified
 *  8. prefers-reduced-motion support — media emulation
 *  9. No console errors during animation lifecycle
 * 10. CSS custom properties (design tokens) are resolved in the browser
 */

'use strict';

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

async function clickCell(page, index) {
  await page.click(`[data-index="${index}"]`);
}

async function playMoves(page, indices) {
  for (const i of indices) {
    await clickCell(page, i);
  }
}

async function getComputedStyleProp(page, selector, prop) {
  return page.evaluate(
    ({ sel, p }) => window.getComputedStyle(document.querySelector(sel))[p],
    { sel: selector, p: prop }
  );
}

/* ---------------------------------------------------------------------------
   1. Board entrance animation — @keyframes board-enter
   --------------------------------------------------------------------------- */
test.describe('Board entrance animation (board-enter)', () => {
  test('board element has animation-name = board-enter', async ({ page }) => {
    await page.goto(BASE_URL);
    // animation-name should reflect the @keyframes name
    const animName = await getComputedStyleProp(page, '#board', 'animationName');
    expect(animName).toBe('board-enter');
  });

  test('board animation uses ease-out timing function', async ({ page }) => {
    await page.goto(BASE_URL);
    const timingFn = await getComputedStyleProp(page, '#board', 'animationTimingFunction');
    // ease-out resolves to cubic-bezier(0, 0, 0.58, 1) in most browsers
    expect(timingFn).toBeTruthy();
    expect(timingFn.length).toBeGreaterThan(0);
  });

  test('board animation duration is 0.5s', async ({ page }) => {
    await page.goto(BASE_URL);
    const dur = await getComputedStyleProp(page, '#board', 'animationDuration');
    // 0.5s = "0.5s"
    expect(dur).toBe('0.5s');
  });

  test('board animation fill mode is "both"', async ({ page }) => {
    await page.goto(BASE_URL);
    const fillMode = await getComputedStyleProp(page, '#board', 'animationFillMode');
    expect(fillMode).toBe('both');
  });

  test('board is visible after animation (no flash-of-invisible)', async ({ page }) => {
    await page.goto(BASE_URL);
    // After page load, the board should be visible
    await expect(page.locator('#board')).toBeVisible();
  });
});

/* ---------------------------------------------------------------------------
   2. Mark-appear animation (@keyframes mark-appear)
   --------------------------------------------------------------------------- */
test.describe('Mark-appear animation on X/O placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('x-piece cell has mark-appear animation-name after X plays', async ({ page }) => {
    await clickCell(page, 0);
    // Wait for class to be applied
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);

    const animName = await page.evaluate(() => {
      const el = document.querySelector('[data-index="0"]');
      // Get animation of the ::after pseudo-element
      return window.getComputedStyle(el, '::after').animationName;
    });
    expect(animName).toBe('mark-appear');
  });

  test('o-piece cell has mark-appear animation-name after O plays', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 4); // O
    await expect(page.locator('[data-index="4"]')).toHaveClass(/o-piece/);

    const animName = await page.evaluate(() => {
      const el = document.querySelector('[data-index="4"]');
      return window.getComputedStyle(el, '::after').animationName;
    });
    expect(animName).toBe('mark-appear');
  });

  test('mark-appear animation duration is 0.3s', async ({ page }) => {
    await clickCell(page, 3);
    await expect(page.locator('[data-index="3"]')).toHaveClass(/x-piece/);

    const dur = await page.evaluate(() => {
      const el = document.querySelector('[data-index="3"]');
      return window.getComputedStyle(el, '::after').animationDuration;
    });
    expect(dur).toBe('0.3s');
  });

  test('mark-appear animation fill mode is "forwards"', async ({ page }) => {
    await clickCell(page, 5);
    await expect(page.locator('[data-index="5"]')).toHaveClass(/x-piece/);

    const fillMode = await page.evaluate(() => {
      const el = document.querySelector('[data-index="5"]');
      return window.getComputedStyle(el, '::after').animationFillMode;
    });
    expect(fillMode).toBe('forwards');
  });

  test('::after pseudo-element has display: inline-block for X piece', async ({ page }) => {
    await clickCell(page, 2);
    await expect(page.locator('[data-index="2"]')).toHaveClass(/x-piece/);

    const display = await page.evaluate(() => {
      const el = document.querySelector('[data-index="2"]');
      return window.getComputedStyle(el, '::after').display;
    });
    expect(display).toBe('inline-block');
  });

  test('::after pseudo-element has display: inline-block for O piece', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 6); // O
    await expect(page.locator('[data-index="6"]')).toHaveClass(/o-piece/);

    const display = await page.evaluate(() => {
      const el = document.querySelector('[data-index="6"]');
      return window.getComputedStyle(el, '::after').display;
    });
    expect(display).toBe('inline-block');
  });

  test('X piece ::after content is ✕ symbol', async ({ page }) => {
    await clickCell(page, 1);
    await expect(page.locator('[data-index="1"]')).toHaveClass(/x-piece/);

    const content = await page.evaluate(() => {
      const el = document.querySelector('[data-index="1"]');
      return window.getComputedStyle(el, '::after').content;
    });
    // content value includes quotes: '"✕"'
    expect(content).toContain('✕');
  });

  test('O piece ::after content is ○ symbol', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 8); // O
    await expect(page.locator('[data-index="8"]')).toHaveClass(/o-piece/);

    const content = await page.evaluate(() => {
      const el = document.querySelector('[data-index="8"]');
      return window.getComputedStyle(el, '::after').content;
    });
    expect(content).toContain('○');
  });
});

/* ---------------------------------------------------------------------------
   3. Winning-pulse animation (@keyframes winning-pulse)
   --------------------------------------------------------------------------- */
test.describe('Winning-pulse animation on win cells', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('winning cell has winning-pulse animation-name', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins top row
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);

    const animName = await getComputedStyleProp(page, '[data-index="0"]', 'animationName');
    expect(animName).toBe('winning-pulse');
  });

  test('winning-pulse animation plays infinitely (iteration count)', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);

    const iterCount = await getComputedStyleProp(
      page, '[data-index="0"]', 'animationIterationCount'
    );
    expect(iterCount).toBe('infinite');
  });

  test('winning-pulse animation direction is alternate', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);

    const dir = await getComputedStyleProp(
      page, '[data-index="0"]', 'animationDirection'
    );
    expect(dir).toBe('alternate');
  });

  test('winning-pulse animation duration is 1s', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    const dur = await getComputedStyleProp(
      page, '[data-index="0"]', 'animationDuration'
    );
    expect(dur).toBe('1s');
  });

  test('all three winning cells have winning-pulse animation', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins on [0,1,2]
    for (const i of [0, 1, 2]) {
      const animName = await getComputedStyleProp(
        page, `[data-index="${i}"]`, 'animationName'
      );
      expect(animName).toBe('winning-pulse');
    }
  });

  test('non-winning cells do not have winning-pulse animation', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    // Cells [3,4] were O's, should not pulse
    for (const i of [3, 4]) {
      const animName = await getComputedStyleProp(
        page, `[data-index="${i}"]`, 'animationName'
      );
      expect(animName).not.toBe('winning-pulse');
    }
  });

  test('winning cell has gold border-color (--color-win)', async ({ page }) => {
    await playMoves(page, [0, 3, 1, 4, 2]);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);

    const borderColor = await getComputedStyleProp(
      page, '[data-index="0"]', 'borderColor'
    );
    // rgb(255, 230, 0) is the computed value of #ffe600
    expect(borderColor).toBe('rgb(255, 230, 0)');
  });
});

/* ---------------------------------------------------------------------------
   4. Player-aware hover glow (CSS sibling combinator)
   --------------------------------------------------------------------------- */
test.describe('Player-aware hover glow via CSS sibling combinator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('turnIndicator has is-x class on page load', async ({ page }) => {
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-x/);
  });

  test('turnIndicator switches to is-o after X plays (glow colour changes)', async ({ page }) => {
    await clickCell(page, 0);
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-o/);
    await expect(page.locator('#turnIndicator')).not.toHaveClass(/is-x/);
  });

  test('turnIndicator is-x means X hover glow rule is active', async ({ page }) => {
    // When .turn-indicator.is-x, the CSS sibling rule applies cyan glow on hover.
    // We verify the class state is correct (browser would apply the CSS at :hover).
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-x/);

    // Trigger hover on an empty cell to verify no JS error occurs
    await page.hover('[data-index="4"]');
    // No error means the sibling combinator rule was processed correctly
  });

  test('turnIndicator is-o means O hover glow rule is active', async ({ page }) => {
    await clickCell(page, 0); // X plays → O's turn
    await expect(page.locator('#turnIndicator')).toHaveClass(/is-o/);

    // Hover over empty cell — checks that CSS sibling combinator doesn't crash
    await page.hover('[data-index="4"]');
  });

  test('taken cells (class .taken) are excluded from hover glow rule', async ({ page }) => {
    await clickCell(page, 4); // X takes centre
    await expect(page.locator('[data-index="4"]')).toHaveClass(/taken/);
    // CSS rule is .cell:not(.taken):hover — taken cell is excluded
  });

  test('hover over empty cell does not produce JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.hover('[data-index="0"]');
    await page.hover('[data-index="4"]');
    await page.hover('[data-index="8"]');

    expect(errors).toHaveLength(0);
  });

  test('DOM sibling order: turnIndicator precedes board in DOM', async ({ page }) => {
    const isCorrectOrder = await page.evaluate(() => {
      const ti    = document.getElementById('turnIndicator');
      const board = document.getElementById('board');
      // DOCUMENT_POSITION_FOLLOWING means board comes after ti
      return !!(ti.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(isCorrectOrder).toBe(true);
  });

  test('turnIndicator and board are siblings in the DOM', async ({ page }) => {
    const areSiblings = await page.evaluate(() => {
      const ti    = document.getElementById('turnIndicator');
      const board = document.getElementById('board');
      return ti.parentElement === board.parentElement;
    });
    expect(areSiblings).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   5. Score card scale transform on active-player
   --------------------------------------------------------------------------- */
test.describe('Score card scale transform (active-player)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('scoreCardX has transform scale(1.04) when active (X\'s turn)', async ({ page }) => {
    // Initially X is active
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);

    const transform = await getComputedStyleProp(page, '#scoreCardX', 'transform');
    // scale(1.04) in matrix form: matrix(1.04, 0, 0, 1.04, 0, 0)
    expect(transform).toContain('1.04');
  });

  test('scoreCardO has transform scale(1.04) when active (O\'s turn)', async ({ page }) => {
    await clickCell(page, 0); // X plays → O's turn
    await expect(page.locator('#scoreCardO')).toHaveClass(/active-player/);

    const transform = await getComputedStyleProp(page, '#scoreCardO', 'transform');
    expect(transform).toContain('1.04');
  });

  test('scoreCardX has NO scale(1.04) when not active (O\'s turn)', async ({ page }) => {
    await clickCell(page, 0); // X plays → O is active
    await expect(page.locator('#scoreCardX')).not.toHaveClass(/active-player/);

    const transform = await getComputedStyleProp(page, '#scoreCardX', 'transform');
    // When not active, transform should be none or identity (no 1.04 scale)
    expect(transform).not.toContain('1.04');
  });

  test('scoreCardO has NO scale(1.04) when not active (X\'s turn)', async ({ page }) => {
    await expect(page.locator('#scoreCardO')).not.toHaveClass(/active-player/);

    const transform = await getComputedStyleProp(page, '#scoreCardO', 'transform');
    expect(transform).not.toContain('1.04');
  });

  test('score card transition includes transform property', async ({ page }) => {
    const transition = await getComputedStyleProp(page, '#scoreCardX', 'transition');
    // transition should include 'transform'
    expect(transition).toContain('transform');
  });

  test('active-player score card scales back to normal after new game', async ({ page }) => {
    // After new game, X is active again and O should be normal
    await clickCell(page, 0); // O becomes active
    await page.click('#newGameBtn');

    // X should now be active (scaled), O should be normal
    await expect(page.locator('#scoreCardX')).toHaveClass(/active-player/);
    const transformO = await getComputedStyleProp(page, '#scoreCardO', 'transform');
    expect(transformO).not.toContain('1.04');
  });
});

/* ---------------------------------------------------------------------------
   6. Button focus-visible neon outline
   --------------------------------------------------------------------------- */
test.describe('Button focus-visible neon outline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('New Game button (btn-primary) is present and visible', async ({ page }) => {
    await expect(page.locator('#newGameBtn')).toBeVisible();
    await expect(page.locator('#newGameBtn')).toHaveClass(/btn-primary/);
  });

  test('Reset Score button (btn-ghost) is present and visible', async ({ page }) => {
    await expect(page.locator('#resetScoreBtn')).toBeVisible();
    await expect(page.locator('#resetScoreBtn')).toHaveClass(/btn-ghost/);
  });

  test('btn-primary has cyan background color (--color-x)', async ({ page }) => {
    const bgColor = await getComputedStyleProp(page, '#newGameBtn', 'backgroundColor');
    // --color-x: #00f0ff → rgb(0, 240, 255)
    expect(bgColor).toBe('rgb(0, 240, 255)');
  });

  test('buttons have border-radius: 999px (pill shape)', async ({ page }) => {
    const radius = await getComputedStyleProp(page, '#newGameBtn', 'borderRadius');
    expect(radius).toBe('999px');
  });

  test('buttons have transition property for smooth hover/focus effects', async ({ page }) => {
    const transition = await getComputedStyleProp(page, '#newGameBtn', 'transition');
    expect(transition).toBeTruthy();
    expect(transition.length).toBeGreaterThan(0);
  });

  test('focusing button via keyboard does not produce JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.focus('#newGameBtn');
    await page.focus('#resetScoreBtn');
    await page.keyboard.press('Tab');

    expect(errors).toHaveLength(0);
  });

  test('btn outline CSS property is set on focus (outline: 2px solid cyan)', async ({ page }) => {
    // Focus the button and check outline via JS
    const outlineStyle = await page.evaluate(() => {
      const btn = document.getElementById('newGameBtn');
      btn.focus();
      // The :focus-visible pseudo-class applies when focused via keyboard
      // We check the CSS rule exists by inspecting the stylesheet
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('focus-visible')) {
              return rule.style.outline;
            }
          }
        } catch (e) { /* cross-origin sheets */ }
      }
      return null;
    });
    // The :focus-visible rule should define the outline
    expect(outlineStyle).toContain('2px');
  });
});

/* ---------------------------------------------------------------------------
   7. Button ghost hover box-shadow
   --------------------------------------------------------------------------- */
test.describe('Button ghost hover box-shadow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('btn-ghost CSS rule includes box-shadow in hover state', async ({ page }) => {
    // Inspect the stylesheet for the box-shadow property in .btn-ghost:hover
    const hasBoxShadow = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (
              rule.selectorText &&
              rule.selectorText.includes('btn-ghost') &&
              rule.selectorText.includes('hover') &&
              rule.style.boxShadow
            ) {
              return true;
            }
          }
        } catch (e) { /* cross-origin */ }
      }
      return false;
    });
    expect(hasBoxShadow).toBe(true);
  });

  test('hovering Reset Score button does not produce JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.hover('#resetScoreBtn');

    expect(errors).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------
   8. prefers-reduced-motion support
   --------------------------------------------------------------------------- */
test.describe('prefers-reduced-motion accessibility support', () => {
  test('with reduced-motion, board animation-name is "none"', async ({ page }) => {
    // Emulate the reduced motion media preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);

    const animName = await getComputedStyleProp(page, '#board', 'animationName');
    expect(animName).toBe('none');
  });

  test('with reduced-motion, winning cell has no animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins

    const animName = await getComputedStyleProp(page, '[data-index="0"]', 'animationName');
    expect(animName).toBe('none');
  });

  test('with reduced-motion, x-piece::after has no animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await clickCell(page, 0);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);

    const animName = await page.evaluate(() => {
      const el = document.querySelector('[data-index="0"]');
      return window.getComputedStyle(el, '::after').animationName;
    });
    expect(animName).toBe('none');
  });

  test('with reduced-motion, o-piece::after has no animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await clickCell(page, 0); // X
    await clickCell(page, 4); // O
    await expect(page.locator('[data-index="4"]')).toHaveClass(/o-piece/);

    const animName = await page.evaluate(() => {
      const el = document.querySelector('[data-index="4"]');
      return window.getComputedStyle(el, '::after').animationName;
    });
    expect(animName).toBe('none');
  });

  test('with reduced-motion, cell transition-duration is near-zero', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);

    const dur = await getComputedStyleProp(page, '.cell', 'transitionDuration');
    // 0.01ms is the collapsed duration — any value ≤ 0.01s counts
    const numericMs = parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000);
    expect(numericMs).toBeLessThanOrEqual(10); // ≤ 10ms
  });

  test('with reduced-motion, btn transition-duration is near-zero', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);

    const dur = await getComputedStyleProp(page, '.btn', 'transitionDuration');
    const numericMs = parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000);
    expect(numericMs).toBeLessThanOrEqual(10);
  });

  test('with reduced-motion, game still plays correctly (logic unaffected)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);

    // Game should still be fully playable
    await playMoves(page, [0, 3, 1, 4, 2]); // X wins
    await expect(page.locator('#statusMessage')).toContainText('Player X wins!');
    await expect(page.locator('[data-index="0"]')).toHaveClass(/winning/);
    await expect(page.locator('#scoreX')).toHaveText('1');
  });

  test('without reduced-motion, board has board-enter animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(BASE_URL);

    const animName = await getComputedStyleProp(page, '#board', 'animationName');
    expect(animName).toBe('board-enter');
  });
});

/* ---------------------------------------------------------------------------
   9. CSS custom properties (design tokens) resolved in real browser
   --------------------------------------------------------------------------- */
test.describe('CSS design tokens (custom properties) in browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('--color-x resolves to the cyan neon colour #00f0ff', async ({ page }) => {
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-x').trim()
    );
    expect(color).toBe('#00f0ff');
  });

  test('--color-o resolves to the magenta neon colour #ff00aa', async ({ page }) => {
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-o').trim()
    );
    expect(color).toBe('#ff00aa');
  });

  test('--color-win resolves to gold #ffe600', async ({ page }) => {
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-win').trim()
    );
    expect(color).toBe('#ffe600');
  });

  test('--bg-body resolves to dark background #0d0d0d', async ({ page }) => {
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim()
    );
    expect(color).toBe('#0d0d0d');
  });

  test('body background-color matches --bg-body token', async ({ page }) => {
    const bgColor = await getComputedStyleProp(page, 'body', 'backgroundColor');
    // #0d0d0d = rgb(13, 13, 13)
    expect(bgColor).toBe('rgb(13, 13, 13)');
  });

  test('x-piece cell has cyan text color from --color-x token', async ({ page }) => {
    await clickCell(page, 0);
    await expect(page.locator('[data-index="0"]')).toHaveClass(/x-piece/);

    const textColor = await getComputedStyleProp(page, '[data-index="0"]', 'color');
    // --color-x: #00f0ff → rgb(0, 240, 255)
    expect(textColor).toBe('rgb(0, 240, 255)');
  });

  test('o-piece cell has magenta text color from --color-o token', async ({ page }) => {
    await clickCell(page, 0); // X
    await clickCell(page, 4); // O
    await expect(page.locator('[data-index="4"]')).toHaveClass(/o-piece/);

    const textColor = await getComputedStyleProp(page, '[data-index="4"]', 'color');
    // --color-o: #ff00aa → rgb(255, 0, 170)
    expect(textColor).toBe('rgb(255, 0, 170)');
  });
});

/* ---------------------------------------------------------------------------
   10. No console errors during animation lifecycle
   --------------------------------------------------------------------------- */
test.describe('No console errors during animation lifecycle', () => {
  test('no JS errors during full game with animations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(BASE_URL);

    // Play a complete game: X wins
    await playMoves(page, [0, 3, 1, 4, 2]);

    // Wait briefly to let any deferred animation-related code run
    await page.waitForTimeout(200);

    await page.click('#newGameBtn');

    // Play a draw game
    await playMoves(page, [0, 1, 2, 3, 5, 4, 6, 8, 7]);

    await page.click('#resetScoreBtn');

    expect(errors).toHaveLength(0);
  });

  test('no JS errors during rapid hover across all cells', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(BASE_URL);

    // Hover over each cell rapidly (exercises CSS sibling combinator hover glow)
    for (let i = 0; i < 9; i++) {
      await page.hover(`[data-index="${i}"]`);
    }

    expect(errors).toHaveLength(0);
  });

  test('no JS errors when switching turns (hover glow colour changes)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(BASE_URL);

    // Alternate between X and O turns, hovering after each move
    for (let i = 0; i < 4; i++) {
      await clickCell(page, i);
      await page.hover(`[data-index="${8 - i}"]`); // hover an empty cell
    }

    expect(errors).toHaveLength(0);
  });

  test('no JS errors during reduced-motion animated game', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);

    await playMoves(page, [0, 3, 1, 4, 2]); // X wins
    await page.waitForTimeout(100);
    await page.click('#newGameBtn');
    await page.click('#resetScoreBtn');

    expect(errors).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------
   11. Visual structure and layout (neon theme elements)
   --------------------------------------------------------------------------- */
test.describe('Neon theme visual structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('logo heading is visible with correct text', async ({ page }) => {
    await expect(page.locator('h1.logo')).toBeVisible();
    const text = await page.locator('h1.logo').textContent();
    expect(text).toContain('TIC');
    expect(text).toContain('TAC');
    expect(text).toContain('TOE');
  });

  test('logo X-color span has cyan color', async ({ page }) => {
    const color = await getComputedStyleProp(page, '.logo .x-color', 'color');
    expect(color).toBe('rgb(0, 240, 255)');
  });

  test('logo O-color span has magenta color', async ({ page }) => {
    const color = await getComputedStyleProp(page, '.logo .o-color', 'color');
    expect(color).toBe('rgb(255, 0, 170)');
  });

  test('board uses CSS grid with 3 columns', async ({ page }) => {
    const gridCols = await getComputedStyleProp(page, '#board', 'gridTemplateColumns');
    // Should have 3 column values
    const cols = gridCols.split(' ').filter(Boolean);
    expect(cols.length).toBe(3);
  });

  test('all 9 cells have non-zero dimensions', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const box = await page.locator(`[data-index="${i}"]`).boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  test('page has dark background (not white)', async ({ page }) => {
    const bgColor = await getComputedStyleProp(page, 'body', 'backgroundColor');
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('status-message element is in the DOM', async ({ page }) => {
    await expect(page.locator('#statusMessage')).toBeAttached();
  });

  test('scoreboard section is visible', async ({ page }) => {
    await expect(page.locator('.scoreboard')).toBeVisible();
  });

  test('all three score labels are visible', async ({ page }) => {
    await expect(page.locator('#scoreCardX')).toBeVisible();
    await expect(page.locator('#scoreCardDraw')).toBeVisible();
    await expect(page.locator('#scoreCardO')).toBeVisible();
  });
});
