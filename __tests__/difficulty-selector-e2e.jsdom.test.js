/**
 * difficulty-selector-e2e.jsdom.test.js
 *
 * JSDOM-based End-to-End simulation tests for the AI Difficulty Selector feature.
 *
 * Since Playwright cannot launch real browsers in this environment (missing
 * system libraries: libglib-2.0.so.0 etc.), this file uses Jest's jsdom
 * environment + the actual index.html DOM structure to simulate full
 * browser-level interactions.
 *
 * These tests verify the difficulty selector feature from a user perspective:
 *  — Page structure: difficulty buttons present and correctly initialized
 *  — Difficulty button clicks: active state updates, aria-pressed updates
 *  — Mode switcher integration: difficultySwitcher show/hide with mode changes
 *  — AI gameplay integration: AI responds at all difficulty levels
 *  — New Game / Reset Score: difficulty setting preserved across resets
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ============================================================
   Load the actual index.html structure for realistic DOM
   ============================================================ */
const INDEX_HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const GAME_JS_PATH    = path.resolve(__dirname, '..', 'game.js');

/**
 * Extract just the <body> content from index.html for use as our jsdom body.
 * We use the exact HTML the game ships with, so tests reflect real-world behavior.
 */
function getGameBodyHTML() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  // Extract the content between <body> and </body>
  const match = html.match(/<body>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : html;
}

/* ============================================================
   Module loader with coverage tracking
   ============================================================ */
let _dclHandlers = [];

function loadGame() {
  _dclHandlers.forEach((h) => document.removeEventListener('DOMContentLoaded', h));
  _dclHandlers = [];

  jest.resetModules();

  const origAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') _dclHandlers.push(handler);
    return origAddEventListener(event, handler, ...rest);
  };

  const game = require('../game.js');
  document.addEventListener = origAddEventListener;
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return game;
}

/** Click cell at data-index */
function clickCell(index) {
  document.querySelector(`[data-index="${index}"]`).click();
}

/** Get element text */
function textOf(id) {
  return document.getElementById(id)?.textContent?.trim() ?? '';
}

/* ================================================================
   SECTION 1 — Page structure (loaded from actual index.html)
   ================================================================ */
describe('E2E: Difficulty selector page structure', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = getGameBodyHTML();
    game = loadGame();
  });

  afterEach(() => {
    jest.runAllTimers && jest.runAllTimers();
  });

  test('difficulty selector (#difficultySwitcher) is present in the DOM', () => {
    expect(document.getElementById('difficultySwitcher')).toBeTruthy();
  });

  test('three difficulty buttons are present: diffEasy, diffMedium, diffHard', () => {
    expect(document.getElementById('diffEasy')).toBeTruthy();
    expect(document.getElementById('diffMedium')).toBeTruthy();
    expect(document.getElementById('diffHard')).toBeTruthy();
  });

  test('Hard button is active by default (difficulty="hard" on load)', () => {
    const hardBtn = document.getElementById('diffHard');
    expect(hardBtn.classList.contains('difficulty-btn--active')).toBe(true);
    expect(hardBtn.getAttribute('aria-pressed')).toBe('true');
  });

  test('Easy and Medium buttons are inactive by default', () => {
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('false');
  });

  test('difficulty selector is visible in single-player mode (1-player default)', () => {
    // Game starts in single-player mode (btn1p is in DOM) — difficulty selector must be visible
    const ds = document.getElementById('difficultySwitcher');
    expect(ds.hasAttribute('hidden')).toBe(false);
  });

  test('difficulty selector has role="group" and aria-label="AI difficulty selection"', () => {
    const ds = document.getElementById('difficultySwitcher');
    expect(ds.getAttribute('role')).toBe('group');
    expect(ds.getAttribute('aria-label')).toBe('AI difficulty selection');
  });

  test('each difficulty button has type="button"', () => {
    ['diffEasy', 'diffMedium', 'diffHard'].forEach((id) => {
      expect(document.getElementById(id).getAttribute('type')).toBe('button');
    });
  });

  test('internal state: difficulty is "hard" on init', () => {
    expect(game._getState().difficulty).toBe('hard');
  });

  test('mode switcher (#modeSwitcher) is present and defaults to 1-player', () => {
    const btn1p = document.getElementById('btn1p');
    expect(btn1p).toBeTruthy();
    expect(btn1p.classList.contains('mode-btn--active')).toBe(true);
  });

  test('no errors thrown on initial page load', () => {
    expect(() => {
      document.body.innerHTML = getGameBodyHTML();
      loadGame();
    }).not.toThrow();
  });
});

