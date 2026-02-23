/**
 * game.checkwinner-switcher.test.js
 *
 * Targeted tests for the new public API additions introduced in:
 *   feat: add checkWinner, switchPlayer to game.js public API
 *
 * These tests specifically validate:
 *   1. checkWinner(boardState) returns 'X' | 'O' | null (symbol, not a line)
 *   2. switchPlayer(current) alternates between 'X' and 'O' correctly
 *   3. Return-type contract (string symbol vs array vs null)
 *   4. Comprehensive board configurations for checkWinner
 *   5. Integration between checkWinner and switchPlayer in game simulations
 *   6. Boundary / edge-case behaviour
 *
 * All tests import directly from game.js's module.exports.
 */

'use strict';

const { checkWinner, switchPlayer, checkWin, checkDraw, WIN_LINES } =
  require('../game.js');

/* ===========================================================================
   Helper: build a board from an object { index: 'X'|'O' }
   =========================================================================== */
function makeBoard(fills = {}) {
  const board = Array(9).fill(null);
  for (const [idx, val] of Object.entries(fills)) {
    board[Number(idx)] = val;
  }
  return board;
}

/* ===========================================================================
   Section 1: Return-type contract for checkWinner
   =========================================================================== */
describe('checkWinner — return-type contract', () => {
  test('returns null (not an array, not a number) for an empty board', () => {
    const result = checkWinner(Array(9).fill(null));
    expect(result).toBeNull();
    expect(Array.isArray(result)).toBe(false);
  });

  test('returns the string "X" (not an array) when X wins', () => {
    const board = makeBoard({ 0: 'X', 1: 'X', 2: 'X' });
    const result = checkWinner(board);
    expect(result).toBe('X');
    expect(typeof result).toBe('string');
    expect(Array.isArray(result)).toBe(false);
  });

  test('returns the string "O" (not an array) when O wins', () => {
    const board = makeBoard({ 3: 'O', 4: 'O', 5: 'O' });
    const result = checkWinner(board);
    expect(result).toBe('O');
    expect(typeof result).toBe('string');
    expect(Array.isArray(result)).toBe(false);
  });

  test('returned value is exactly 1 character long (single-char symbol)', () => {
    const boardX = makeBoard({ 0: 'X', 1: 'X', 2: 'X' });
    const boardO = makeBoard({ 6: 'O', 7: 'O', 8: 'O' });
    expect(checkWinner(boardX).length).toBe(1);
    expect(checkWinner(boardO).length).toBe(1);
  });

  test('checkWinner returns a different type than checkWin for the same board', () => {
    const board = makeBoard({ 0: 'X', 1: 'X', 2: 'X' });
    const winner = checkWinner(board);   // → 'X'  (string)
    const line   = checkWin(board, 'X'); // → [0,1,2] (array)
    expect(typeof winner).toBe('string');
    expect(Array.isArray(line)).toBe(true);
  });
});

/* ===========================================================================
   Section 2: checkWinner — all 8 winning lines for both X and O
   =========================================================================== */
describe.each(WIN_LINES)(
  'checkWinner — winning line [%i, %i, %i]',
  (a, b, c) => {
    test(`X wins on [${a},${b},${c}]`, () => {
      const board = makeBoard({ [a]: 'X', [b]: 'X', [c]: 'X' });
      expect(checkWinner(board)).toBe('X');
    });

    test(`O wins on [${a},${b},${c}]`, () => {
      const board = makeBoard({ [a]: 'O', [b]: 'O', [c]: 'O' });
      expect(checkWinner(board)).toBe('O');
    });

    test(`no winner when line [${a},${b},${c}] is only 2 of 3 for X`, () => {
      // Fill only first two positions in the line
      const board = makeBoard({ [a]: 'X', [b]: 'X' });
      expect(checkWinner(board)).toBeNull();
    });

    test(`no winner when line [${a},${b},${c}] is mixed (X,O,X)`, () => {
      const board = makeBoard({ [a]: 'X', [b]: 'O', [c]: 'X' });
      expect(checkWinner(board)).toBeNull();
    });
  }
);

/* ===========================================================================
   Section 3: checkWinner — draw boards (no winner, all filled)
   =========================================================================== */
