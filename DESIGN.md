# Design: Dark Theme with Neon Accent Styling

**Project:** Tic-Tac-Toe
**Feature Branch:** `feature/dark-theme-neon-accents`
**Phase:** DESIGN
**Date:** 2026-02-22

---

## 1. Overview

The entire Tic-Tac-Toe application is being built from scratch (only a README.md exists). This design covers the full implementation as a **self-contained single-page application** (`index.html`) with embedded CSS and embedded JavaScript. No build toolchain, bundler, or external runtime is needed — the deliverable is one file that opens directly in a browser.

The aesthetic goal: a dark, near-black background with vibrant neon glow on interactive elements, giving the feel of a retro-arcade / cyberpunk UI.

---

## 2. Architecture Decision

| Option | Pros | Cons |
|---|---|---|
| Single `index.html` (embedded CSS + JS) | Zero dependencies, trivially shareable, no build step | Slightly less modular |
| Separate `index.html`, `style.css`, `game.js` | Clean separation of concerns | Requires a local server or CORS-exempt browser for some environments |

**Decision: Separate files** (`index.html`, `style.css`, `game.js`).
Separation of concerns makes each file easier to review and test individually, and any static file server (or even opening `index.html` from disk) serves them correctly.

---

## 3. Color Palette & Design Tokens

All colors are defined as CSS custom properties on `:root` so they can be changed in one place.

```css
:root {
  /* Backgrounds */
  --bg-page:      #0d0d0d;   /* near-black page background */
  --bg-surface:   #161616;   /* dark-grey card surface (board, scoreboard) */
  --bg-cell:      #1c1c1c;   /* individual cell background */
  --bg-cell-hover:#222222;   /* cell hover state */

  /* Neon accents */
  --neon-x:       #00f5ff;   /* electric cyan  — X player */
  --neon-o:       #ff00c8;   /* hot pink/magenta — O player */
  --neon-draw:    #ffd700;   /* gold — draw state */

  /* Borders & dividers */
  --border-subtle: #2a2a2a;
  --border-bright: #3a3a3a;

  /* Text */
  --text-primary:  #e8e8e8;
  --text-dim:      #666666;
  --text-muted:    #444444;

  /* Glow intensities (used in box-shadow / text-shadow) */
  --glow-x-soft:  0 0 8px #00f5ff66, 0 0 20px #00f5ff33;
  --glow-x-hard:  0 0 6px #00f5ff, 0 0 20px #00f5ffaa, 0 0 40px #00f5ff44;
  --glow-o-soft:  0 0 8px #ff00c866, 0 0 20px #ff00c833;
  --glow-o-hard:  0 0 6px #ff00c8, 0 0 20px #ff00c8aa, 0 0 40px #ff00c844;
  --glow-draw:    0 0 8px #ffd70066, 0 0 20px #ffd70033;
}
```

---

## 4. Typography

- **Primary font stack:** `'Orbitron', 'Share Tech Mono', monospace` — a single Google Fonts embed for `Orbitron` (tech/sci-fi look matching neon aesthetics).
- **Fallback:** system monospace fonts so the page is readable even if the font fails to load.
- Google Fonts embed is one `<link>` tag in `<head>` — no icon libraries.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
```

---

## 5. HTML Structure (`index.html`)

```
<body>
  <div class="page-wrapper">
    <header class="site-header">
      <h1 class="logo">TIC<span class="x-color">✕</span>TAC<span class="o-color">○</span>TOE</h1>
    </header>

    <main class="game-container">

      <!-- Turn indicator -->
      <div class="turn-indicator" id="turnIndicator">
        Player <span class="player-symbol" id="currentPlayerSymbol">X</span>'s turn
      </div>

      <!-- Game board -->
      <div class="board" id="board" role="grid" aria-label="Tic Tac Toe Board">
        <div class="cell" data-index="0" role="gridcell" tabindex="0"></div>
        <!-- … cells 1–8 … -->
        <div class="cell" data-index="8" role="gridcell" tabindex="0"></div>
      </div>

      <!-- Status / result message overlay -->
      <div class="status-message" id="statusMessage" aria-live="polite"></div>

      <!-- Controls -->
      <div class="controls">
        <button class="btn btn-primary" id="newGameBtn">New Game</button>
        <button class="btn btn-ghost"   id="resetScoreBtn">Reset Score</button>
      </div>

      <!-- Scoreboard -->
      <div class="scoreboard">
        <div class="score-card score-x">
          <span class="score-label">Player X</span>
          <span class="score-value" id="scoreX">0</span>
        </div>
        <div class="score-card score-draw">
          <span class="score-label">Draws</span>
          <span class="score-value" id="scoreDraw">0</span>
        </div>
        <div class="score-card score-o">
          <span class="score-label">Player O</span>
          <span class="score-value" id="scoreO">0</span>
        </div>
      </div>

    </main>
  </div>