/* ================================================================
   SECTION 2 — Difficulty button click interactions
   ================================================================ */
describe('E2E: Difficulty button click interactions', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = getGameBodyHTML();
    game = loadGame();
  });

  test('clicking Easy: Easy becomes active, Hard becomes inactive', () => {
    document.getElementById('diffEasy').click();
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('clicking Medium: Medium becomes active, others become inactive', () => {
    document.getElementById('diffMedium').click();
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('clicking Hard (after Easy): Hard becomes active, Easy becomes inactive', () => {
    document.getElementById('diffEasy').click();
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);

    document.getElementById('diffHard').click();
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('only one difficulty button is active at any time', () => {
    document.getElementById('diffEasy').click();
    expect(document.querySelectorAll('.difficulty-btn--active').length).toBe(1);

    document.getElementById('diffMedium').click();
    expect(document.querySelectorAll('.difficulty-btn--active').length).toBe(1);

    document.getElementById('diffHard').click();
    expect(document.querySelectorAll('.difficulty-btn--active').length).toBe(1);
  });

  test('internal state updates when clicking difficulty buttons', () => {
    document.getElementById('diffEasy').click();
    expect(game._getState().difficulty).toBe('easy');

    document.getElementById('diffMedium').click();
    expect(game._getState().difficulty).toBe('medium');

    document.getElementById('diffHard').click();
    expect(game._getState().difficulty).toBe('hard');
  });

  test('clicking same difficulty button twice is idempotent', () => {
    document.getElementById('diffEasy').click();
    document.getElementById('diffEasy').click();
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.querySelectorAll('.difficulty-btn--active').length).toBe(1);
  });

  test('cycling through all difficulties works correctly', () => {
    const difficulties = ['diffEasy', 'diffMedium', 'diffHard', 'diffEasy', 'diffMedium'];
    for (const id of difficulties) {
      document.getElementById(id).click();
      expect(document.getElementById(id).classList.contains('difficulty-btn--active')).toBe(true);
      expect(document.querySelectorAll('.difficulty-btn--active').length).toBe(1);
    }
  });
});

/* ================================================================
   SECTION 3 — Difficulty selector visibility with mode switcher
   ================================================================ */
describe('E2E: Difficulty selector show/hide with mode switcher', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = getGameBodyHTML();
    game = loadGame();
  });

  test('difficulty selector is visible in 1-player mode (initial state)', () => {
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);
  });

  test('switching to 2-player hides the difficulty selector', () => {
    document.getElementById('btn2p').click();
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);
  });

  test('switching back to 1-player shows the difficulty selector again', () => {
    document.getElementById('btn2p').click(); // hide
    document.getElementById('btn1p').click(); // show
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);
  });

  test('toggling modes multiple times: difficulty selector appears/disappears correctly', () => {
    const ds = document.getElementById('difficultySwitcher');
    // Initial: visible
    expect(ds.hasAttribute('hidden')).toBe(false);
    // 2-player: hidden
    document.getElementById('btn2p').click();
    expect(ds.hasAttribute('hidden')).toBe(true);
    // 1-player: visible
    document.getElementById('btn1p').click();
    expect(ds.hasAttribute('hidden')).toBe(false);
    // 2-player again: hidden
    document.getElementById('btn2p').click();
    expect(ds.hasAttribute('hidden')).toBe(true);
  });

  test('difficulty button state is preserved when switching modes', () => {
    // Set to Easy
    document.getElementById('diffEasy').click();
    expect(game._getState().difficulty).toBe('easy');

    // Switch to 2-player (hides selector, but difficulty state should persist)
    document.getElementById('btn2p').click();
    expect(game._getState().difficulty).toBe('easy');

    // Switch back to 1-player
    document.getElementById('btn1p').click();
    // Easy button should still be active
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
    expect(game._getState().difficulty).toBe('easy');
  });

  test('New Game button does not change difficulty selector visibility', () => {
    // In single-player (visible)
    document.getElementById('newGameBtn').click();
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);

    // After switching to 2-player and clicking New Game
    document.getElementById('btn2p').click();
    document.getElementById('newGameBtn').click();
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);
  });

  test('2-player mode: mode buttons have correct aria-pressed states', () => {
    document.getElementById('btn2p').click();
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('false');
  });

  test('1-player mode: mode buttons have correct aria-pressed states', () => {
    document.getElementById('btn2p').click(); // switch away
    document.getElementById('btn1p').click(); // switch back
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('false');
  });
});