describe('checkWinner — draw board configurations', () => {
  const DRAW_BOARDS = [
    // Pattern 1: X O X / O O X / X X O
    ['X', 'O', 'X', 'O', 'O', 'X', 'X', 'X', 'O'],
    // Pattern 2: X O X / X O X / O X O
    ['X', 'O', 'X', 'X', 'O', 'X', 'O', 'X', 'O'],
    // Pattern 3: O X O / X X O / X O X
    ['O', 'X', 'O', 'X', 'X', 'O', 'X', 'O', 'X'],
    // Pattern 4: X X O / O O X / X X O — verify no winner
    ['X', 'X', 'O', 'O', 'O', 'X', 'X', 'X', 'O'],
  ];

  test.each(DRAW_BOARDS)(
    'returns null for draw board: %s',
    (...board) => {
      // Validate all 9 elements are filled (sanity check)
      expect(board.every((c) => c !== null)).toBe(true);
      expect(checkWinner(board)).toBeNull();
      expect(checkDraw(board)).toBe(true);
    }
  );
});

/* ===========================================================================
   Section 4: checkWinner — partial boards (mid-game states)
   =========================================================================== */
describe('checkWinner — partial / mid-game board states', () => {
  test('returns null with 1 move on the board', () => {
    const board = makeBoard({ 4: 'X' });
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null with 2 moves on the board', () => {
    const board = makeBoard({ 0: 'X', 8: 'O' });
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null with 4 alternating moves (no three-in-a-row)', () => {
    const board = makeBoard({ 0: 'X', 4: 'O', 2: 'X', 6: 'O' });
    expect(checkWinner(board)).toBeNull();
  });

  test('detects winner at move 5 (minimum possible win)', () => {
    // X: 0,1,2  O: 3,4  → X wins top row
    const board = makeBoard({ 0: 'X', 1: 'X', 2: 'X', 3: 'O', 4: 'O' });
    expect(checkWinner(board)).toBe('X');
  });

  test('detects winner at move 7 (later win)', () => {
    // X: 0,4,8 diagonal (wins), O: 1,2,3
    const board = makeBoard({
      0: 'X', 1: 'O', 2: 'O',
      3: 'O', 4: 'X',
      8: 'X',
    });
    expect(checkWinner(board)).toBe('X');
  });

  test('X and O both have two-in-a-row but neither wins', () => {
    const board = makeBoard({ 0: 'X', 1: 'X', 3: 'O', 4: 'O' });
    expect(checkWinner(board)).toBeNull();
  });
});

/* ===========================================================================
   Section 5: checkWinner — first-found priority
   When multiple lines could match (synthetically), first in WIN_LINES wins.
   =========================================================================== */
describe('checkWinner — first-matching-line priority', () => {
  test('returns the winner based on first match in WIN_LINES order', () => {
    // Both top-row [0,1,2] and middle-row [3,4,5] are complete for X
    // (impossible in a real game but tests evaluation order)
    const board = makeBoard({
      0: 'X', 1: 'X', 2: 'X',
      3: 'X', 4: 'X', 5: 'X',
    });
    // Should still return 'X' (regardless of which line matched first)
    expect(checkWinner(board)).toBe('X');
  });

  test('returns winner when last row and diagonal both complete for O', () => {
    const board = makeBoard({
      2: 'O', 4: 'O', 6: 'O',   // anti-diagonal
      0: 'O', 3: 'O',            // partial left col
    });
    // anti-diagonal [2,4,6] wins — not the first in WIN_LINES ([0,1,2]) because
    // that row is not complete; first matched line determines the result
    expect(checkWinner(board)).toBe('O');
  });
});

/* ===========================================================================
   Section 6: switchPlayer — return-type contract
   =========================================================================== */
describe('switchPlayer — return-type contract', () => {
  test('always returns a string', () => {
    expect(typeof switchPlayer('X')).toBe('string');
    expect(typeof switchPlayer('O')).toBe('string');
  });

  test('never returns null', () => {
    expect(switchPlayer('X')).not.toBeNull();
    expect(switchPlayer('O')).not.toBeNull();
  });

  test('never returns undefined', () => {
    expect(switchPlayer('X')).not.toBeUndefined();
    expect(switchPlayer('O')).not.toBeUndefined();
  });

  test('result is always one of the two valid symbols', () => {
    const valid = new Set(['X', 'O']);
    expect(valid.has(switchPlayer('X'))).toBe(true);
    expect(valid.has(switchPlayer('O'))).toBe(true);
  });

  test('returned symbol is always different from the input', () => {
    expect(switchPlayer('X')).not.toBe('X');
    expect(switchPlayer('O')).not.toBe('O');
  });
});

/* ===========================================================================
   Section 7: switchPlayer — alternation sequences
   =========================================================================== */
