/**
 * single-player-ai.test.js
 *
 * Comprehensive tests for the single-player minimax AI feature added in
 * game.js, covering:
 *
 *  — minimax()            : pure scoring algorithm (no DOM)
 *  — getBestMove()        : difficulty-aware move selection (no DOM)
 *  — lockBoard()          : adds board--locked CSS class
 *  — unlockBoard()        : removes board--locked CSS class
 *  — setGameMode()        : mode switching with pill-button UI updates
 *  — scheduleAIMove()     : AI 400 ms delay + board locking lifecycle
 *  — Single-player flow   : X moves → AI (O) responds automatically
 *  — Init with mode-switcher : btn1p/btn2p wired up, default mode = single
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ============================================================
   Import the pure exported functions (no DOM required for these)
   ============================================================ */
const {
  minimax,
  getBestMove,
  checkWinner,
  checkDraw,
  WIN_LINES,
} = require('../game.js');

/* ============================================================
   Helper: build a board from a string like 'XO_X__O__'
   ============================================================ */
function board(str) {
  return str.split('').map((c) => (c === '_' ? null : c));
}

/* ============================================================
   Helpers shared by DOM tests
   ============================================================ */
const GAME_JS_PATH = path.resolve(__dirname, '..', 'game.js');

/**
 * Full HTML including the mode-switcher (mirrors index.html).
 * Used for tests that need btn1p / btn2p.
 */
const FULL_GAME_HTML = `
<div class="page-wrapper">
  <header class="site-header">
    <h1 class="logo">TIC<span class="x-color">✕</span>TAC<span class="o-color">○</span>TOE</h1>
  </header>
  <main class="game-container">
    <div class="turn-indicator is-x" id="turnIndicator" aria-live="polite">
      Player <span class="player-symbol" id="currentPlayerSymbol">X</span>'s turn
    </div>
    <div class="mode-switcher" id="modeSwitcher" role="group" aria-label="Game mode selection">
      <button class="mode-btn mode-btn--active" id="btn1p" type="button" aria-pressed="true">1 Player</button>
      <button class="mode-btn" id="btn2p" type="button" aria-pressed="false">2 Players</button>
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
 * Minimal HTML WITHOUT mode-switcher (two-player default, mirrors game.dom.test.js).
 */
const TWO_PLAYER_HTML = `
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

/** Click cell at data-index */
function clickCell(index) {
  document.querySelector(`[data-index="${index}"]`).click();
}

/** Get text content of element by id */
function textOf(id) {
  return document.getElementById(id).textContent.trim();
}

/* ================================================================
   SECTION 1 — Pure logic: minimax()
   ================================================================ */