/* ================================================================
   SECTION 4 — AI gameplay with different difficulties (JSDOM simulation)
   ================================================================ */
describe('E2E: AI gameplay at different difficulty levels', () => {
  let game;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = getGameBodyHTML();
    game = loadGame();
    // Game starts in single-player mode by default
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('hard difficulty (default): AI places O piece within 400ms', () => {
    expect(game._getState().difficulty).toBe('hard');
    clickCell(4); // X plays center
    expect(document.querySelectorAll('.cell.o-piece').length).toBe(0); // AI hasn't played yet
    jest.advanceTimersByTime(400);
    expect(document.querySelectorAll('.cell.o-piece').length).toBe(1); // AI played
  });

  test('easy difficulty: AI still places O piece within 400ms', () => {
    game.setDifficulty('easy');
    expect(game._getState().difficulty).toBe('easy');
    clickCell(4); // X plays center
    jest.advanceTimersByTime(400);
    expect(document.querySelectorAll('.cell.o-piece').length).toBe(1);
  });

  test('medium difficulty: AI still places O piece within 400ms', () => {
    game.setDifficulty('medium');
    expect(game._getState().difficulty).toBe('medium');
    clickCell(0); // X plays corner
    jest.advanceTimersByTime(400);
    expect(document.querySelectorAll('.cell.o-piece').length).toBe(1);
  });

  test('board is locked during AI thinking period (400ms delay)', () => {
    clickCell(4); // X plays
    // Immediately after X plays: board should be locked
    expect(document.getElementById('board').classList.contains('board--locked')).toBe(true);
    jest.advanceTimersByTime(400);
    // After AI plays: board should be unlocked
    expect(document.getElementById('board').classList.contains('board--locked')).toBe(false);
  });

  test('human cannot play while AI is thinking', () => {
    clickCell(4); // X plays
    // Board locked — human click on cell 0 should be ignored
    clickCell(0);
    expect(document.querySelector('[data-index="0"]').classList.contains('taken')).toBe(false);
    jest.advanceTimersByTime(400); // AI plays
  });

  test('turn indicator shows O while AI is thinking', () => {
    clickCell(4); // X plays → turn advances to O (AI thinking)
    expect(textOf('currentPlayerSymbol')).toBe('O');
  });

  test('turn indicator shows X after AI responds', () => {
    clickCell(4); // X plays
    jest.advanceTimersByTime(400); // AI responds
    expect(textOf('currentPlayerSymbol')).toBe('X');
  });

  test('changing difficulty mid-game: AI uses new difficulty on next move', () => {
    // X plays (hard AI responds)
    clickCell(4);
    jest.advanceTimersByTime(400);
    expect(document.querySelectorAll('.cell.o-piece').length).toBe(1);

    // Change to easy
    game.setDifficulty('easy');
    expect(game._getState().difficulty).toBe('easy');

    // X plays again (easy AI should respond)
    const emptyCell = Array.from(document.querySelectorAll('.cell')).find((c) => !c.classList.contains('taken'));
    if (emptyCell) {
      const idx = Number(emptyCell.getAttribute('data-index'));
      clickCell(idx);
      jest.advanceTimersByTime(400);
      expect(document.querySelectorAll('.cell.o-piece').length).toBeGreaterThanOrEqual(2);
    }
  });

  test('hard AI never lets X win from optimal X play (AI invincibility)', () => {
    // X plays optimally: center, then corners — hard AI should always block or draw
    const xMoves = [4, 0, 2, 6, 8]; // X's preferred strong moves
    for (const idx of xMoves) {
      const state = game._getState();
      if (state.gameOver) break;
      const cell = document.querySelector(`[data-index="${idx}"]`);
      if (!cell.classList.contains('taken')) {
        clickCell(idx);
        jest.advanceTimersByTime(400); // AI responds
      }
    }
    const status = textOf('statusMessage');
    expect(status).not.toBe('Player X wins!');
  });

  test('New Game resets board and cancels pending AI move', () => {
    clickCell(4); // X plays → AI delay starts
    document.getElementById('newGameBtn').click(); // Reset before AI fires

    jest.advanceTimersByTime(400); // AI timer fires (should be cancelled)

    // Board should be clean
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('taken')).toBe(false);
    });
    expect(document.getElementById('board').classList.contains('board--locked')).toBe(false);
  });

  test('switching to 2-player mid-game cancels AI and resets board', () => {
    clickCell(4); // X plays → AI delay starts
    const boardEl = document.getElementById('board');
    expect(boardEl.classList.contains('board--locked')).toBe(true);

    document.getElementById('btn2p').click(); // Switch mode (cancels AI)
    expect(boardEl.classList.contains('board--locked')).toBe(false);

    jest.advanceTimersByTime(400); // Timer fires but should be cancelled

    // Board should be clean
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('taken')).toBe(false);
    });
  });
});

