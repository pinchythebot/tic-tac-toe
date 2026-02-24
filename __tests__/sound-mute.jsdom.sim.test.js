/**
 * sound-mute.jsdom.sim.test.js
 *
 * JSDOM-based end-to-end simulation of the mute toggle and SoundEngine feature,
 * using the REAL index.html structure loaded from disk.
 *
 * Background: Playwright cannot launch browsers in this environment due to
 * missing system libraries (libglib-2.0.so.0, libgtk-3.so.0, etc.).
 * This file simulates the Playwright tests using Jest + jsdom (the existing
 * testEnvironment) with the REAL index.html HTML structure injected into
 * document.body and game.js eval'd — the same approach used by other DOM
 * test files in this project.
 *
 * Tests verify (using real index.html structure + game.js):
 *  1. Mute button exists in the real HTML with correct initial attributes
 *  2. Mute button is in the correct position (.controls section)
 *  3. Clicking mute toggles aria-pressed / emoji / aria-label
 *  4. Mute state survives New Game and Reset Score
 *  5. Game plays correctly when muted (moves, win, draw)
 *  6. No errors thrown during mute toggle and gameplay
 *  7. SoundEngine state is reflected correctly in the DOM
 *  8. CSS classes on mute button are correct
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const GAME_JS_PATH  = path.resolve(__dirname, '..', 'game.js');
const INDEX_HTML_PATH = path.resolve(__dirname, '..', 'index.html');

/* ---------------------------------------------------------------------------
   Extract the <body> innerHTML from the real index.html
   --------------------------------------------------------------------------- */

/**
 * Parse index.html and extract only the <body> inner HTML so we can inject
 * it into jsdom's document.body (Jest's jsdom environment).
 *
 * We use a simple regex to extract the body content rather than requiring
 * another HTML parser.
 */
function extractBodyHTML() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  // Match everything between <body> and </body>
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error('Could not find <body> tag in index.html');
  return match[1];
}

const REAL_BODY_HTML = extractBodyHTML();

/* ---------------------------------------------------------------------------
   Game loader — eval approach (same as mute-toggle.test.js)
   --------------------------------------------------------------------------- */

let _capturedDCLHandlers = [];
let gameModule = null;

/**
 * Load game.js via eval in the current jsdom context, then fire
 * DOMContentLoaded exactly once.
 *
 * Captures the module.exports set by game.js so that gameModule.SoundEngine
 * is the SAME SoundEngine instance used by the DOM event handlers.
 */