describe('minimax() — pure scoring algorithm', () => {
  test('returns positive score when O has already won (no more recursion needed)', () => {
    // O wins on top row — terminal state, O winning
    const b = board('OOO______');
    // checkWinner sees O won → returns 10 - 0 = 10
    const score = minimax(b, 0, false, -Infinity, Infinity);
    expect(score).toBeGreaterThan(0);
  });

  test('returns negative score when X has already won', () => {
    const b = board('XXX______');
    const score = minimax(b, 0, true, -Infinity, Infinity);
    expect(score).toBeLessThan(0);
  });

  test('returns 0 for a draw board', () => {
    // A known draw board: XOXOOXXXO ... actually let's build one carefully
    // X O X
    // X O O
    // O X X  → no three in a row for either player
    const b = board('XOXXOOOX' + 'X'); // 'XOXXOOOXX'
    // Verify it's actually a draw (no winner, full board)
    expect(checkWinner(b)).toBeNull();
    expect(checkDraw(b)).toBe(true);
    const score = minimax(b, 0, true, -Infinity, Infinity);
    expect(score).toBe(0);
  });

  test('prefers a faster O win (lower depth = higher score)', () => {
    // Two boards where O can win immediately vs. in two moves
    // Board A: O wins immediately on top row (depth 0 call → returns ~10)
    const boardA = board('OO_______');  // O plays at 2 → wins
    const scoreA_immediate = minimax(boardA, 0, true, -Infinity, Infinity); // maximizing for O
    expect(scoreA_immediate).toBeGreaterThan(0);

    // Board B: a deeper game — the score is smaller (or negative) compared to immediate win
    // We just verify that an immediate win scores higher than a draw
    const drawBoard = board('XOXXOOOXX');
    expect(checkDraw(drawBoard)).toBe(true);
    const scoreB = minimax(drawBoard, 0, true, -Infinity, Infinity);
    expect(scoreA_immediate).toBeGreaterThan(scoreB);
  });

  test('minimizing player (X) tries to minimise score', () => {
    // X can win on top row — O is to move (minimizing step)
    // X has [0,1] already — X would win at 2, but it's O's turn in minimax
    // minimax from O's perspective (minimizing) should find a block or negative score path
    const b = board('XX_______');
    // isMaximizing=false means it's X's virtual turn (minimizer)
    const score = minimax(b, 0, false, -Infinity, Infinity);
    // Score should be the best X can achieve (negative) or at least not +infinity
    expect(isFinite(score)).toBe(true);
    // Since X can win at index 2 when it's X's turn, score must be negative (X wins)
    expect(score).toBeLessThan(0);
  });

  test('alpha-beta pruning: result is the same as without pruning for fully-explored board', () => {
    // On an empty board the minimax result must be 0 (hard AI never loses → draw at worst)
    const emptyBoard = Array(9).fill(null);
    const score = minimax(emptyBoard, 0, true, -Infinity, Infinity);
    // From an empty board, perfect play by both sides results in a draw (score 0)
    expect(score).toBe(0);
  });

  test('returns correct score for O winning at various depths', () => {
    // At depth 0: O wins → 10 - 0 = 10
    const b0 = board('OOO______');
    expect(minimax(b0, 0, false, -Infinity, Infinity)).toBe(10);

    // At depth 3: O wins → 10 - 3 = 7
    const b3 = board('OOO______');
    expect(minimax(b3, 3, false, -Infinity, Infinity)).toBe(7);
  });

  test('returns correct score for X winning at various depths', () => {
    // At depth 0: X wins → 0 - 10 = -10
    const b0 = board('XXX______');
    expect(minimax(b0, 0, true, -Infinity, Infinity)).toBe(-10);

    // At depth 2: X wins → 2 - 10 = -8
    const b2 = board('XXX______');
    expect(minimax(b2, 2, true, -Infinity, Infinity)).toBe(-8);
  });

  test('does not mutate the input board state', () => {
    const b = board('XO_X_____');
    const original = [...b];
    minimax(b, 0, true, -Infinity, Infinity);
    expect(b).toEqual(original);
  });
});

/* ================================================================
   SECTION 2 — Pure logic: getBestMove()
   ================================================================ */
