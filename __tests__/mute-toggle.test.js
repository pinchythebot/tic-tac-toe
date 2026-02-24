/**
 * mute-toggle.test.js
 *
 * DOM integration tests for the mute toggle button introduced alongside
 * the Web Audio API SoundEngine in:
 *   feat: add Web Audio API SoundEngine with mute toggle
 *
 * Tests cover:
 *  1. Mute button is present in the DOM with correct initial attributes
 *  2. toggleMute() flips the SoundEngine muted state
 *  3. Button text emoji changes on toggle (🔊 ↔ 🔇)
 *  4. aria-pressed attribute is updated correctly
 *  5. aria-label attribute is updated correctly
 *  6. Clicking the button enables the SoundEngine (user gesture registration)
 *  7. Multiple toggles cycle correctly
 *  8. Button survives New Game and Reset Score (is not removed from DOM)
 *  9. SoundEngine is enabled by New Game and Reset Score button clicks
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/** Full minimal HTML matching index.html — includes the muteBtn. */
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
      <button class="btn btn-primary" id="newGameBtn"    type="button">New Game</button>
      <button class="btn btn-ghost"   id="resetScoreBtn" type="button">Reset Score</button>
      <button class="btn btn-ghost btn-mute"
              id="muteBtn"
              type="button"
              aria-label="Mute sounds"
              aria-pressed="false"
              title="Toggle sound effects">🔊</button>
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

let _capturedDCLHandlers = [];

/**
 * gameModule is the object exported by game.js during this test.
 * Captured via the eval-trick: eval() runs game.js in the test scope, where
 * `module.exports` is set by the game code.  We save that reference and
 * restore the test's own module.exports afterwards.
 *
 * This is the SAME SoundEngine instance that the DOM event handlers use,
 * because both come from the same eval() invocation.
 */
let gameModule = null;

/**
 * Load and execute game.js in the current jsdom context, then fire
 * DOMContentLoaded exactly once.
 *
 * We capture the module.exports set by the eval'd game code so that
 * `gameModule.SoundEngine` refers to the same SoundEngine object used by
 * the game's internal event handlers.
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

  // Save the test module's current exports, eval the game code (which sets
  // module.exports to game.js exports), capture those exports, then restore.
  const savedExports = module.exports;
  // eslint-disable-next-line no-eval
  eval(code);
  gameModule = module.exports; // game.js exports — same SoundEngine as the DOM handlers
  module.exports = savedExports;

  // Restore native addEventListener
  document.addEventListener = originalAddEventListener;

  // Trigger game initialisation exactly once
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

function muteBtn() {
  return document.getElementById('muteBtn');
}

function clickMute() {
  muteBtn().click();
}

function clickCell(index) {
  document.querySelector(`[data-index="${index}"]`).click();
}

/* ---------------------------------------------------------------------------
   Setup
   --------------------------------------------------------------------------- */

beforeEach(() => {
  document.body.innerHTML = GAME_HTML;
  loadGame();
  // gameModule now holds a fresh set of exports (fresh SoundEngine) per test.
});

/* ---------------------------------------------------------------------------
   1. Mute button presence and initial attributes
   --------------------------------------------------------------------------- */
