/**
 * difficulty-selector.test.js
 *
 * Tests for the AI difficulty selector feature (Easy/Medium/Hard):
 *
 *  — setDifficulty()      : updates difficulty state and difficulty button UI
 *  — setGameMode()        : shows/hides the difficulty selector when mode changes
 *  — init()               : initialises difficulty selector buttons on page load
 *
 * Uses jest.resetModules() + require() (not eval) so that Jest's coverage
 * instrumentation tracks every branch in game.js for these new features.
 *
 * Coverage targets:
 *   game.js lines 442-445  (difficultySwitcher show/hide in setGameMode)
 *   game.js lines 458-474  (setDifficulty() body)
 *   game.js lines 538-542  (difficultySwitcher init in init())
 */

'use strict';

/* ============================================================
   HTML Fixtures
   ============================================================ */

/**
 * Full HTML with mode-switcher AND difficulty selector.
 * Used for the majority of tests.
 */
const FULL_WITH_DIFFICULTY_HTML = `
<div class="page-wrapper">
  <main class="game-container">
    <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite">
      Player <span class="player-symbol" id="currentPlayerSymbol">X</span>'s turn
    </div>
    <div class="mode-switcher" id="modeSwitcher" role="group" aria-label="Game mode selection">
      <button class="mode-btn mode-btn--active" id="btn1p" type="button" aria-pressed="true">1 Player</button>
      <button class="mode-btn" id="btn2p" type="button" aria-pressed="false">2 Players</button>
    </div>
    <div id="difficultySwitcher" role="group" aria-label="AI difficulty selection">
      <button class="difficulty-btn" id="diffEasy" type="button" aria-pressed="false">Easy</button>
      <button class="difficulty-btn" id="diffMedium" type="button" aria-pressed="false">Medium</button>
      <button class="difficulty-btn difficulty-btn--active" id="diffHard" type="button" aria-pressed="true">Hard</button>
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

/**
 * HTML without mode-switcher (two-player default).
 * difficultySwitcher is present but no btn1p/btn2p.
 */
const NO_MODE_SWITCHER_WITH_DIFFICULTY_HTML = `
<div class="page-wrapper">
  <main class="game-container">
    <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite">
      Player <span class="player-symbol" id="currentPlayerSymbol">X</span>'s turn
    </div>
    <div id="difficultySwitcher" role="group" aria-label="AI difficulty selection">
      <button class="difficulty-btn" id="diffEasy" type="button" aria-pressed="false">Easy</button>
      <button class="difficulty-btn" id="diffMedium" type="button" aria-pressed="false">Medium</button>
      <button class="difficulty-btn difficulty-btn--active" id="diffHard" type="button" aria-pressed="true">Hard</button>
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

/* ============================================================
   Module loading helper (uses require() for coverage tracking)
   ============================================================ */

/**
 * Track DOMContentLoaded handlers so we can remove them before each test,
 * preventing multiple module instances from all binding to the same DOM cells.
 */
let _dclHandlers = [];

/**
 * Load a fresh copy of game.js via require() so that Jest's coverage
 * instrumentation can track line execution. Must be called after
 * document.body.innerHTML has been set.
 *
 * Uses jest.resetModules() + handler tracking to ensure only the current
 * module's init() is active (prevents multiple handlers from previous tests
 * causing multiple AI moves per click).
 */
function loadGameModule() {
  // Remove DOMContentLoaded handlers registered by previous loadGameModule calls
  _dclHandlers.forEach((h) => document.removeEventListener('DOMContentLoaded', h));
  _dclHandlers = [];

  jest.resetModules();

  // Intercept addEventListener to capture the new DOMContentLoaded handler
  const origAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') _dclHandlers.push(handler);
    return origAddEventListener(event, handler, ...rest);
  };

  const game = require('../game.js');

  // Restore native addEventListener
  document.addEventListener = origAddEventListener;

  // Trigger the game's init() exactly once
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return game;
}

/* ================================================================
   SECTION 1 — setDifficulty() via require() for coverage
   ================================================================ */