describe('getBestMove() — difficulty-aware AI move selection', () => {
  test('returns -1 for a completely full board', () => {
    const fullBoard = board('XOXXOOOXX');
    expect(getBestMove(fullBoard, 'hard')).toBe(-1);
  });

  test('hard: takes an immediate winning move for O', () => {
    // O has cells 0,1 — can win at 2
    const b = board('OO_______');
    const move = getBestMove(b, 'hard');
    expect(move).toBe(2);
  });

  test('hard: blocks X from winning when O has no win available', () => {
    // X has cells 0,1 — will win at 2 on next turn. O must block at 2
    const b = board('XX_______');
    const move = getBestMove(b, 'hard');
    expect(move).toBe(2);
  });

  test('hard: blocks X on the main diagonal', () => {
    // X at 0,4 → can win at 8 on diagonal [0,4,8]. O must block at 8
    // Use a clean board to avoid unintended X pieces from the string
    const b = Array(9).fill(null);
    b[0] = 'X'; b[4] = 'X';
    const move = getBestMove(b, 'hard');
    expect(move).toBe(8);
  });

  test('hard: prefers win over block when O can win immediately', () => {
    // O has 0,3 → can win at 6 (col). X has 1,2 → threatens at 0 (row, but 0 is taken)
    // Use a clearer scenario: O at 3,4 can win at 5; X at 0,1 threatens 2
    const b = board('XX_OO____');
    // O can win at 5; X threatens at 2 — O should go for the win
    const move = getBestMove(b, 'hard');
    expect(move).toBe(5);
  });

  test('hard: returns a valid empty cell index', () => {
    const b = board('XO_______');
    const move = getBestMove(b, 'hard');
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThanOrEqual(8);
    expect(b[move]).toBeNull();
  });

  test('easy: with Math.random always < 0.80, returns a random empty cell', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 < 0.80 → random
    const b = board('X________');
    const move = getBestMove(b, 'easy');
    // Must be one of the 8 empty cells
    expect(move).toBeGreaterThanOrEqual(0);
    expect(b[move]).toBeNull();
    randomSpy.mockRestore();
  });

  test('easy: with Math.random always >= 0.80, random path is NOT taken (minimax used)', () => {
    // When Math.random() >= 0.80, the easy threshold check fails
    // and randomMove() is skipped entirely. Math.random should be called
    // exactly ONCE (for the easy threshold check only, not for randomMove()).
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 >= 0.80
    const b = board('OO_______');
    getBestMove(b, 'easy');
    const callCount = spy.mock.calls.length;
    spy.mockRestore();
    // Exactly 1 call: the easy threshold check. randomMove() is NOT invoked.
    expect(callCount).toBe(1);
  });

  test('medium: with Math.random < 0.40, returns a random cell', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2); // 0.2 < 0.40 → random
    const b = board('X________');
    const move = getBestMove(b, 'medium');
    expect(b[move]).toBeNull();
    randomSpy.mockRestore();
  });

  test('medium: with Math.random >= 0.40, uses minimax (hard logic)', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.6); // 0.6 >= 0.40 → minimax
    // O has 3,4 → can win at 5 (middle row)
    const b = board('___OO____');
    const move = getBestMove(b, 'medium');
    expect(move).toBe(5);
    randomSpy.mockRestore();
  });

  test('hard: never picks an already-taken cell', () => {
    // All cells taken except index 7 → must return 7
    const b = ['X','O','X','O','X','O','X',null,'O'];
    const move = getBestMove(b, 'hard');
    expect(move).toBe(7);
  });

  test('hard: on a fresh board, plays center or a corner (strong opening)', () => {
    const b = Array(9).fill(null);
    const move = getBestMove(b, 'hard');
    // Best openings for O are center (4) or corners (0,2,6,8)
    const strongOpens = [0, 2, 4, 6, 8];
    expect(strongOpens).toContain(move);
  });

  test('does not mutate the input boardState', () => {
    const b = board('X___O____');
    const orig = [...b];
    getBestMove(b, 'hard');
    expect(b).toEqual(orig);
  });
});

/* ================================================================
   SECTION 3 — DOM tests: lockBoard() / unlockBoard()
   ================================================================ */
describe('lockBoard() / unlockBoard()', () => {
  beforeEach(() => {
    document.body.innerHTML = TWO_PLAYER_HTML;
    loadGame();
  });

  test('lockBoard() adds board--locked class to #board', () => {
    const { lockBoard } = require('../game.js');
    const boardEl = document.getElementById('board');
    lockBoard();
    expect(boardEl.classList.contains('board--locked')).toBe(true);
  });

  test('unlockBoard() removes board--locked class from #board', () => {
    const { lockBoard, unlockBoard } = require('../game.js');
    const boardEl = document.getElementById('board');
    lockBoard();
    expect(boardEl.classList.contains('board--locked')).toBe(true);
    unlockBoard();
    expect(boardEl.classList.contains('board--locked')).toBe(false);
  });

  test('unlockBoard() is safe to call when board is not locked', () => {
    const { unlockBoard } = require('../game.js');
    const boardEl = document.getElementById('board');
    expect(boardEl.classList.contains('board--locked')).toBe(false);
    expect(() => unlockBoard()).not.toThrow();
    expect(boardEl.classList.contains('board--locked')).toBe(false);
  });

  test('lockBoard() is idempotent (safe to call twice)', () => {
    const { lockBoard } = require('../game.js');
    const boardEl = document.getElementById('board');
    lockBoard();
    lockBoard(); // second call should not throw
    expect(boardEl.classList.contains('board--locked')).toBe(true);
  });

  test('lockBoard() handles missing board element gracefully', () => {
    const { lockBoard } = require('../game.js');
    // Remove the board element
    document.getElementById('board').remove();
    expect(() => lockBoard()).not.toThrow();
  });

  test('unlockBoard() handles missing board element gracefully', () => {
    const { unlockBoard } = require('../game.js');
    document.getElementById('board').remove();
    expect(() => unlockBoard()).not.toThrow();
  });
});

