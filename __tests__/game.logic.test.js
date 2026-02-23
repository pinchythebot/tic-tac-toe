/**
 * game.logic.test.js
 *
 * Unit tests for the pure game logic functions used in game.js.
 * These tests are self-contained and do not depend on DOM APIs.
 *
 * Functions tested (logic extracted / replicated from game.js):
 *   – WIN_LINES constant
 *   – checkWinner()
 *   – checkDraw()
 *   – switchPlayer logic
 */

'use strict';

/* ---------------------------------------------------------------------------
   Replicated pure-logic from game.js (no DOM, no state mutation).
   We test the same algorithms rather than importing private variables.
   --------------------------------------------------------------------------- */

const WIN_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // centre column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal ↘
  [2, 4, 6], // diagonal ↙
];

/**
 * Check whether a board has a winner.
 * @param {Array<null|'X'|'O'>} board
 * @returns {number[]|null}
 */
function checkWinner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

/**
 * Check whether the board is a draw (full, no winner).
 * @param {Array<null|'X'|'O'>} board
 * @returns {boolean}
 */
function checkDraw(board) {
  return board.every((cell) => cell !== null);
}

/**
 * Switch the current player.
 * @param {'X'|'O'} current
 * @returns {'X'|'O'}
 */
function switchPlayer(current) {
  return current === 'X' ? 'O' : 'X';
}

/* ---------------------------------------------------------------------------
   Tests
   --------------------------------------------------------------------------- */

describe('WIN_LINES constant', () => {
  test('contains exactly 8 lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  test('every line contains exactly 3 indices', () => {
    WIN_LINES.forEach((line) => {
      expect(line).toHaveLength(3);
    });
  });

  test('all indices are within 0–8', () => {
    WIN_LINES.forEach((line) => {
      line.forEach((idx) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(8);
      });
    });
  });

  test('covers all three rows', () => {
    expect(WIN_LINES).toContainEqual([0, 1, 2]);
    expect(WIN_LINES).toContainEqual([3, 4, 5]);
    expect(WIN_LINES).toContainEqual([6, 7, 8]);
  });

  test('covers all three columns', () => {
    expect(WIN_LINES).toContainEqual([0, 3, 6]);
    expect(WIN_LINES).toContainEqual([1, 4, 7]);
    expect(WIN_LINES).toContainEqual([2, 5, 8]);
  });

  test('covers both diagonals', () => {
    expect(WIN_LINES).toContainEqual([0, 4, 8]);
    expect(WIN_LINES).toContainEqual([2, 4, 6]);
  });
});

/* ---------------------------------------------------------------------------
   checkWinner
   --------------------------------------------------------------------------- */
describe('checkWinner()', () => {
  test('returns null for an empty board', () => {
    const board = Array(9).fill(null);
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null for a board with no winner', () => {
    // X O X
    // O X O
    // O X O
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
    // No three-in-a-row for either player across the entire board
    // Actually let's make sure this specific board is not a win:
    // Diag [0,4,8] = X,X,O – no
    // Row [0,1,2] = X,O,X – no
    // Actually let me recheck: Row[3,4,5]=O,X,O no; col[0,3,6]=X,O,O no; col[1,4,7]=O,X,X no; col[2,5,8]=X,O,O no; diag[2,4,6]=X,X,O no
    // This is actually a draw board - no winner
    expect(checkWinner(board)).toBeNull();
  });

  // --- X wins on every possible line ---
  test.each(WIN_LINES)('X wins on line [%i, %i, %i]', (a, b, c) => {
    const board = Array(9).fill(null);
    board[a] = 'X';
    board[b] = 'X';
    board[c] = 'X';
    const result = checkWinner(board);
    expect(result).toEqual([a, b, c]);
  });

  // --- O wins on every possible line ---
  test.each(WIN_LINES)('O wins on line [%i, %i, %i]', (a, b, c) => {
    const board = Array(9).fill(null);
    board[a] = 'O';
    board[b] = 'O';
    board[c] = 'O';
    const result = checkWinner(board);
    expect(result).toEqual([a, b, c]);
  });

  test('returns null when line has mixed marks (X, X, O)', () => {
    const board = Array(9).fill(null);
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'O';
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null when only two of three in a row match', () => {
    const board = Array(9).fill(null);
    board[0] = 'X';
    board[1] = 'X';
    // board[2] stays null
    expect(checkWinner(board)).toBeNull();
  });

  test('detects winner even on a nearly full board', () => {
    // X O X
    // O X O
    // X _ X   – X wins on diagonal [0,4,8]
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'X', null, 'X'];
    // Wait – that also completes column [0,3,6] = X,O,X – nope, mixed
    // diag [0,4,8] = X,X,X → WIN
    expect(checkWinner(board)).toEqual([0, 4, 8]);
  });

  test('returns the FIRST matching line when multiple theoretical winners exist', () => {
    // Edge case: board set up so two lines match (not normally possible in a real game)
    const board = Array(9).fill(null);
    // Top row [0,1,2] and left col [0,3,6] both win for X
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    board[3] = 'X'; board[6] = 'X';
    const result = checkWinner(board);
    // WIN_LINES[0] is top-row → should be found first
    expect(result).toEqual([0, 1, 2]);
  });
});