describe('Mute button — initial DOM state', () => {
  test('mute button exists in the DOM', () => {
    expect(muteBtn()).not.toBeNull();
  });

  test('initial text content is the unmuted speaker emoji 🔊', () => {
    expect(muteBtn().textContent.trim()).toBe('🔊');
  });

  test('initial aria-pressed is "false"', () => {
    expect(muteBtn().getAttribute('aria-pressed')).toBe('false');
  });

  test('initial aria-label is "Mute sounds"', () => {
    expect(muteBtn().getAttribute('aria-label')).toBe('Mute sounds');
  });

  test('mute button has correct CSS classes', () => {
    expect(muteBtn().classList.contains('btn')).toBe(true);
    expect(muteBtn().classList.contains('btn-mute')).toBe(true);
  });

  test('mute button has type="button"', () => {
    expect(muteBtn().getAttribute('type')).toBe('button');
  });

  test('mute button has a title attribute', () => {
    expect(muteBtn().getAttribute('title')).toBeTruthy();
  });

  test('SoundEngine is not muted initially', () => {
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   2. toggleMute() — SoundEngine state change
   --------------------------------------------------------------------------- */
describe('toggleMute() — SoundEngine muted state', () => {
  test('clicking mute button mutes the SoundEngine', () => {
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
    clickMute();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('clicking mute button again unmutes the SoundEngine', () => {
    clickMute();
    clickMute();
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
  });

  test('three clicks leaves SoundEngine muted', () => {
    clickMute(); clickMute(); clickMute();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('four clicks leaves SoundEngine unmuted', () => {
    clickMute(); clickMute(); clickMute(); clickMute();
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   3. Button text emoji change
   --------------------------------------------------------------------------- */
describe('toggleMute() — button emoji', () => {
  test('emoji changes to 🔇 after first click (muted)', () => {
    clickMute();
    expect(muteBtn().textContent.trim()).toBe('🔇');
  });

  test('emoji reverts to 🔊 after second click (unmuted)', () => {
    clickMute();
    clickMute();
    expect(muteBtn().textContent.trim()).toBe('🔊');
  });

  test('emoji alternates correctly over 4 clicks', () => {
    const states = [];
    for (let i = 0; i < 4; i++) {
      clickMute();
      states.push(muteBtn().textContent.trim());
    }
    expect(states).toEqual(['🔇', '🔊', '🔇', '🔊']);
  });
});

/* ---------------------------------------------------------------------------
   4. aria-pressed attribute
   --------------------------------------------------------------------------- */
describe('toggleMute() — aria-pressed', () => {
  test('aria-pressed becomes "true" after first click', () => {
    clickMute();
    expect(muteBtn().getAttribute('aria-pressed')).toBe('true');
  });

  test('aria-pressed reverts to "false" after second click', () => {
    clickMute();
    clickMute();
    expect(muteBtn().getAttribute('aria-pressed')).toBe('false');
  });

  test('aria-pressed mirrors SoundEngine.isMuted() on each click', () => {
    for (let i = 0; i < 6; i++) {
      clickMute();
      const expected = String(gameModule.SoundEngine.isMuted());
      expect(muteBtn().getAttribute('aria-pressed')).toBe(expected);
    }
  });
});

/* ---------------------------------------------------------------------------
   5. aria-label attribute
   --------------------------------------------------------------------------- */
describe('toggleMute() — aria-label', () => {
  test('aria-label changes to "Unmute sounds" when muted', () => {
    clickMute();
    expect(muteBtn().getAttribute('aria-label')).toBe('Unmute sounds');
  });

  test('aria-label reverts to "Mute sounds" when unmuted', () => {
    clickMute();
    clickMute();
    expect(muteBtn().getAttribute('aria-label')).toBe('Mute sounds');
  });

  test('aria-label alternates correctly over 4 clicks', () => {
    const labels = [];
    for (let i = 0; i < 4; i++) {
      clickMute();
      labels.push(muteBtn().getAttribute('aria-label'));
    }
    expect(labels).toEqual([
      'Unmute sounds',
      'Mute sounds',
      'Unmute sounds',
      'Mute sounds',
    ]);
  });
});

/* ---------------------------------------------------------------------------
   6. Mute button enables SoundEngine (user gesture registration)
   --------------------------------------------------------------------------- */
describe('toggleMute() — user gesture registration', () => {
  test('clicking mute button enables SoundEngine', () => {
    expect(gameModule.SoundEngine._isEnabled()).toBe(false);
    clickMute();
    expect(gameModule.SoundEngine._isEnabled()).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   7. Button survives game control actions
   --------------------------------------------------------------------------- */
describe('Mute button — survives game control actions', () => {
  test('mute state is preserved across New Game', () => {
    clickMute(); // mute
    document.getElementById('newGameBtn').click();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
    expect(muteBtn().getAttribute('aria-pressed')).toBe('true');
  });

  test('mute state is preserved across Reset Score', () => {
    clickMute(); // mute
    document.getElementById('resetScoreBtn').click();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
    expect(muteBtn().getAttribute('aria-pressed')).toBe('true');
  });

  test('mute button is still in DOM after New Game', () => {
    document.getElementById('newGameBtn').click();
    expect(document.getElementById('muteBtn')).not.toBeNull();
  });

  test('mute button is still in DOM after Reset Score', () => {
    document.getElementById('resetScoreBtn').click();
    expect(document.getElementById('muteBtn')).not.toBeNull();
  });

  test('mute button works normally after New Game', () => {
    document.getElementById('newGameBtn').click();
    clickMute();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
    expect(muteBtn().textContent.trim()).toBe('🔇');
  });
});

/* ---------------------------------------------------------------------------
   8. Cell clicks enable SoundEngine
   --------------------------------------------------------------------------- */
describe('Cell clicks — user gesture registration', () => {
  test('clicking a cell enables SoundEngine', () => {
    expect(gameModule.SoundEngine._isEnabled()).toBe(false);
    clickCell(0);
    expect(gameModule.SoundEngine._isEnabled()).toBe(true);
  });

  test('New Game button click enables SoundEngine', () => {
    expect(gameModule.SoundEngine._isEnabled()).toBe(false);
    document.getElementById('newGameBtn').click();
    expect(gameModule.SoundEngine._isEnabled()).toBe(true);
  });

  test('Reset Score button click enables SoundEngine', () => {
    expect(gameModule.SoundEngine._isEnabled()).toBe(false);
    document.getElementById('resetScoreBtn').click();
    expect(gameModule.SoundEngine._isEnabled()).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   9. Mute functionality with game play
   --------------------------------------------------------------------------- */
describe('Mute during game play', () => {
  test('game plays normally when muted (cells still register moves)', () => {
    clickMute(); // mute
    clickCell(0); // X moves
    expect(document.querySelector('[data-index="0"]').classList.contains('x-piece')).toBe(true);
  });

  test('game plays normally when unmuted', () => {
    clickCell(0); // X moves
    expect(document.querySelector('[data-index="0"]').classList.contains('x-piece')).toBe(true);
  });

  test('can mute, play a game, then unmute', () => {
    clickMute(); // mute
    clickCell(0); // X
    clickCell(1); // O
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
    clickMute(); // unmute
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
    expect(muteBtn().textContent.trim()).toBe('🔊');
  });

  test('muting after a win does not cause errors', () => {
    // X wins on top row
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(() => clickMute()).not.toThrow();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('muting before a game starts does not break win detection', () => {
    clickMute(); // mute first
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins
    expect(document.getElementById('statusMessage').textContent).toBe('Player X wins!');
    expect(document.getElementById('scoreX').textContent).toBe('1');
  });

  test('muting does not prevent draw detection', () => {
    clickMute(); // mute first
    // Draw sequence
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => clickCell(i));
    expect(document.getElementById('statusMessage').textContent).toContain('draw');
  });
});

/* ---------------------------------------------------------------------------
   10. SoundEngine state consistency between DOM and engine
   --------------------------------------------------------------------------- */
describe('SoundEngine state consistency', () => {
  test('DOM aria-pressed always reflects SoundEngine.isMuted()', () => {
    // Verify consistency for 0 clicks
    expect(muteBtn().getAttribute('aria-pressed')).toBe(
      String(gameModule.SoundEngine.isMuted())
    );
    // After 1 click
    clickMute();
    expect(muteBtn().getAttribute('aria-pressed')).toBe(
      String(gameModule.SoundEngine.isMuted())
    );
    // After 2 clicks
    clickMute();
    expect(muteBtn().getAttribute('aria-pressed')).toBe(
      String(gameModule.SoundEngine.isMuted())
    );
  });

  test('button emoji matches muted state', () => {
    // Unmuted → 🔊
    expect(muteBtn().textContent.trim()).toBe(
      gameModule.SoundEngine.isMuted() ? '🔇' : '🔊'
    );
    clickMute();
    // Muted → 🔇
    expect(muteBtn().textContent.trim()).toBe(
      gameModule.SoundEngine.isMuted() ? '🔇' : '🔊'
    );
  });

  test('aria-label matches muted state', () => {
    expect(muteBtn().getAttribute('aria-label')).toBe('Mute sounds'); // unmuted
    clickMute();
    expect(muteBtn().getAttribute('aria-label')).toBe('Unmute sounds'); // muted
  });
});