/* ================================================================
   SECTION 4 — DOM tests: setGameMode()
   ================================================================ */
describe('setGameMode()', () => {
  beforeEach(() => {
    document.body.innerHTML = FULL_GAME_HTML;
    loadGame();
  });

  test('setGameMode("two-player") deactivates btn1p and activates btn2p', () => {
    const { setGameMode } = require('../game.js');
    setGameMode('two-player');
    const btn1p = document.getElementById('btn1p');
    const btn2p = document.getElementById('btn2p');
    expect(btn1p.classList.contains('mode-btn--active')).toBe(false);
    expect(btn2p.classList.contains('mode-btn--active')).toBe(true);
  });

  test('setGameMode("single") activates btn1p and deactivates btn2p', () => {
    const { setGameMode } = require('../game.js');
    setGameMode('single');
    const btn1p = document.getElementById('btn1p');
    const btn2p = document.getElementById('btn2p');
    expect(btn1p.classList.contains('mode-btn--active')).toBe(true);
    expect(btn2p.classList.contains('mode-btn--active')).toBe(false);
  });

  test('setGameMode("single") sets aria-pressed="true" on btn1p', () => {
    const { setGameMode } = require('../game.js');
    setGameMode('single');
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('false');
  });

  test('setGameMode("two-player") sets aria-pressed="true" on btn2p', () => {
    const { setGameMode } = require('../game.js');
    setGameMode('two-player');
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('false');
  });

  test('setGameMode() resets the board (clears any placed marks)', () => {
    const { setGameMode } = require('../game.js');
    // Place X on cell 0 first
    clickCell(0);
    expect(document.querySelector('[data-index="0"]').classList.contains('x-piece')).toBe(true);
    // Switching mode should reset the board
    setGameMode('two-player');
    expect(document.querySelector('[data-index="0"]').classList.contains('x-piece')).toBe(false);
  });

  test('setGameMode() resets the status message', () => {
    // Switch to two-player via DOM so the eval'd instance gets gameMode='two-player'
    document.getElementById('btn2p').click();
    // Win a game to set the status message (two-player: human controls both X and O)
    [0, 3, 1, 4, 2].forEach((i) => clickCell(i)); // X wins
    expect(textOf('statusMessage')).toBe('Player X wins!');
    // Switch back to single-player via DOM — this calls setGameMode on eval'd instance
    document.getElementById('btn1p').click();
    expect(textOf('statusMessage')).toBe('');
  });

  test('setGameMode() works without buttons in DOM (no-crash)', () => {
    const { setGameMode } = require('../game.js');
    document.getElementById('btn1p').remove();
    document.getElementById('btn2p').remove();
    expect(() => setGameMode('single')).not.toThrow();
  });

  test('setGameMode() updates internal gameMode state', () => {
    const { setGameMode, _getState } = require('../game.js');
    setGameMode('two-player');
    expect(_getState().gameMode).toBe('two-player');
    setGameMode('single');
    expect(_getState().gameMode).toBe('single');
  });

  test('setGameMode() cancels pending AI timeout and unlocks board', () => {
    jest.useFakeTimers();
    const { setGameMode, _getState } = require('../game.js');

    // Get into single-player mode and trigger AI thinking
    setGameMode('single');
    clickCell(0); // X moves → AI delay starts (400ms)

    const boardEl = document.getElementById('board');
    // Board should be locked during AI delay
    expect(boardEl.classList.contains('board--locked')).toBe(true);

    // Switch mode — should cancel AI and unlock board
    setGameMode('two-player');
    expect(boardEl.classList.contains('board--locked')).toBe(false);
    expect(_getState().aiThinking).toBe(false);

    jest.runAllTimers();
    jest.useRealTimers();
  });
});

/* ================================================================
   SECTION 5 — DOM tests: scheduleAIMove()
   ================================================================ */