describe('switchPlayer — alternation correctness', () => {
  test('X → O', () => {
    expect(switchPlayer('X')).toBe('O');
  });

  test('O → X', () => {
    expect(switchPlayer('O')).toBe('X');
  });

  test('round-trip: switchPlayer(switchPlayer(X)) === X', () => {
    expect(switchPlayer(switchPlayer('X'))).toBe('X');
  });

  test('round-trip: switchPlayer(switchPlayer(O)) === O', () => {
    expect(switchPlayer(switchPlayer('O'))).toBe('O');
  });

  test('20-call alternation starting with X produces correct sequence', () => {
    let player = 'X';
    const results = [];
    for (let i = 0; i < 20; i++) {
      player = switchPlayer(player);
      results.push(player);
    }
    // Should alternate: O, X, O, X, …
    results.forEach((p, i) => {
      expect(p).toBe(i % 2 === 0 ? 'O' : 'X');
    });
  });

  test('20-call alternation starting with O produces correct sequence', () => {
    let player = 'O';
    const results = [];
    for (let i = 0; i < 20; i++) {
      player = switchPlayer(player);
      results.push(player);
    }
    // Should alternate: X, O, X, O, …
    results.forEach((p, i) => {
      expect(p).toBe(i % 2 === 0 ? 'X' : 'O');
    });
  });

  test('9-move game uses switchPlayer correctly to alternate each turn', () => {
    // In a 9-move game X plays moves 0,2,4,6,8 and O plays 1,3,5,7
    const expectedPlayers = ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
    let current = 'X';
    for (let i = 0; i < 9; i++) {
      expect(current).toBe(expectedPlayers[i]);
      current = switchPlayer(current);
    }
  });
});

/* ===========================================================================
   Section 8: Integration — checkWinner + switchPlayer game loop
   =========================================================================== */
describe('Integration: checkWinner + switchPlayer — complete game simulations', () => {
  /**
   * Replay a complete game and return { winner, draw, moveCount }.
   * @param {number[]} moveOrder  Cell indices in play order (alternating X,O)
   */
  function replayGame(moveOrder) {
    const board = Array(9).fill(null);
    let player = 'X';
    let moveCount = 0;

    for (const idx of moveOrder) {
      if (board[idx] !== null) continue; // skip taken (shouldn't happen in valid sequences)
      board[idx] = player;
      moveCount++;

      const winner = checkWinner(board);
      if (winner !== null) {
        return { winner, draw: false, moveCount, finalBoard: [...board] };
      }
      if (checkDraw(board)) {
        return { winner: null, draw: true, moveCount, finalBoard: [...board] };
      }
      player = switchPlayer(player);
    }
    return { winner: null, draw: false, moveCount, finalBoard: [...board] };
  }

  test('X wins on top row [0,1,2] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 3, 1, 4, 2]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on middle row [3,4,5] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([3, 0, 4, 1, 5]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on bottom row [6,7,8] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([6, 0, 7, 1, 8]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on left column [0,3,6] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 1, 3, 2, 6]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on centre column [1,4,7] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([1, 0, 4, 2, 7]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on right column [2,5,8] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([2, 0, 5, 1, 8]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on main diagonal [0,4,8] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 1, 4, 2, 8]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('X wins on anti-diagonal [2,4,6] in 5 moves', () => {
    const { winner, draw, moveCount } = replayGame([2, 0, 4, 1, 6]);
    expect(winner).toBe('X');
    expect(draw).toBe(false);
    expect(moveCount).toBe(5);
  });

  test('O wins on middle row [3,4,5] in 6 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 3, 2, 4, 6, 5]);
    expect(winner).toBe('O');
    expect(draw).toBe(false);
    expect(moveCount).toBe(6);
  });

  test('O wins on anti-diagonal [2,4,6] in 6 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 2, 1, 4, 3, 6]);
    expect(winner).toBe('O');
    expect(draw).toBe(false);
    expect(moveCount).toBe(6);
  });

  test('O wins on right column [2,5,8] in 6 moves', () => {
    const { winner, draw, moveCount } = replayGame([0, 2, 1, 5, 3, 8]);
    expect(winner).toBe('O');
    expect(draw).toBe(false);
    expect(moveCount).toBe(6);
  });

  test('Draw game ends in null winner and draw=true', () => {
    // X O X / O O X / X X O — known draw
    const { winner, draw, moveCount } = replayGame([0, 1, 2, 3, 5, 4, 6, 8, 7]);
    expect(winner).toBeNull();
    expect(draw).toBe(true);
    expect(moveCount).toBe(9);
  });

  test('Another draw configuration ends correctly', () => {
    // Final board: X O X / X O X / O X O — verified no winner
    // Move order: X@0, O@1, X@2, O@4, X@3, O@6, X@5, O@8, X@7
    const { winner, draw } = replayGame([0, 1, 2, 4, 3, 6, 5, 8, 7]);
    expect(winner).toBeNull();
    expect(draw).toBe(true);
  });

  test('checkWinner returns null for every move before the winning move in X-wins game', () => {
    const board = Array(9).fill(null);
    let player = 'X';
    const winningMoves = [0, 3, 1, 4, 2]; // X wins on top row

    // All moves before the last should yield null
    for (let i = 0; i < winningMoves.length - 1; i++) {
      board[winningMoves[i]] = player;
      expect(checkWinner(board)).toBeNull();
      player = switchPlayer(player);
    }

    // Final move should produce 'X'
    board[winningMoves[winningMoves.length - 1]] = player;
    expect(checkWinner(board)).toBe('X');
  });

  test('switchPlayer correctly tracks who plays each move in a complete game', () => {
    const moveOrder = [0, 3, 1, 4, 2]; // X wins
    const expectedPlayers = ['X', 'O', 'X', 'O', 'X'];
    let player = 'X';

    moveOrder.forEach((idx, i) => {
      expect(player).toBe(expectedPlayers[i]);
      // After move, switch (but game engine would detect win before switching)
      if (i < moveOrder.length - 1) {
        player = switchPlayer(player);
      }
    });

    // Player who made the final move should be 'X' (the winner)
    expect(player).toBe('X');
  });
});