function loadGame() {
  _capturedDCLHandlers.forEach((h) =>
    document.removeEventListener('DOMContentLoaded', h)
  );
  _capturedDCLHandlers = [];

  const code = fs.readFileSync(GAME_JS_PATH, 'utf8');

  const originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (event, handler, ...rest) => {
    if (event === 'DOMContentLoaded') _capturedDCLHandlers.push(handler);
    return originalAddEventListener(event, handler, ...rest);
  };

  const savedExports = module.exports;
  // eslint-disable-next-line no-eval
  eval(code);
  gameModule = module.exports; // game.js exports — same SoundEngine as DOM handlers
  module.exports = savedExports;

  document.addEventListener = originalAddEventListener;
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function getMuteBtn()    { return document.getElementById('muteBtn'); }
function clickMute()     { getMuteBtn().click(); }
function clickCell(i)    { document.querySelector(`[data-index="${i}"]`).click(); }
function clickNewGame()  { document.getElementById('newGameBtn').click(); }
function clickReset()    { document.getElementById('resetScoreBtn').click(); }

/* ---------------------------------------------------------------------------
   Setup
   --------------------------------------------------------------------------- */

beforeEach(() => {
  // Inject the real index.html body structure into jsdom
  document.body.innerHTML = REAL_BODY_HTML;
  loadGame();
});

/* ---------------------------------------------------------------------------
   1. Mute button in real index.html
   --------------------------------------------------------------------------- */
describe('Real index.html — mute button existence', () => {
  test('mute button element is present', () => {
    expect(getMuteBtn()).not.toBeNull();
  });

  test('mute button has btn-mute CSS class', () => {
    expect(getMuteBtn().classList.contains('btn-mute')).toBe(true);
  });

  test('mute button has btn class', () => {
    expect(getMuteBtn().classList.contains('btn')).toBe(true);
  });

  test('mute button is inside .controls', () => {
    expect(getMuteBtn().closest('.controls')).not.toBeNull();
  });

  test('controls section contains exactly 3 buttons (New Game, Reset Score, Mute)', () => {
    const controls = document.querySelector('.controls');
    const buttons  = controls.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });
});

/* ---------------------------------------------------------------------------
   2. Initial attributes from real index.html
   --------------------------------------------------------------------------- */
describe('Real index.html — mute button initial attributes', () => {
  test('initial textContent is 🔊', () => {
    expect(getMuteBtn().textContent.trim()).toBe('🔊');
  });

  test('initial aria-pressed is "false"', () => {
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('false');
  });

  test('initial aria-label is "Mute sounds"', () => {
    expect(getMuteBtn().getAttribute('aria-label')).toBe('Mute sounds');
  });

  test('initial type is "button"', () => {
    expect(getMuteBtn().getAttribute('type')).toBe('button');
  });

  test('has a non-empty title attribute', () => {
    expect(getMuteBtn().getAttribute('title')).toBeTruthy();
  });

  test('SoundEngine is not muted initially', () => {
    expect(gameModule.SoundEngine.isMuted()).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   3. Toggle — aria-pressed
   --------------------------------------------------------------------------- */
describe('Mute toggle (real HTML) — aria-pressed', () => {
  test('aria-pressed becomes "true" after one click', () => {
    clickMute();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('true');
  });

  test('aria-pressed reverts to "false" after two clicks', () => {
    clickMute(); clickMute();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('false');
  });

  test('aria-pressed alternates correctly over four clicks', () => {
    const states = [];
    for (let i = 0; i < 4; i++) {
      clickMute();
      states.push(getMuteBtn().getAttribute('aria-pressed'));
    }
    expect(states).toEqual(['true', 'false', 'true', 'false']);
  });
});

/* ---------------------------------------------------------------------------
   4. Toggle — button emoji
   --------------------------------------------------------------------------- */
describe('Mute toggle (real HTML) — button emoji', () => {
  test('shows 🔇 after first click', () => {
    clickMute();
    expect(getMuteBtn().textContent.trim()).toBe('🔇');
  });

  test('shows 🔊 after second click', () => {
    clickMute(); clickMute();
    expect(getMuteBtn().textContent.trim()).toBe('🔊');
  });

  test('emoji alternates correctly over four clicks', () => {
    const emojis = [];
    for (let i = 0; i < 4; i++) {
      clickMute();
      emojis.push(getMuteBtn().textContent.trim());
    }
    expect(emojis).toEqual(['🔇', '🔊', '🔇', '🔊']);
  });
});

/* ---------------------------------------------------------------------------
   5. Toggle — aria-label
   --------------------------------------------------------------------------- */
describe('Mute toggle (real HTML) — aria-label', () => {
  test('aria-label is "Unmute sounds" when muted', () => {
    clickMute();
    expect(getMuteBtn().getAttribute('aria-label')).toBe('Unmute sounds');
  });

  test('aria-label is "Mute sounds" when unmuted', () => {
    clickMute(); clickMute();
    expect(getMuteBtn().getAttribute('aria-label')).toBe('Mute sounds');
  });
});

/* ---------------------------------------------------------------------------
   6. Mute state survives game control actions
   --------------------------------------------------------------------------- */
describe('Mute state survives game controls (real HTML)', () => {
  test('mute state preserved after New Game click', () => {
    clickMute();
    clickNewGame();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('true');
    expect(getMuteBtn().textContent.trim()).toBe('🔇');
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('mute state preserved after Reset Score click', () => {
    clickMute();
    clickReset();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('true');
    expect(getMuteBtn().textContent.trim()).toBe('🔇');
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('mute button still works after New Game', () => {
    clickNewGame();
    clickMute();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('true');
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('mute button is still in DOM after Reset Score', () => {
    clickReset();
    expect(document.getElementById('muteBtn')).not.toBeNull();
  });

  test('mute button still works after Reset Score', () => {
    clickReset();
    clickMute();
    expect(getMuteBtn().getAttribute('aria-pressed')).toBe('true');
  });
});

/* ---------------------------------------------------------------------------
   7. Game plays correctly when muted (real HTML + real game.js)
   --------------------------------------------------------------------------- */
describe('Game plays normally when muted (real HTML)', () => {
  beforeEach(() => {
    clickMute(); // mute first
  });

  test('X mark is placed when muted', () => {
    clickCell(0);
    expect(document.querySelector('[data-index="0"]').classList.contains('x-piece')).toBe(true);
  });

  test('O mark is placed when muted', () => {
    clickCell(0); // X
    clickCell(1); // O
    expect(document.querySelector('[data-index="1"]').classList.contains('o-piece')).toBe(true);
  });

  test('turn indicator switches when muted', () => {
    clickCell(0);
    expect(document.getElementById('currentPlayerSymbol').textContent.trim()).toBe('O');
  });

  test('win detected when muted', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(document.getElementById('statusMessage').textContent).toBe('Player X wins!');
  });

  test('winning cells get CSS class when muted', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    [0, 1, 2].forEach((i) => {
      expect(document.querySelector(`[data-index="${i}"]`).classList.contains('winning')).toBe(true);
    });
  });

  test('score increments when muted', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(document.getElementById('scoreX').textContent).toBe('1');
  });

  test('draw detected when muted', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => clickCell(i));
    expect(document.getElementById('statusMessage').textContent).toContain('draw');
  });

  test('draw score increments when muted', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => clickCell(i));
    expect(document.getElementById('scoreDraw').textContent).toBe('1');
  });

  test('no moves accepted after win (while muted)', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins
    clickCell(5); // Should be ignored
    expect(document.querySelector('[data-index="5"]').classList.contains('x-piece')).toBe(false);
    expect(document.querySelector('[data-index="5"]').classList.contains('o-piece')).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
   8. Error-free operation (real HTML)
   --------------------------------------------------------------------------- */
describe('Error-free mute operation (real HTML)', () => {
  test('does not throw during 6 mute toggles', () => {
    expect(() => {
      for (let i = 0; i < 6; i++) clickMute();
    }).not.toThrow();
  });

  test('does not throw during muted gameplay', () => {
    expect(() => {
      clickMute();
      [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    }).not.toThrow();
  });

  test('does not throw when toggling mute after a win', () => {
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i));
    expect(() => clickMute()).not.toThrow();
    expect(gameModule.SoundEngine.isMuted()).toBe(true);
  });

  test('does not throw when toggling mute after a draw', () => {
    [0, 1, 2, 3, 5, 4, 6, 8, 7].forEach((i) => clickCell(i));
    expect(() => clickMute()).not.toThrow();
  });

  test('can cycle through mute and game actions without errors', () => {
    expect(() => {
      clickMute();         // mute
      clickCell(0);        // X move
      clickCell(1);        // O move
      clickMute();         // unmute
      clickNewGame();      // new game
      clickMute();         // mute again
      clickReset();        // reset
    }).not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
   9. SoundEngine state consistency with DOM (real HTML)
   --------------------------------------------------------------------------- */
describe('SoundEngine ↔ DOM state consistency (real HTML)', () => {
  test('isMuted() matches aria-pressed after toggle', () => {
    clickMute();
    expect(String(gameModule.SoundEngine.isMuted())).toBe(
      getMuteBtn().getAttribute('aria-pressed')
    );
  });

  test('isMuted() remains consistent over 4 toggles', () => {
    for (let i = 0; i < 4; i++) {
      clickMute();
      expect(String(gameModule.SoundEngine.isMuted())).toBe(
        getMuteBtn().getAttribute('aria-pressed')
      );
    }
  });

  test('user gesture is registered after mute button click', () => {
    expect(gameModule.SoundEngine._isEnabled()).toBe(false);
    clickMute();
    expect(gameModule.SoundEngine._isEnabled()).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   10. Real HTML structural assertions
   --------------------------------------------------------------------------- */
describe('Real HTML structure verification', () => {
  test('page has 9 cells', () => {
    const cells = document.querySelectorAll('.cell');
    expect(cells.length).toBe(9);
  });

  test('page has a scoreboard', () => {
    expect(document.querySelector('.scoreboard')).not.toBeNull();
  });

  test('page has scoreX, scoreO, scoreDraw elements', () => {
    expect(document.getElementById('scoreX')).not.toBeNull();
    expect(document.getElementById('scoreO')).not.toBeNull();
    expect(document.getElementById('scoreDraw')).not.toBeNull();
  });

  test('page has turn indicator', () => {
    expect(document.getElementById('turnIndicator')).not.toBeNull();
  });

  test('muteBtn is alongside newGameBtn and resetScoreBtn', () => {
    const controls = document.querySelector('.controls');
    expect(controls.querySelector('#newGameBtn')).not.toBeNull();
    expect(controls.querySelector('#resetScoreBtn')).not.toBeNull();
    expect(controls.querySelector('#muteBtn')).not.toBeNull();
  });
});