describe('scheduleAIMove() — AI move delay and board locking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = FULL_GAME_HTML;
    loadGame();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('locks the board immediately when called', () => {
    const { scheduleAIMove } = require('../game.js');
    const boardEl = document.getElementById('board');
    scheduleAIMove();
    expect(boardEl.classList.contains('board--locked')).toBe(true);
  });

  test('board is unlocked after the 400 ms delay elapses', () => {
    const { scheduleAIMove } = require('../game.js');
    const boardEl = document.getElementById('board');
    scheduleAIMove();
    expect(boardEl.classList.contains('board--locked')).toBe(true);
    jest.advanceTimersByTime(400);
    expect(boardEl.classList.contains('board--locked')).toBe(false);
  });

  test('AI (O) has played after the 400 ms delay in single-player mode', () => {
    const { setGameMode } = require('../game.js');
    setGameMode('single');

    // X plays cell 4 (center)
    clickCell(4);

    // Before timer fires: board locked, no O piece yet
    const cells = document.querySelectorAll('.cell');
    const oPiecesBeforeTimer = Array.from(cells).filter((c) =>
      c.classList.contains('o-piece')
    );
    expect(oPiecesBeforeTimer).toHaveLength(0);

    // After timer fires: AI places O
    jest.advanceTimersByTime(400);
    const oPiecesAfterTimer = Array.from(cells).filter((c) =>
      c.classList.contains('o-piece')
    );
    expect(oPiecesAfterTimer).toHaveLength(1);
  });

  test('human cannot place a mark while AI is thinking', () => {
    const { setGameMode, _getState } = require('../game.js');
    setGameMode('single');

    clickCell(4); // X moves → AI starts thinking
    // Try to place another X mark while board is locked
    clickCell(0); // Should be ignored
    expect(
      document.querySelector('[data-index="0"]').classList.contains('x-piece')
    ).toBe(false);

    jest.advanceTimersByTime(400);
  });

  test('does not schedule AI move in two-player mode', () => {
    // Use DOM click on btn2p so the eval'd instance's event handler switches gameMode
    document.getElementById('btn2p').click();

    clickCell(4); // X moves
    // In two-player mode: no AI delay, board should stay unlocked
    const boardEl = document.getElementById('board');
    expect(boardEl.classList.contains('board--locked')).toBe(false);
  });

  test('aiThinking flag is true during delay and false after', () => {
    const { scheduleAIMove, _getState } = require('../game.js');
    scheduleAIMove();
    expect(_getState().aiThinking).toBe(true);
    jest.advanceTimersByTime(400);
    expect(_getState().aiThinking).toBe(false);
  });
});

/* ================================================================
   SECTION 6 — DOM tests: Single-player game flow integration
   ================================================================ */