/* ================================================================
   SECTION 5 — New Game and Reset Score interactions
   ================================================================ */
describe('E2E: New Game and Reset Score with difficulty selector', () => {
  let game;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = getGameBodyHTML();
    game = loadGame();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('New Game preserves difficulty setting', () => {
    game.setDifficulty('easy');
    clickCell(4);
    jest.advanceTimersByTime(400);

    document.getElementById('newGameBtn').click();

    // Difficulty should still be easy
    expect(game._getState().difficulty).toBe('easy');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
  });

  test('Reset Score preserves difficulty setting', () => {
    game.setDifficulty('medium');
    clickCell(4);
    jest.advanceTimersByTime(400);

    document.getElementById('resetScoreBtn').click();

    expect(game._getState().difficulty).toBe('medium');
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(true);
  });

  test('difficulty selector remains visible after New Game in single-player', () => {
    clickCell(4);
    jest.advanceTimersByTime(400);
    document.getElementById('newGameBtn').click();

    const ds = document.getElementById('difficultySwitcher');
    expect(ds.hasAttribute('hidden')).toBe(false);
  });

  test('difficulty selector stays hidden after New Game in two-player mode', () => {
    document.getElementById('btn2p').click();
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);

    document.getElementById('newGameBtn').click();
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);
  });

  test('Reset Score clears scores to 0', () => {
    clickCell(4);
    jest.advanceTimersByTime(400);

    document.getElementById('resetScoreBtn').click();

    expect(textOf('scoreX')).toBe('0');
    expect(textOf('scoreO')).toBe('0');
    expect(textOf('scoreDraw')).toBe('0');
  });
});