/* ===========================================================================
   Section 9: Relationship between checkWinner and WIN_LINES
   checkWinner should detect exactly the boards that have one of the 8 lines
   fully filled by one player.
   =========================================================================== */
describe('checkWinner — consistent with WIN_LINES constant', () => {
  test('checkWinner finds winner for every line in WIN_LINES (X)', () => {
    for (const line of WIN_LINES) {
      const board = Array(9).fill(null);
      line.forEach((idx) => (board[idx] = 'X'));
      expect(checkWinner(board)).toBe('X');
    }
  });

  test('checkWinner finds winner for every line in WIN_LINES (O)', () => {
    for (const line of WIN_LINES) {
      const board = Array(9).fill(null);
      line.forEach((idx) => (board[idx] = 'O'));
      expect(checkWinner(board)).toBe('O');
    }
  });

  test('checkWinner returns null when no line in WIN_LINES is completed', () => {
    // Board with X in cells 0,5,6 and O in cells 1,2,7 — no three-in-a-row
    const board = makeBoard({ 0: 'X', 5: 'X', 6: 'X', 1: 'O', 2: 'O', 7: 'O' });
    // Verify manually: WIN_LINES all have a mix or null
    for (const line of WIN_LINES) {
      const vals = line.map((i) => board[i]);
      const allX = vals.every((v) => v === 'X');
      const allO = vals.every((v) => v === 'O');
      expect(allX || allO).toBe(false);
    }
    expect(checkWinner(board)).toBeNull();
  });

  test('checkWinner result matches checkWin for same winning board', () => {
    for (const line of WIN_LINES) {
      const board = Array(9).fill(null);
      line.forEach((idx) => (board[idx] = 'X'));

      const winner = checkWinner(board);  // returns 'X'
      const winLine = checkWin(board, 'X'); // returns the winning line array

      expect(winner).toBe('X');
      expect(winLine).toEqual(line);
    }
  });
});

/* ===========================================================================
   Section 10: Exported API surface verification
   Ensures both functions are correctly exported (not undefined or null)
   =========================================================================== */
describe('Exported API surface — checkWinner and switchPlayer', () => {
  test('checkWinner is exported and is a function', () => {
    expect(checkWinner).toBeDefined();
    expect(typeof checkWinner).toBe('function');
  });

  test('switchPlayer is exported and is a function', () => {
    expect(switchPlayer).toBeDefined();
    expect(typeof switchPlayer).toBe('function');
  });

  test('checkWinner has arity 1 (accepts one parameter)', () => {
    expect(checkWinner.length).toBe(1);
  });

  test('switchPlayer has arity 1 (accepts one parameter)', () => {
    expect(switchPlayer.length).toBe(1);
  });

  test('checkWinner is a named function', () => {
    expect(checkWinner.name).toBe('checkWinner');
  });

  test('switchPlayer is a named function', () => {
    expect(switchPlayer.name).toBe('switchPlayer');
  });
});