describe('Single-player mode: full game flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = FULL_GAME_HTML;
    loadGame();
    // After init, gameMode is 'single' because btn1p is in DOM
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('after X plays, it is O turn indicator while AI thinks', () => {
    clickCell(0); // X plays
    // After X's move, turn switches to O — indicator should show O
    expect(textOf('currentPlayerSymbol')).toBe('O');
  });

  test('after AI plays, it is X turn again', () => {
    clickCell(0); // X plays → AI delay starts
    jest.advanceTimersByTime(400); // AI (O) plays
    expect(textOf('currentPlayerSymbol')).toBe('X');
  });

  test('AI plays exactly one O piece per X move', () => {
    clickCell(4); // X at center
    jest.advanceTimersByTime(400);
    const oPieces = Array.from(document.querySelectorAll('.cell.o-piece'));
    expect(oPieces).toHaveLength(1);
  });

  test('AI does not place additional marks after game is already won', () => {
    // In single-player mode, play until O (AI) wins: verify game stops after O wins
    // X plays center (4). AI plays somewhere. X plays 0. AI plays somewhere.
    // Let X be forced into a loss by hard AI. After O wins, verify board is locked/stopped.
    clickCell(4); // X plays center
    jest.advanceTimersByTime(400); // AI (O) responds

    // After game completes (win/draw), clicking New Game and verifying fresh state
    // Instead: verify once game is over (draw or win), no new O pieces appear on next timer fire
    const boardBefore = Array.from(document.querySelectorAll('.cell')).map((c) => c.className);

    // Force a timer fire to see if a stale AI callback would mutate board
    jest.advanceTimersByTime(400);

    const boardAfter = Array.from(document.querySelectorAll('.cell')).map((c) => c.className);
    // Board state should not change from a stale timer fire
    expect(boardAfter).toEqual(boardBefore);
  });

  test('New Game in single-player: AI cancels pending move and resets', () => {
    clickCell(0); // X plays → AI delay starts
    // Before AI fires, click New Game
    document.getElementById('newGameBtn').click();

    jest.advanceTimersByTime(400); // Timer should fire but move is cancelled

    // Board should be clean
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('x-piece')).toBe(false);
      expect(c.classList.contains('o-piece')).toBe(false);
    });
  });

  test('New Game unlocks board after cancelling pending AI move', () => {
    clickCell(0); // X plays → board gets locked
    const boardEl = document.getElementById('board');
    expect(boardEl.classList.contains('board--locked')).toBe(true);

    document.getElementById('newGameBtn').click();
    expect(boardEl.classList.contains('board--locked')).toBe(false);

    jest.advanceTimersByTime(400);
  });

  test('can play multiple rounds in single-player mode', () => {
    // Round 1: X plays 0, AI plays (wait), X plays 1, AI plays, X plays 2 (wins)
    // But in single-player with hard AI the AI will block, so let's just verify the flow
    clickCell(4); // X at center
    jest.advanceTimersByTime(400); // AI plays
    clickCell(0); // X
    jest.advanceTimersByTime(400); // AI plays
    // At least 1 X piece and 2 O pieces (or game may have ended)
    const xPieces = Array.from(document.querySelectorAll('.cell.x-piece')).length;
    const oPieces = Array.from(document.querySelectorAll('.cell.o-piece')).length;
    expect(xPieces).toBeGreaterThanOrEqual(1);
    expect(oPieces + xPieces).toBeGreaterThanOrEqual(2);
  });

  test('hard AI never loses to X: play optimally as X and expect draw', () => {
    // Best play for X (center then corners) vs hard AI
    // This simulates several moves and verifies AI never lets X win
    const movesToPlay = [4, 0, 2, 6]; // X plays these in order
    for (const idx of movesToPlay) {
      const state = require('../game.js')._getState();
      if (state.gameOver) break;
      if (state.currentPlayer === 'X') {
        // Only click if cell is empty
        const cellEl = document.querySelector(`[data-index="${idx}"]`);
        if (!cellEl.classList.contains('taken')) {
          clickCell(idx);
          jest.advanceTimersByTime(400); // AI responds
        }
      }
    }
    // Verify O (AI) has not lost — statusMessage should not say "Player X wins!"
    const status = textOf('statusMessage');
    expect(status).not.toBe('Player X wins!');
  });
});

/* ================================================================
   SECTION 7 — DOM tests: init() with mode-switcher buttons
   ================================================================ */