describe('setDifficulty() — coverage-instrumented', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    game = loadGameModule();
  });

  test('setDifficulty("easy") activates Easy button and deactivates others', () => {
    game.setDifficulty('easy');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('setDifficulty("medium") activates Medium button and deactivates others', () => {
    game.setDifficulty('medium');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('setDifficulty("hard") activates Hard button and deactivates others', () => {
    game.setDifficulty('easy');   // switch away first
    game.setDifficulty('hard');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(true);
  });

  test('setDifficulty("easy") sets correct aria-pressed attributes', () => {
    game.setDifficulty('easy');
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('false');
  });

  test('setDifficulty("medium") sets correct aria-pressed attributes', () => {
    game.setDifficulty('medium');
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('false');
  });

  test('setDifficulty("hard") sets correct aria-pressed attributes', () => {
    game.setDifficulty('easy');  // switch away
    game.setDifficulty('hard');
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('true');
  });

  test('setDifficulty() is idempotent (calling same difficulty twice is safe)', () => {
    game.setDifficulty('easy');
    game.setDifficulty('easy');
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('setDifficulty() works without difficulty buttons in DOM (no-crash)', () => {
    ['diffEasy', 'diffMedium', 'diffHard'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    expect(() => game.setDifficulty('easy')).not.toThrow();
    expect(() => game.setDifficulty('medium')).not.toThrow();
    expect(() => game.setDifficulty('hard')).not.toThrow();
  });

  test('setDifficulty updates internal difficulty state', () => {
    game.setDifficulty('easy');
    expect(game._getState().difficulty).toBe('easy');
    game.setDifficulty('medium');
    expect(game._getState().difficulty).toBe('medium');
    game.setDifficulty('hard');
    expect(game._getState().difficulty).toBe('hard');
  });

  test('all three difficulty buttons get aria-pressed reset before activating one', () => {
    // Start with medium
    game.setDifficulty('medium');
    // All buttons get aria-pressed reset; medium gets activated
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('false');
    // Switch to hard
    game.setDifficulty('hard');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('true');
  });
});

/* ================================================================
   SECTION 2 — setGameMode() with difficultySwitcher — coverage-instrumented
   ================================================================ */
describe('setGameMode() with difficultySwitcher — coverage-instrumented', () => {
  let game;

  beforeEach(() => {
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    game = loadGameModule();
    // After init: gameMode='single', difficultySwitcher is visible
  });

  test('setGameMode("two-player") adds hidden attribute to difficultySwitcher', () => {
    game.setGameMode('two-player');
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);
  });

  test('setGameMode("single") removes hidden attribute from difficultySwitcher', () => {
    game.setGameMode('two-player');
    game.setGameMode('single');
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);
  });

  test('difficultySwitcher starts visible in single-player mode', () => {
    // gameMode='single' after init → no hidden attribute
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);
  });

  test('toggling modes multiple times correctly shows/hides difficulty selector', () => {
    const ds = document.getElementById('difficultySwitcher');
    expect(ds.hasAttribute('hidden')).toBe(false);     // single: visible
    game.setGameMode('two-player');
    expect(ds.hasAttribute('hidden')).toBe(true);      // two-player: hidden
    game.setGameMode('single');
    expect(ds.hasAttribute('hidden')).toBe(false);     // single: visible
    game.setGameMode('two-player');
    expect(ds.hasAttribute('hidden')).toBe(true);      // two-player: hidden
  });

  test('setGameMode without difficultySwitcher in DOM does not crash', () => {
    document.getElementById('difficultySwitcher').remove();
    expect(() => game.setGameMode('two-player')).not.toThrow();
    expect(() => game.setGameMode('single')).not.toThrow();
  });
});

/* ================================================================
   SECTION 3 — init() with difficulty selector — coverage-instrumented
   ================================================================ */
describe('init() with difficultySwitcher — coverage-instrumented', () => {
  test('difficulty selector is visible after init in single-player (btn1p present)', () => {
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    const game = loadGameModule();
    // btn1p present → gameMode='single' → difficultySwitcher visible
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(false);
    expect(game._getState().gameMode).toBe('single');
  });

  test('difficulty selector is hidden after init in two-player mode (no btn1p)', () => {
    document.body.innerHTML = NO_MODE_SWITCHER_WITH_DIFFICULTY_HTML;
    // Remove hidden from difficultySwitcher (starts fresh)
    document.getElementById('difficultySwitcher').removeAttribute('hidden');
    const game = loadGameModule();
    // No btn1p → gameMode='two-player' → init() hides difficultySwitcher
    expect(document.getElementById('difficultySwitcher').hasAttribute('hidden')).toBe(true);
    expect(game._getState().gameMode).toBe('two-player');
  });

  test('init() calls setDifficulty("hard") by default — Hard button activated', () => {
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    loadGameModule();
    // Default difficulty is 'hard' → diffHard should be active
    expect(document.getElementById('diffHard').classList.contains('difficulty-btn--active')).toBe(true);
    expect(document.getElementById('diffEasy').classList.contains('difficulty-btn--active')).toBe(false);
    expect(document.getElementById('diffMedium').classList.contains('difficulty-btn--active')).toBe(false);
  });

  test('init() calls setDifficulty() → diffHard gets aria-pressed="true"', () => {
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    loadGameModule();
    expect(document.getElementById('diffHard').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('diffEasy').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('diffMedium').getAttribute('aria-pressed')).toBe('false');
  });

  test('init() without difficultySwitcher in DOM: no crash', () => {
    const MINIMAL_HTML = `
    <div>
      <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite">
        Player <span id="currentPlayerSymbol">X</span>'s turn
      </div>
      <div class="board" id="board" role="grid">
        <div class="cell" data-index="0" tabindex="0" aria-label="Cell 1, empty"></div>
        <div class="cell" data-index="1" tabindex="0" aria-label="Cell 2, empty"></div>
        <div class="cell" data-index="2" tabindex="0" aria-label="Cell 3, empty"></div>
        <div class="cell" data-index="3" tabindex="0" aria-label="Cell 4, empty"></div>
        <div class="cell" data-index="4" tabindex="0" aria-label="Cell 5, empty"></div>
        <div class="cell" data-index="5" tabindex="0" aria-label="Cell 6, empty"></div>
        <div class="cell" data-index="6" tabindex="0" aria-label="Cell 7, empty"></div>
        <div class="cell" data-index="7" tabindex="0" aria-label="Cell 8, empty"></div>
        <div class="cell" data-index="8" tabindex="0" aria-label="Cell 9, empty"></div>
      </div>
      <div id="statusMessage"></div>
      <button id="newGameBtn">New Game</button>
      <button id="resetScoreBtn">Reset Score</button>
      <span id="scoreX">0</span>
      <span id="scoreO">0</span>
      <span id="scoreDraw">0</span>
      <div id="scoreCardX"></div>
      <div id="scoreCardO"></div>
    </div>`;
    document.body.innerHTML = MINIMAL_HTML;
    // No difficultySwitcher, no diffEasy/diffMedium/diffHard buttons
    expect(() => loadGameModule()).not.toThrow();
  });
});

/* ================================================================
   SECTION 4 — Difficulty integration with AI gameplay
   ================================================================ */
describe('Difficulty integration with AI gameplay — coverage-instrumented', () => {
  let game;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = FULL_WITH_DIFFICULTY_HTML;
    game = loadGameModule();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('easy difficulty: AI still places a move within 400ms', () => {
    game.setDifficulty('easy');
    document.querySelector('[data-index="4"]').click(); // X at center
    jest.advanceTimersByTime(400);
    const oPieces = Array.from(document.querySelectorAll('.cell.o-piece'));
    expect(oPieces).toHaveLength(1);
  });

  test('medium difficulty: AI still places a move within 400ms', () => {
    game.setDifficulty('medium');
    document.querySelector('[data-index="0"]').click(); // X plays
    jest.advanceTimersByTime(400);
    const oPieces = Array.from(document.querySelectorAll('.cell.o-piece'));
    expect(oPieces).toHaveLength(1);
  });

  test('hard difficulty (default): AI places a move within 400ms', () => {
    // Hard is the default, no need to call setDifficulty
    expect(game._getState().difficulty).toBe('hard');
    document.querySelector('[data-index="4"]').click(); // X at center
    jest.advanceTimersByTime(400);
    const oPieces = Array.from(document.querySelectorAll('.cell.o-piece'));
    expect(oPieces).toHaveLength(1);
  });

  test('difficulty can be changed between rounds', () => {
    // Play first round with hard
    game.setDifficulty('hard');
    document.querySelector('[data-index="4"]').click();
    jest.advanceTimersByTime(400); // AI responds (hard)
    expect(game._getState().difficulty).toBe('hard');

    // Switch to easy and verify state
    game.setDifficulty('easy');
    expect(game._getState().difficulty).toBe('easy');

    // Play again with easy
    const nextEmptyCell = Array.from(document.querySelectorAll('.cell'))
      .find((c) => !c.classList.contains('taken'));
    if (nextEmptyCell) {
      nextEmptyCell.click();
      jest.advanceTimersByTime(400);
    }
    expect(game._getState().difficulty).toBe('easy');
  });

  test('switching to two-player and back preserves difficulty setting', () => {
    game.setDifficulty('easy');
    expect(game._getState().difficulty).toBe('easy');
    game.setGameMode('two-player');
    expect(game._getState().difficulty).toBe('easy'); // preserved
    game.setGameMode('single');
    expect(game._getState().difficulty).toBe('easy'); // still preserved
  });
});