</body>
```

### Semantic & Accessibility Notes
- `role="grid"` / `role="gridcell"` on the board and cells.
- `tabindex="0"` on cells so keyboard users can navigate.
- `aria-live="polite"` on the status message region.
- `aria-label` and `aria-disabled` updated by JS.

---

## 6. CSS Architecture (`style.css`)

### 6.1 Reset & Base

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }
body {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: 'Orbitron', monospace;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 6.2 Page Layout

```css
.page-wrapper  { width: 100%; max-width: 480px; padding: 1.5rem; }
.game-container { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
```

### 6.3 Header / Logo

```css
.logo { font-size: clamp(1.4rem, 5vw, 2rem); font-weight: 900; letter-spacing: 0.2em; }
.x-color { color: var(--neon-x); text-shadow: var(--glow-x-soft); }
.o-color { color: var(--neon-o); text-shadow: var(--glow-o-soft); }
```

### 6.4 Turn Indicator

```css
.turn-indicator {
  font-size: 1rem; letter-spacing: 0.1em;
  color: var(--text-primary);
  transition: color 0.3s ease;
}
.player-symbol { font-weight: 900; font-size: 1.2em; }
/* JS toggles .is-x / .is-o on #turnIndicator */
.turn-indicator.is-x .player-symbol { color: var(--neon-x); text-shadow: var(--glow-x-soft); }
.turn-indicator.is-o .player-symbol { color: var(--neon-o); text-shadow: var(--glow-o-soft); }
```

### 6.5 Board & Cells

```css
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: var(--border-subtle);     /* gap color acts as grid line */
  border: 2px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  width: min(90vw, 360px);
  aspect-ratio: 1;
}

.cell {
  background: var(--bg-cell);
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(2.5rem, 10vw, 4rem);
  font-weight: 900;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, box-shadow 0.15s;
  aspect-ratio: 1;
}

/* Hover — only for empty cells */
.cell:not(.taken):hover {
  background: var(--bg-cell-hover);
}