/* ---------------------------------------------------------------------------
   checkDraw
   --------------------------------------------------------------------------- */
describe('checkDraw()', () => {
  test('returns false for an empty board', () => {
    const board = Array(9).fill(null);
    expect(checkDraw(board)).toBe(false);
  });

  test('returns false for a partially filled board', () => {
    const board = Array(9).fill(null);
    board[0] = 'X';
    board[4] = 'O';
    expect(checkDraw(board)).toBe(false);
  });

  test('returns false when only one cell is null', () => {
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
    expect(checkDraw(board)).toBe(false);
  });

  test('returns true for a completely full board', () => {
    // A known-draw board:
    // X O X
    // O X O
    // O X O
    const board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
    expect(checkDraw(board)).toBe(true);
  });

  test('returns true regardless of marks when all cells are filled', () => {
    const board = Array(9).fill('X'); // all X – full board
    expect(checkDraw(board)).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   switchPlayer logic
   --------------------------------------------------------------------------- */
describe('switchPlayer()', () => {
  test('switches X to O', () => {
    expect(switchPlayer('X')).toBe('O');
  });

  test('switches O to X', () => {
    expect(switchPlayer('O')).toBe('X');
  });

  test('alternates correctly over multiple calls', () => {
    let player = 'X';
    const sequence = [];
    for (let i = 0; i < 6; i++) {
      player = switchPlayer(player);
      sequence.push(player);
    }
    expect(sequence).toEqual(['O', 'X', 'O', 'X', 'O', 'X']);
  });
});

/* ---------------------------------------------------------------------------
   Win-detection integration scenarios
   --------------------------------------------------------------------------- */
describe('Full game outcome detection', () => {
  test('Scenario: X wins on top row after 5 moves', () => {
    const board = Array(9).fill(null);
    // Simulate: X→0, O→3, X→1, O→4, X→2 (X wins)
    board[0] = 'X'; board[3] = 'O'; board[1] = 'X';
    board[4] = 'O'; board[2] = 'X';
    expect(checkWinner(board)).toEqual([0, 1, 2]);
    expect(checkDraw(board)).toBe(false);
  });

  test('Scenario: O wins on the right column after 6 moves', () => {
    const board = Array(9).fill(null);
    // X→0, O→2, X→4, O→5, X→6, O→8  → O has [2,5,8]
    board[0] = 'X'; board[2] = 'O'; board[4] = 'X';
    board[5] = 'O'; board[6] = 'X'; board[8] = 'O';
    expect(checkWinner(board)).toEqual([2, 5, 8]);
  });

  test('Scenario: draw after 9 moves', () => {
    // X O X
    // X O X
    // O X O  – no winner
    const board = ['X', 'O', 'X', 'X', 'O', 'X', 'O', 'X', 'O'];
    // Check no winner:
    // rows: [X,O,X], [X,O,X], [O,X,O] – nope
    // cols: [X,X,O], [O,O,X], [X,X,O] – nope
    // diags: [X,O,O], [X,O,O] – nope
    expect(checkWinner(board)).toBeNull();
    expect(checkDraw(board)).toBe(true);
  });

  test('Scenario: game not over with winner on partially filled board', () => {
    const board = Array(9).fill(null);
    board[0] = 'X'; board[1] = 'O';
    expect(checkWinner(board)).toBeNull();
    expect(checkDraw(board)).toBe(false);
  });
});