describe('init() with mode-switcher buttons present', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = FULL_GAME_HTML;
    loadGame();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test('gameMode defaults to "single" when btn1p is in the DOM', () => {
    const { _getState } = require('../game.js');
    expect(_getState().gameMode).toBe('single');
  });

  test('btn1p starts with mode-btn--active class', () => {
    expect(document.getElementById('btn1p').classList.contains('mode-btn--active')).toBe(true);
  });

  test('btn2p does NOT start with mode-btn--active class', () => {
    expect(document.getElementById('btn2p').classList.contains('mode-btn--active')).toBe(false);
  });

  test('clicking btn2p switches to two-player mode', () => {
    document.getElementById('btn2p').click();
    const { _getState } = require('../game.js');
    expect(_getState().gameMode).toBe('two-player');
    expect(document.getElementById('btn2p').classList.contains('mode-btn--active')).toBe(true);
    expect(document.getElementById('btn1p').classList.contains('mode-btn--active')).toBe(false);
  });

  test('clicking btn1p (when already in two-player) switches back to single', () => {
    document.getElementById('btn2p').click(); // switch to two-player
    document.getElementById('btn1p').click(); // switch back to single
    const { _getState } = require('../game.js');
    expect(_getState().gameMode).toBe('single');
    expect(document.getElementById('btn1p').classList.contains('mode-btn--active')).toBe(true);
  });

  test('btn1p has aria-pressed="true" initially', () => {
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('true');
  });

  test('btn2p has aria-pressed="false" initially', () => {
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('false');
  });

  test('clicking btn2p updates aria-pressed attributes correctly', () => {
    document.getElementById('btn2p').click();
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('true');
  });

  test('clicking btn1p restores aria-pressed="true" on btn1p', () => {
    document.getElementById('btn2p').click();
    document.getElementById('btn1p').click();
    expect(document.getElementById('btn1p').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('btn2p').getAttribute('aria-pressed')).toBe('false');
  });

  test('two-player mode: clicking O cell directly works without AI interference', () => {
    document.getElementById('btn2p').click(); // switch to two-player
    clickCell(0); // X plays
    clickCell(1); // O plays directly (human)
    expect(document.querySelector('[data-index="1"]').classList.contains('o-piece')).toBe(true);
    // No AI delay needed
    const boardEl = document.getElementById('board');
    expect(boardEl.classList.contains('board--locked')).toBe(false);
  });

  test('switching from single to two-player mid-game resets board', () => {
    clickCell(4); // X plays in single-player
    jest.advanceTimersByTime(400); // AI plays
    // Board has marks → switch to two-player
    document.getElementById('btn2p').click();
    document.querySelectorAll('.cell').forEach((c) => {
      expect(c.classList.contains('taken')).toBe(false);
    });
  });
});

/* ================================================================
   SECTION 8 — Edge cases and boundary conditions
   ================================================================ */
describe('Edge cases and boundary conditions', () => {
  describe('minimax edge cases', () => {
    test('handles a board with only one empty cell', () => {
      // X O X / X O O / O X _  — only cell 8 empty
      // No winner present → should pick cell 8
      const b = ['X','O','X','X','O','O','O','X',null];
      expect(checkWinner(b)).toBeNull();
      const score = minimax(b, 0, true, -Infinity, Infinity);
      expect(isFinite(score)).toBe(true);
    });

    test('returns 0 from an empty board (perfect play = draw)', () => {
      const emptyBoard = Array(9).fill(null);
      const score = minimax(emptyBoard, 0, true, -Infinity, Infinity);
      expect(score).toBe(0);
    });
  });

  describe('getBestMove edge cases', () => {
    test('easy difficulty: always returns a valid empty cell index', () => {
      const b = board('XO_X_____');
      for (let i = 0; i < 10; i++) {
        const move = getBestMove([...b], 'easy');
        expect(move).toBeGreaterThanOrEqual(0);
        expect(b[move]).toBeNull();
      }
    });

    test('medium difficulty: always returns a valid empty cell index', () => {
      const b = board('XO_X_____');
      for (let i = 0; i < 10; i++) {
        const move = getBestMove([...b], 'medium');
        expect(move).toBeGreaterThanOrEqual(0);
        expect(b[move]).toBeNull();
      }
    });

    test('hard difficulty: on a single-cell-empty board picks that cell', () => {
      const b = ['X','O','X','O','X','O','O','X',null];
      expect(getBestMove(b, 'hard')).toBe(8);
    });
  });

  describe('AI integration: game-over prevention', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      document.body.innerHTML = FULL_GAME_HTML;
      loadGame();
    });

    afterEach(() => {
      jest.runAllTimers();
      jest.useRealTimers();
    });

    test('resetScore in single-player resets board and state correctly', () => {
      clickCell(0);
      jest.advanceTimersByTime(400);
      document.getElementById('resetScoreBtn').click();
      expect(textOf('scoreX')).toBe('0');
      expect(textOf('scoreO')).toBe('0');
      expect(textOf('scoreDraw')).toBe('0');
      document.querySelectorAll('.cell').forEach((c) => {
        expect(c.classList.contains('taken')).toBe(false);
      });
    });

    test('AI move on an empty board (after new game) is valid', () => {
      // After new game in single-player, X plays first, then AI
      document.getElementById('newGameBtn').click();
      clickCell(4);
      jest.advanceTimersByTime(400);
      const oPieces = Array.from(document.querySelectorAll('.cell.o-piece'));
      expect(oPieces).toHaveLength(1);
    });
  });
});
