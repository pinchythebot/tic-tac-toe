/**
 * css-animations.test.js
 *
 * Unit/DOM tests for the CSS animations and neon visual effects feature.
 * Added in: feat: add smooth CSS animations and neon visual effects
 *
 * These tests verify:
 *  1. The HTML structure contains the elements needed for animations to work
 *  2. The correct CSS classes are applied/removed by game.js for animations
 *  3. The sibling combinator structure (turn-indicator before board) is correct
 *  4. DOM class transitions that drive the animation system (x-piece, o-piece,
 *     winning, active-player, is-x, is-o) are correctly managed
 *  5. The markup for reduced-motion accessibility is supported
 *
 * NOTE: jsdom does not compute actual CSS animations (no layout/rendering
 * engine). These tests focus on the DOM class & attribute conditions that
 * the CSS animation rules hook into.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ---------------------------------------------------------------------------
   Load index.html source for structural checks
   --------------------------------------------------------------------------- */
const INDEX_HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const indexHtmlSource = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

/* ---------------------------------------------------------------------------
   Load game.js for DOM tests
   --------------------------------------------------------------------------- */
const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/** Minimal HTML that mirrors index.html */
const GAME_HTML = `
<div class="page-wrapper">
  <header class="site-header">
    <h1 class="logo">TIC<span class="x-color">✕</span>TAC<span class="o-color">○</span>TOE</h1>
  </header>
  <main class="game-container">
    <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite" aria-atomic="true">
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
    <div class="status-message" id="statusMessage" role="status" aria-live="polite" aria-atomic="true"></div>
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
   DOM setup helpers
   --------------------------------------------------------------------------- */

let loadedModule = null;

function setupDOM() {
  // Remove any previous DOMContentLoaded handlers
  if (loadedModule) {
    jest.resetModules();
    loadedModule = null;
  }

  document.body.innerHTML = GAME_HTML;

  // Load game.js fresh
  jest.isolateModules(() => {
    loadedModule = require(GAME_JS_PATH);
  });

  // Trigger DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
}

function getCell(index) {
  return document.querySelector(`[data-index="${index}"]`);
}

function clickCell(index) {
  getCell(index).click();
}

function playMoves(indices) {
  for (const i of indices) {
    clickCell(i);
  }
}

/* ===========================================================================
   SECTION 1: index.html structural requirements for animations
   =========================================================================== */
describe('index.html — structure required for CSS animations', () => {
  describe('@keyframes board-enter', () => {
    test('index.html contains @keyframes board-enter definition', () => {
      expect(indexHtmlSource).toContain('@keyframes board-enter');
    });

    test('board-enter keyframe defines "from" with opacity: 0', () => {
      // Look for the from block containing both opacity and transform
      expect(indexHtmlSource).toMatch(/board-enter[\s\S]*?from[\s\S]*?opacity:\s*0/);
    });

    test('board-enter keyframe defines "to" with opacity: 1', () => {
      expect(indexHtmlSource).toMatch(/board-enter[\s\S]*?to[\s\S]*?opacity:\s*1/);
    });

    test('board-enter keyframe uses translateY for vertical motion', () => {
      expect(indexHtmlSource).toMatch(/board-enter[\s\S]*?translateY/);
    });

    test('board-enter keyframe uses scale transform', () => {
      expect(indexHtmlSource).toMatch(/board-enter[\s\S]*?scale\(0\.9[0-9]/);
    });

    test('.board element has animation: board-enter applied', () => {
      // CSS rule referencing animation on .board
      expect(indexHtmlSource).toMatch(/\.board[\s\S]*?animation[\s\S]*?board-enter/);
    });

    test('.board animation uses fill-mode: both (or shorthand both)', () => {
      // "animation: board-enter 0.5s ease-out both" — "both" is the fill-mode
      expect(indexHtmlSource).toContain('both');
    });
  });

  describe('@keyframes mark-appear', () => {
    test('index.html contains @keyframes mark-appear definition', () => {
      expect(indexHtmlSource).toContain('@keyframes mark-appear');
    });

    test('mark-appear keyframe defines scale(0) in from', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]*?from[\s\S]*?scale\(0\)/);
    });

    test('mark-appear keyframe defines scale(1) in to', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]*?to[\s\S]*?scale\(1\)/);
    });

    test('mark-appear keyframe defines opacity: 0 in from', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]*?from[\s\S]*?opacity:\s*0/);
    });

    test('mark-appear keyframe defines opacity: 1 in to', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]*?to[\s\S]*?opacity:\s*1/);
    });

    test('mark-appear uses rotate in from for extra spring feel', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]*?rotate\(-15deg\)/);
    });

    test('mark-appear uses spring cubic-bezier easing', () => {
      // Spring: cubic-bezier(0.34, 1.56, 0.64, 1)
      expect(indexHtmlSource).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)');
    });

    test('.cell.x-piece::after has display: inline-block for transform support', () => {
      expect(indexHtmlSource).toMatch(/\.cell\.x-piece::after[\s\S]*?display:\s*inline-block/);
    });

    test('.cell.o-piece::after has display: inline-block for transform support', () => {
      expect(indexHtmlSource).toMatch(/\.cell\.o-piece::after[\s\S]*?display:\s*inline-block/);
    });

    test('.cell.x-piece::after has animation: mark-appear applied', () => {
      expect(indexHtmlSource).toMatch(/\.cell\.x-piece::after[\s\S]*?animation[\s\S]*?mark-appear/);
    });

    test('.cell.o-piece::after has animation: mark-appear applied', () => {
      expect(indexHtmlSource).toMatch(/\.cell\.o-piece::after[\s\S]*?animation[\s\S]*?mark-appear/);
    });

    test('mark-appear animation uses "forwards" fill-mode', () => {
      expect(indexHtmlSource).toMatch(/mark-appear[\s\S]{0,50}forwards/);
    });
  });

  describe('@keyframes winning-pulse (enhanced with transform)', () => {
    test('index.html contains @keyframes winning-pulse definition', () => {
      expect(indexHtmlSource).toContain('@keyframes winning-pulse');
    });

    test('winning-pulse from block includes transform: scale(1.0)', () => {
      expect(indexHtmlSource).toMatch(/winning-pulse[\s\S]*?from[\s\S]*?transform:\s*scale\(1\.0*\)/);
    });

    test('winning-pulse to block includes transform: scale(1.03)', () => {
      expect(indexHtmlSource).toMatch(/winning-pulse[\s\S]*?to[\s\S]*?transform:\s*scale\(1\.03\)/);
    });

    test('winning-pulse includes box-shadow animation from→to', () => {
      expect(indexHtmlSource).toMatch(/winning-pulse[\s\S]*?box-shadow/);
    });

    test('.cell.winning has animation: winning-pulse applied', () => {
      expect(indexHtmlSource).toMatch(/\.cell\.winning[\s\S]*?animation[\s\S]*?winning-pulse/);
    });
  });

  describe('Player-aware hover glow (CSS sibling combinator)', () => {
    test('has .turn-indicator.is-x ~ .board .cell:not(.taken):hover rule', () => {
      expect(indexHtmlSource).toContain('.turn-indicator.is-x ~ .board .cell:not(.taken):hover');
    });

    test('has .turn-indicator.is-o ~ .board .cell:not(.taken):hover rule', () => {
      expect(indexHtmlSource).toContain('.turn-indicator.is-o ~ .board .cell:not(.taken):hover');
    });

    test('X hover rule uses color-x-glow (cyan)', () => {
      // Should reference var(--color-x-glow) or var(--color-x)
      expect(indexHtmlSource).toMatch(
        /\.turn-indicator\.is-x ~ \.board .cell:not\(\.taken\):hover[\s\S]*?color-x/
      );
    });

    test('O hover rule uses color-o-glow (magenta)', () => {
      expect(indexHtmlSource).toMatch(
        /\.turn-indicator\.is-o ~ \.board .cell:not\(\.taken\):hover[\s\S]*?color-o/
      );
    });

    test('turn-indicator element appears BEFORE board in DOM (required for ~ combinator)', () => {
      // Verify source order: turnIndicator id appears before board id
      const tiPos    = indexHtmlSource.indexOf('id="turnIndicator"');
      const boardPos = indexHtmlSource.indexOf('id="board"');
      expect(tiPos).toBeGreaterThan(-1);
      expect(boardPos).toBeGreaterThan(-1);
      expect(tiPos).toBeLessThan(boardPos);
    });
  });

  describe('Score card transform: scale on active-player', () => {
    test('.score-card.score-x.active-player has transform: scale(1.04)', () => {
      expect(indexHtmlSource).toMatch(
        /\.score-card\.score-x\.active-player[\s\S]*?transform:\s*scale\(1\.04\)/
      );
    });

    test('.score-card.score-o.active-player has transform: scale(1.04)', () => {
      expect(indexHtmlSource).toMatch(
        /\.score-card\.score-o\.active-player[\s\S]*?transform:\s*scale\(1\.04\)/
      );
    });

    test('.score-card transition includes transform property', () => {
      expect(indexHtmlSource).toMatch(/\.score-card[\s\S]*?transition[\s\S]*?transform/);
    });
  });

  describe('Button focus-visible neon outline', () => {
    test('.btn:focus-visible has outline: 2px solid var(--color-x)', () => {
      expect(indexHtmlSource).toMatch(
        /\.btn:focus-visible[\s\S]*?outline:\s*2px solid var\(--color-x\)/
      );
    });

    test('.btn:focus-visible has outline-offset', () => {
      expect(indexHtmlSource).toMatch(/\.btn:focus-visible[\s\S]*?outline-offset/);
    });

    test('.btn:focus-visible has box-shadow with color-x-glow', () => {
      expect(indexHtmlSource).toMatch(
        /\.btn:focus-visible[\s\S]*?box-shadow[\s\S]*?color-x-glow/
      );
    });
  });

  describe('Button ghost hover box-shadow', () => {
    test('.btn-ghost:hover has box-shadow with color-muted', () => {
      expect(indexHtmlSource).toMatch(
        /\.btn-ghost:hover[\s\S]*?box-shadow[\s\S]*?color-muted/
      );
    });
  });

  describe('@media (prefers-reduced-motion: reduce)', () => {
    test('index.html contains prefers-reduced-motion media query', () => {
      expect(indexHtmlSource).toContain('prefers-reduced-motion: reduce');
    });

    test('reduced-motion block disables animation on .board', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.board[\s\S]*?animation:\s*none/
      );
    });

    test('reduced-motion block disables animation on .cell.winning', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.cell\.winning[\s\S]*?animation:\s*none/
      );
    });

    test('reduced-motion block disables animation on .cell.x-piece::after', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.cell\.x-piece::after[\s\S]*?animation:\s*none/
      );
    });

    test('reduced-motion block disables animation on .cell.o-piece::after', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.cell\.o-piece::after[\s\S]*?animation:\s*none/
      );
    });

    test('reduced-motion block uses !important to ensure override', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?animation:\s*none !important/
      );
    });

    test('reduced-motion collapses transition-duration on .cell', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.cell[\s\S]*?transition-duration/
      );
    });

    test('reduced-motion collapses transition-duration on .turn-indicator', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.turn-indicator[\s\S]*?transition-duration/
      );
    });

    test('reduced-motion collapses transition-duration on .score-card', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.score-card[\s\S]*?transition-duration/
      );
    });

    test('reduced-motion collapses transition-duration on .btn', () => {
      expect(indexHtmlSource).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*?\.btn[\s\S]*?transition-duration/
      );
    });

    test('reduced-motion collapsed duration uses very short value (0.01ms)', () => {
      expect(indexHtmlSource).toContain('0.01ms');
    });
  });
});

/* ===========================================================================
   SECTION 2: DOM class management tests (the hooks for CSS animations)
   jsdom cannot compute animations, but we can verify the class transitions
   that CSS animation rules depend on.
   =========================================================================== */
describe('DOM class management for animation triggers', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = GAME_HTML;
    jest.isolateModules(() => {
      loadedModule = require(GAME_JS_PATH);
    });
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  });

  /* -------------------------------------------------------------------------
     .x-piece class (triggers mark-appear on ::after pseudo-element)
     ------------------------------------------------------------------------- */
  describe('x-piece class — mark-appear animation trigger', () => {
    test('cell gains x-piece class when X places a mark', () => {
      clickCell(0);
      expect(getCell(0).classList.contains('x-piece')).toBe(true);
    });

    test('cell does NOT have x-piece class before any move', () => {
      expect(getCell(4).classList.contains('x-piece')).toBe(false);
    });

    test('x-piece and taken are added together on X move', () => {
      clickCell(3);
      const c = getCell(3);
      expect(c.classList.contains('x-piece')).toBe(true);
      expect(c.classList.contains('taken')).toBe(true);
    });

    test('x-piece is removed by startNewGame (animation resets)', () => {
      clickCell(0);
      document.getElementById('newGameBtn').click();
      expect(getCell(0).classList.contains('x-piece')).toBe(false);
    });

    test('x-piece is removed from ALL cells on new game', () => {
      playMoves([0, 3, 1, 4, 2]); // X wins
      document.getElementById('newGameBtn').click();
      for (let i = 0; i < 9; i++) {
        expect(getCell(i).classList.contains('x-piece')).toBe(false);
      }
    });
  });

  /* -------------------------------------------------------------------------
     .o-piece class (triggers mark-appear on ::after pseudo-element)
     ------------------------------------------------------------------------- */
  describe('o-piece class — mark-appear animation trigger', () => {
    test('cell gains o-piece class when O places a mark', () => {
      clickCell(0); // X
      clickCell(4); // O
      expect(getCell(4).classList.contains('o-piece')).toBe(true);
    });

    test('cell has neither x-piece nor o-piece initially', () => {
      expect(getCell(5).classList.contains('o-piece')).toBe(false);
      expect(getCell(5).classList.contains('x-piece')).toBe(false);
    });

    test('o-piece is removed by startNewGame', () => {
      clickCell(0); // X
      clickCell(4); // O
      document.getElementById('newGameBtn').click();
      expect(getCell(4).classList.contains('o-piece')).toBe(false);
    });

    test('o-piece and taken are added together on O move', () => {
      clickCell(0); // X
      clickCell(7); // O
      const c = getCell(7);
      expect(c.classList.contains('o-piece')).toBe(true);
      expect(c.classList.contains('taken')).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------
     .winning class (triggers winning-pulse animation)
     ------------------------------------------------------------------------- */
  describe('winning class — winning-pulse animation trigger', () => {
    test('winning cells receive the winning class after X wins', () => {
      playMoves([0, 3, 1, 4, 2]); // X: top row [0,1,2], O: [3,4]
      expect(getCell(0).classList.contains('winning')).toBe(true);
      expect(getCell(1).classList.contains('winning')).toBe(true);
      expect(getCell(2).classList.contains('winning')).toBe(true);
    });

    test('winning cells receive the winning class after O wins', () => {
      playMoves([0, 3, 2, 4, 6, 5]); // O: middle row [3,4,5]
      expect(getCell(3).classList.contains('winning')).toBe(true);
      expect(getCell(4).classList.contains('winning')).toBe(true);
      expect(getCell(5).classList.contains('winning')).toBe(true);
    });

    test('non-winning cells do NOT get winning class', () => {
      playMoves([0, 3, 1, 4, 2]); // X wins top row
      // O's cells [3,4] should not be winning
      expect(getCell(3).classList.contains('winning')).toBe(false);
      expect(getCell(4).classList.contains('winning')).toBe(false);
      // Empty cells should not be winning
      expect(getCell(5).classList.contains('winning')).toBe(false);
    });

    test('exactly the three winning cells get the winning class', () => {
      playMoves([0, 3, 1, 4, 2]); // X: top row
      const winningCells = [];
      for (let i = 0; i < 9; i++) {
        if (getCell(i).classList.contains('winning')) {
          winningCells.push(i);
        }
      }
      expect(winningCells).toEqual([0, 1, 2]);
    });

    test('winning class is removed by startNewGame', () => {
      playMoves([0, 3, 1, 4, 2]);
      document.getElementById('newGameBtn').click();
      for (let i = 0; i < 9; i++) {
        expect(getCell(i).classList.contains('winning')).toBe(false);
      }
    });

    test('winning class is removed by resetScore', () => {
      playMoves([0, 3, 1, 4, 2]);
      document.getElementById('resetScoreBtn').click();
      for (let i = 0; i < 9; i++) {
        expect(getCell(i).classList.contains('winning')).toBe(false);
      }
    });

    test('winning class persists until new game is started', () => {
      playMoves([0, 3, 1, 4, 2]);
      // Before new game: winning cells still have class
      expect(getCell(0).classList.contains('winning')).toBe(true);
      // Attempting another move doesn't clear it
      clickCell(8);
      expect(getCell(0).classList.contains('winning')).toBe(true);
    });

    test('diagonal win: correct winning cells get winning class', () => {
      playMoves([0, 1, 4, 2, 8]); // X: 0,4,8 (main diagonal)
      expect(getCell(0).classList.contains('winning')).toBe(true);
      expect(getCell(4).classList.contains('winning')).toBe(true);
      expect(getCell(8).classList.contains('winning')).toBe(true);
      expect(getCell(1).classList.contains('winning')).toBe(false);
      expect(getCell(2).classList.contains('winning')).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------
     .is-x / .is-o on #turnIndicator (drives player-aware hover glow via ~)
     ------------------------------------------------------------------------- */
  describe('is-x / is-o on turnIndicator — player-aware hover glow trigger', () => {
    test('turnIndicator starts with is-x class', () => {
      const ti = document.getElementById('turnIndicator');
      expect(ti.classList.contains('is-x')).toBe(true);
      expect(ti.classList.contains('is-o')).toBe(false);
    });

    test('turnIndicator switches to is-o after X plays', () => {
      clickCell(0);
      const ti = document.getElementById('turnIndicator');
      expect(ti.classList.contains('is-o')).toBe(true);
      expect(ti.classList.contains('is-x')).toBe(false);
    });

    test('turnIndicator switches back to is-x after O plays', () => {
      clickCell(0); // X
      clickCell(1); // O
      const ti = document.getElementById('turnIndicator');
      expect(ti.classList.contains('is-x')).toBe(true);
      expect(ti.classList.contains('is-o')).toBe(false);
    });

    test('turnIndicator is-x after startNewGame (resets for hover glow)', () => {
      clickCell(0); // X → O's turn
      document.getElementById('newGameBtn').click();
      const ti = document.getElementById('turnIndicator');
      expect(ti.classList.contains('is-x')).toBe(true);
      expect(ti.classList.contains('is-o')).toBe(false);
    });

    test('exactly one of is-x / is-o is set at any point', () => {
      const ti = document.getElementById('turnIndicator');
      // Initially X
      expect(ti.classList.contains('is-x') !== ti.classList.contains('is-o')).toBe(true);
      clickCell(0); // switch to O
      expect(ti.classList.contains('is-x') !== ti.classList.contains('is-o')).toBe(true);
      clickCell(1); // switch back to X
      expect(ti.classList.contains('is-x') !== ti.classList.contains('is-o')).toBe(true);
    });

    test('CSS sibling combinator can reach .board from #turnIndicator', () => {
      // The sibling combinator ~ requires turnIndicator to be a preceding sibling of #board.
      // In jsdom we can verify DOM position using compareDocumentPosition.
      const ti    = document.getElementById('turnIndicator');
      const board = document.getElementById('board');
      expect(ti).not.toBeNull();
      expect(board).not.toBeNull();

      // DOCUMENT_POSITION_FOLLOWING (4) means `board` comes after `ti`
      const position = ti.compareDocumentPosition(board);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('turnIndicator and board are siblings (same parent)', () => {
      const ti    = document.getElementById('turnIndicator');
      const board = document.getElementById('board');
      expect(ti.parentElement).toBe(board.parentElement);
    });
  });

  /* -------------------------------------------------------------------------
     .active-player on score cards (drives transform: scale(1.04) animation)
     ------------------------------------------------------------------------- */
  describe('active-player class — score card scale animation trigger', () => {
    test('scoreCardX starts with active-player class', () => {
      expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
    });

    test('scoreCardO starts WITHOUT active-player class', () => {
      expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
    });

    test('scoreCardO gains active-player class after X plays', () => {
      clickCell(0);
      expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(true);
    });

    test('scoreCardX loses active-player class after X plays', () => {
      clickCell(0);
      expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(false);
    });

    test('scoreCardX regains active-player after O plays', () => {
      clickCell(0); // X
      clickCell(4); // O
      expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
      expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
    });

    test('exactly one score card has active-player at a time', () => {
      const x = document.getElementById('scoreCardX');
      const o = document.getElementById('scoreCardO');

      const bothOrNone = () =>
        (x.classList.contains('active-player') === o.classList.contains('active-player'));

      expect(bothOrNone()).toBe(false); // Initially only X is active
      clickCell(0);
      expect(bothOrNone()).toBe(false); // After X moves only O is active
      clickCell(1);
      expect(bothOrNone()).toBe(false); // After O moves only X is active
    });

    test('active-player resets to scoreCardX on newGame', () => {
      clickCell(0); // switch to O
      document.getElementById('newGameBtn').click();
      expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
      expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
    });

    test('active-player resets to scoreCardX on resetScore', () => {
      clickCell(0); // switch to O
      document.getElementById('resetScoreBtn').click();
      expect(document.getElementById('scoreCardX').classList.contains('active-player')).toBe(true);
      expect(document.getElementById('scoreCardO').classList.contains('active-player')).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------
     .btn classes — focus/hover animation structure
     ------------------------------------------------------------------------- */
  describe('Button classes — animation hook structure', () => {
    test('New Game button has btn and btn-primary classes', () => {
      const btn = document.getElementById('newGameBtn');
      expect(btn.classList.contains('btn')).toBe(true);
      expect(btn.classList.contains('btn-primary')).toBe(true);
    });

    test('Reset Score button has btn and btn-ghost classes', () => {
      const btn = document.getElementById('resetScoreBtn');
      expect(btn.classList.contains('btn')).toBe(true);
      expect(btn.classList.contains('btn-ghost')).toBe(true);
    });

    test('both buttons are of type="button" (no accidental form submit)', () => {
      expect(document.getElementById('newGameBtn').type).toBe('button');
      expect(document.getElementById('resetScoreBtn').type).toBe('button');
    });
  });

  /* -------------------------------------------------------------------------
     .cell structure for hover/animation effects
     ------------------------------------------------------------------------- */
  describe('Cell structure — hover and animation hooks', () => {
    test('all 9 cells have data-index attributes (0–8)', () => {
      for (let i = 0; i < 9; i++) {
        expect(getCell(i)).not.toBeNull();
        expect(getCell(i).dataset.index).toBe(String(i));
      }
    });

    test('empty cells do NOT have the taken class (hover rules apply)', () => {
      for (let i = 0; i < 9; i++) {
        expect(getCell(i).classList.contains('taken')).toBe(false);
      }
    });

    test('taken class prevents hover glow on occupied cells', () => {
      clickCell(4);
      // The CSS :not(.taken):hover selector means .taken cells don't glow
      expect(getCell(4).classList.contains('taken')).toBe(true);
      // Verify the rest are still not taken
      for (let i = 0; i < 9; i++) {
        if (i !== 4) {
          expect(getCell(i).classList.contains('taken')).toBe(false);
        }
      }
    });

    test('o-piece class is mutually exclusive with x-piece class per cell', () => {
      clickCell(0); // X
      clickCell(1); // O
      expect(getCell(0).classList.contains('x-piece') && getCell(0).classList.contains('o-piece')).toBe(false);
      expect(getCell(1).classList.contains('x-piece') && getCell(1).classList.contains('o-piece')).toBe(false);
    });
  });
});

/* ===========================================================================
   SECTION 3: CSS Design Token Structure
   =========================================================================== */
describe('CSS Design Tokens for neon animation colours', () => {
  test('index.html defines --color-x (cyan neon)', () => {
    expect(indexHtmlSource).toContain('--color-x:');
    expect(indexHtmlSource).toContain('#00f0ff');
  });

  test('index.html defines --color-x-glow', () => {
    expect(indexHtmlSource).toContain('--color-x-glow:');
  });

  test('index.html defines --color-o (magenta neon)', () => {
    expect(indexHtmlSource).toContain('--color-o:');
    expect(indexHtmlSource).toContain('#ff00aa');
  });

  test('index.html defines --color-o-glow', () => {
    expect(indexHtmlSource).toContain('--color-o-glow:');
  });

  test('index.html defines --color-win (gold for winning cells)', () => {
    expect(indexHtmlSource).toContain('--color-win:');
    expect(indexHtmlSource).toContain('#ffe600');
  });

  test('index.html defines --color-win-glow', () => {
    expect(indexHtmlSource).toContain('--color-win-glow:');
  });

  test('CSS custom properties are defined in :root', () => {
    expect(indexHtmlSource).toContain(':root {');
  });
});

/* ===========================================================================
   SECTION 4: HTML markup structure for Playwright E2E animation testing
   =========================================================================== */
describe('HTML markup — structure needed for E2E animation verification', () => {
  test('index.html contains the board element with class "board"', () => {
    expect(indexHtmlSource).toContain('class="board"');
  });

  test('index.html has correct sibling order for CSS combinator in HTML', () => {
    // turnIndicator must come before board in the HTML source
    const tiIdx    = indexHtmlSource.indexOf('id="turnIndicator"');
    const boardIdx = indexHtmlSource.indexOf('id="board"');
    expect(tiIdx).toBeLessThan(boardIdx);
  });

  test('index.html has scoreCardX before scoreCardO in source', () => {
    const xIdx = indexHtmlSource.indexOf('id="scoreCardX"');
    const oIdx = indexHtmlSource.indexOf('id="scoreCardO"');
    expect(xIdx).toBeLessThan(oIdx);
  });

  test('cells use :not(.taken) compatible class strategy (no taken until played)', () => {
    // In the HTML source, the initial cell markup should NOT contain class "taken"
    // (the cells only gain taken via JS)
    const cellSection = indexHtmlSource.match(/id="board"[\s\S]*?<\/div>\s*<!-- Status/);
    if (cellSection) {
      expect(cellSection[0]).not.toContain('class="cell taken"');
    }
  });
});