/* X mark */
.cell.x-piece::before {
  content: 'X';
  color: var(--neon-x);
  text-shadow: var(--glow-x-hard);
  animation: popIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* O mark */
.cell.o-piece::before {
  content: 'O';
  color: var(--neon-o);
  text-shadow: var(--glow-o-hard);
  animation: popIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Winning cell highlight */
.cell.winning {
  background: #1e1e1e;
}
.cell.winning.x-piece { box-shadow: inset 0 0 18px #00f5ff44, var(--glow-x-hard); }
.cell.winning.o-piece { box-shadow: inset 0 0 18px #ff00c844, var(--glow-o-hard); }

/* Taken (occupied) cells — disable pointer */
.cell.taken { cursor: default; }

@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
```

### 6.6 Status Message

```css
.status-message {
  min-height: 1.8rem;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  transition: opacity 0.3s;
}
.status-message.win-x  { color: var(--neon-x); text-shadow: var(--glow-x-soft); }
.status-message.win-o  { color: var(--neon-o); text-shadow: var(--glow-o-soft); }
.status-message.draw   { color: var(--neon-draw); text-shadow: var(--glow-draw); }
```

### 6.7 Buttons

```css
.btn {
  padding: 0.65rem 1.5rem;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow 0.2s, background 0.2s, color 0.2s;
}

.btn-primary {
  background: transparent;
  border: 2px solid var(--neon-x);
  color: var(--neon-x);
}
.btn-primary:hover {
  background: var(--neon-x);
  color: #000;
  box-shadow: var(--glow-x-hard);
}

.btn-ghost {
  background: transparent;
  border: 2px solid var(--border-bright);
  color: var(--text-dim);
}
.btn-ghost:hover {
  border-color: var(--neon-o);
  color: var(--neon-o);
  box-shadow: var(--glow-o-soft);
}

.controls { display: flex; gap: 1rem; }
```

### 6.8 Scoreboard

```css
.scoreboard {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.score-card {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  transition: border-color 0.3s;
}

.score-label { font-size: 0.65rem; letter-spacing: 0.15em; color: var(--text-dim); text-transform: uppercase; }
.score-value { font-size: 2rem; font-weight: 900; }

.score-x .score-value  { color: var(--neon-x); text-shadow: var(--glow-x-soft); }
.score-x.active-player { border-color: var(--neon-x); box-shadow: 0 0 12px #00f5ff22; }

.score-o .score-value  { color: var(--neon-o); text-shadow: var(--glow-o-soft); }
.score-o.active-player { border-color: var(--neon-o); box-shadow: 0 0 12px #ff00c822; }

.score-draw .score-value { color: var(--neon-draw); text-shadow: var(--glow-draw); }
```

### 6.9 Responsive Adjustments

```css
@media (max-width: 380px) {
  .logo { font-size: 1.2rem; }
  .score-value { font-size: 1.5rem; }
  .btn { padding: 0.5rem 1rem; font-size: 0.75rem; }
}
```

---

## 7. JavaScript Architecture (`game.js`)

### 7.1 State Model

```js
const state = {
  board: Array(9).fill(null),   // null | 'X' | 'O'
  currentPlayer: 'X',
  gameActive: true,
  scores: { X: 0, O: 0, draw: 0 }
};
```

### 7.2 Win Conditions

```js
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],   // rows
  [0,3,6],[1,4,7],[2,5,8],   // cols
  [0,4,8],[2,4,6]            // diagonals
];
```

### 7.3 Functions

| Function | Responsibility |
|---|---|
| `initGame()` | Reset board state, clear cell classes, reset turn indicator & status |
| `handleCellClick(e)` | Validate click (game active, cell empty), place mark, check outcome |
| `placeMark(index, player)` | Update `state.board`, add CSS class `.x-piece`/`.o-piece` + `.taken` |
| `checkWinner()` | Iterate WIN_LINES, return winning line array or null |
| `checkDraw()` | Return true if board is full and no winner |
| `highlightWinningCells(line)` | Add `.winning` class to the 3 winning cells |
| `endGame(result, line)` | Set `gameActive=false`, update scores, show message, highlight |
| `updateTurnIndicator()` | Toggle `.is-x`/`.is-o` class and inner text |
| `updateScoreboard()` | Write score values to DOM, toggle `.active-player` |
| `resetScores()` | Zero out `state.scores`, update scoreboard DOM |
| `switchPlayer()` | Toggle `state.currentPlayer` between X and O |
| `handleKeyboard(e)` | Allow Enter/Space to activate focused cell |

### 7.4 Event Wiring

```js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('board').addEventListener('click', handleCellClick);
  document.getElementById('board').addEventListener('keydown', handleKeyboard);
  document.getElementById('newGameBtn').addEventListener('click', initGame);
  document.getElementById('resetScoreBtn').addEventListener('click', () => {
    resetScores();
    initGame();
  });
  initGame();
});
```

### 7.5 Flow Diagram

```
User clicks cell
       │
       ▼
Is gameActive? ──No──► ignore
       │ Yes
       ▼
Is cell empty? ──No──► ignore
       │ Yes
       ▼
  placeMark()
       │
       ▼
  checkWinner() ──found──► highlightWinningCells()
       │                         │
       │                    endGame('win')
       │                    update scores
       │                    show message
       │
  checkDraw() ──true──► endGame('draw')
       │               update scores
       │               show message
       │
  switchPlayer()
  updateTurnIndicator()
  updateScoreboard()
```

---

## 8. File List

| File | Role |
|---|---|
| `index.html` | Markup, viewport meta, font link, wires CSS + JS |
| `style.css` | All styling — dark theme, neon glows, layout, animations |
| `game.js` | All game logic and DOM manipulation |

---

## 9. Implementation Plan (Steps)

| Step | Description | Files |
|---|---|---|
| 1 | Create `index.html` with full semantic markup, viewport meta, Google Fonts link, and `<link>`/`<script>` tags | `index.html` |
| 2 | Create `style.css` — CSS variables, reset, layout, board grid, cell styles, glow effects, turn indicator, buttons, scoreboard, responsive breakpoints, animations | `style.css` |
| 3 | Create `game.js` — state model, win conditions, all game logic functions, event wiring | `game.js` |
| 4 | Manual smoke test in browser: play a full game to win, draw, new game, reset scores | all files |
| 5 | Verify accessibility: keyboard-only play, screen-reader ARIA labels | all files |
| 6 | Commit all three files with descriptive message | all files |

---

## 10. Test Plan

### Visual / Manual Tests
1. **Dark background renders** — page background is `#0d0d0d`, no white flash on load.
2. **X marks appear cyan** — cells marked X show `#00f5ff` text with visible cyan glow.
3. **O marks appear magenta** — cells marked O show `#ff00c8` text with visible magenta glow.
4. **Winning line glows** — the three winning cells pulse with the winner's neon box-shadow.
5. **Winning status message** — correct color (cyan for X, magenta for O) with glow.
6. **Draw message** — gold/yellow color displayed.
7. **Turn indicator updates** — label and symbol color change after each move.
8. **Scoreboard updates** — scores increment correctly after win/draw.
9. **Active player scoreboard card** — border highlight on the current player's card.
10. **Button hover glow** — "New Game" hovers cyan-glow; "Reset Score" hovers magenta.
11. **Responsive layout** — looks correct at 375px (mobile) and 1024px (desktop) widths.
12. **Font loads** — Orbitron font displayed; falls back to monospace gracefully.

### Functional / Logic Tests
13. **Win detection — all 8 lines** — verify each of the 8 win conditions triggers correctly.
14. **Draw detection** — fill board with no winner → draw message appears.
15. **New Game resets board** — all cells clear, turn resets to X, status clears.
16. **Blocked move** — clicking a taken cell does nothing.
17. **Move after game ends** — clicking any cell after win/draw does nothing.
18. **Reset Score** — scores all return to 0.
19. **Score persistence across new games** — scores accumulate across multiple games.

### Accessibility Tests
20. **Keyboard navigation** — Tab moves between cells; Enter/Space places a mark.
21. **ARIA live region** — status message announced to screen readers on win/draw.
22. **Contrast ratio** — cyan/magenta text on dark-grey surface passes WCAG AA (4.5:1 for normal text).

---

## 11. Rollback Plan

Since the feature branch starts from the same commit as `main` (only README.md), a rollback is straightforward:

1. **Abort during implementation (no commit yet):**
   ```bash
   git checkout -- .
   git clean -fd
   ```

2. **After committing on the feature branch:**
   The `main` branch is untouched. Simply do not merge. Delete the feature branch if desired:
   ```bash
   git checkout main
   git branch -D feature/dark-theme-neon-accents
   ```

3. **If already merged into main (partial rollback):**
   ```bash
   git revert <merge-commit-hash>
   ```
   This creates a revert commit, preserving full history.

---

## 12. Design JSON

```json
{
  "implementation_plan": [
    {
      "step": 1,
      "description": "Create index.html with semantic markup: viewport meta, Google Fonts (Orbitron) link, CSS/JS references, game board (9 cells with data-index), turn indicator, status message, control buttons (New Game, Reset Score), and scoreboard (X, Draw, O cards).",
      "files": ["index.html"]
    },
    {
      "step": 2,
      "description": "Create style.css: define all CSS custom properties (color palette, glow shadows), reset, body dark background, board CSS Grid layout, cell dark surface with hover and placed-mark neon glow via text-shadow/box-shadow, winning cell highlight, turn indicator color-switch, button neon border/hover glow, scoreboard card layout with active-player border highlight, pop-in animation, responsive breakpoints.",
      "files": ["style.css"]
    },
    {
      "step": 3,
      "description": "Create game.js: state model (board array, currentPlayer, gameActive, scores object), WIN_LINES constant, initGame/placeMark/checkWinner/checkDraw/highlightWinningCells/endGame/switchPlayer/updateTurnIndicator/updateScoreboard/resetScores/handleKeyboard functions, DOMContentLoaded event wiring.",
      "files": ["game.js"]
    },
    {
      "step": 4,
      "description": "Manual smoke test in browser: verify full game flow (win, draw, new game, score accumulation, reset scores), visual neon styling, and keyboard accessibility.",
      "files": ["index.html", "style.css", "game.js"]
    },
    {
      "step": 5,
      "description": "Commit all three files to feature/dark-theme-neon-accents with a descriptive commit message.",
      "files": ["index.html", "style.css", "game.js"]
    }
  ],
  "file_changes": [
    {
      "path": "README.md",
      "changes": "No changes required — existing README is sufficient."
    }
  ],
  "new_files": [
    {
      "path": "index.html",
      "purpose": "Main entry point. Contains all HTML markup for the game: page wrapper, header/logo, 3×3 board grid (9 cell divs with data-index attributes), turn indicator, status/result message region (aria-live), New Game and Reset Score buttons, and three-column scoreboard. Links style.css and game.js. Embeds Google Fonts Orbitron via a single <link> tag."
    },
    {
      "path": "style.css",
      "purpose": "All visual styling. Defines CSS custom properties for the dark-theme palette (#0d0d0d background, #161616 surfaces, #00f5ff cyan for X, #ff00c8 magenta for O, #ffd700 gold for draw). Implements CSS Grid board layout, neon text-shadow on X/O marks, neon box-shadow on winning cells and button hover states, pop-in keyframe animation for placed marks, active-player border highlight on scoreboard cards, and a responsive breakpoint for mobile widths."
    },
    {
      "path": "game.js",
      "purpose": "All game logic and DOM manipulation. Manages state (9-cell board array, currentPlayer, gameActive flag, X/O/draw scores). Implements win detection against all 8 WIN_LINES, draw detection, mark placement with CSS class toggling (.x-piece/.o-piece/.taken/.winning), turn switching, score tracking, DOM updates for turn indicator and scoreboard, keyboard support (Enter/Space on focused cells), and DOMContentLoaded event wiring."
    }
  ],
  "test_plan": [
    "Visual: page background renders as near-black (#0d0d0d), no white flash",
    "Visual: X marks display electric cyan (#00f5ff) with visible text-shadow neon glow",
    "Visual: O marks display hot-pink/magenta (#ff00c8) with visible text-shadow neon glow",
    "Visual: three winning cells show enhanced neon box-shadow in winner's color",
    "Visual: win status message renders in winner's neon color with glow",
    "Visual: draw status message renders in gold (#ffd700) with glow",
    "Visual: turn indicator symbol and color update after each move",
    "Visual: active player's scoreboard card shows neon border highlight",
    "Visual: 'New Game' button hovers with cyan fill + glow; 'Reset Score' hovers with magenta glow",
    "Visual: Orbitron font loaded; page still readable if font fails (monospace fallback)",
    "Visual: responsive layout is usable at 375px mobile width",
    "Functional: all 8 win conditions (3 rows, 3 cols, 2 diagonals) correctly trigger win",
    "Functional: filling the board with no winner triggers draw state",
    "Functional: clicking a taken cell does not change game state",
    "Functional: clicking any cell after game ends (win or draw) does nothing",
    "Functional: 'New Game' clears board and resets turn to X without resetting scores",
    "Functional: 'Reset Score' zeroes all three scores and starts a new game",
    "Functional: scores accumulate correctly across multiple consecutive games",
    "Functional: player switches from X to O and back correctly each turn",
    "Accessibility: Tab key navigates between board cells",
    "Accessibility: Enter and Space keys place a mark on the focused cell",
    "Accessibility: aria-live region announces win/draw result to screen readers",
    "Accessibility: neon accent colors on dark-grey surface meet WCAG AA contrast ratio (≥4.5:1)"
  ],
  "rollback_plan": "The feature branch (feature/dark-theme-neon-accents) is diverged from main which only contains README.md. Rolling back is zero-risk: (1) If no commit yet — run `git checkout -- . && git clean -fd` to discard working-tree changes. (2) If committed on the feature branch but not merged — simply stay on or return to main; delete the branch with `git branch -D feature/dark-theme-neon-accents` if desired. (3) If the branch was merged into main — run `git revert <merge-commit>` to create a revert commit that restores the pre-merge state, preserving full history.",
  "branch_name": "feature/dark-theme-neon-accents"
}
```
