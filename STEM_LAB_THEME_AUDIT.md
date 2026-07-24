# STEM Lab Theme Responsiveness Audit

> **Historical audit snapshot, not current STEM theme status (2026-07-09):** This May 2026 note explains the design choice behind contrast-theme overrides and STEM lab theming. Current STEM counts and visual/a11y status should be verified from `a11y-audit/`, `FEATURE_INVENTORY.md`, and the latest test runs.

**Generated**: 2026-05-19 (Claude Opus 4.7)
**Updated**: 2026-05-19 (Claude Opus 4.7) — Pieces A + B + C landed.
**Trigger**: Fractions Lab and other tools render dark backgrounds that don't respond to AlloFlow theme switching. Aaron's example: in Fractions Lab the bottom section flips with theme, the top viz area stays dark navy regardless.

## Update — what's implemented as of 2026-05-19

Three pieces shipped instead of the full bulk migration originally proposed:

**Piece A — `window.AlloStemTheme` JS helper** (in `stem_lab/stem_lab_module.js`).
JS-accessible palette for canvas / SVG / dynamic style code that can't use CSS variables. Usage:
```js
var p = window.AlloStemTheme.palette();         // current theme
var p = window.AlloStemTheme.palette('contrast'); // explicit
ctx.fillStyle = p.canvas;
ctx.strokeStyle = p.text;
// Subscribe to theme changes (optional — fires when <main> class changes)
var unsub = window.AlloStemTheme.onChange(function (themeName, palette) { /* repaint */ });
```
Palette keys match the `--allo-stem-*` CSS variables: `canvas`, `panel`, `deeper`, `text`, `textSoft`, `border`, `buttonBg`, `buttonText`, `buttonBorder`.

**Piece B — High-contrast override stylesheet** (in `AlloFlowANTI.txt`, alongside the existing CSS variable block).
Attribute-selector CSS that catches inline-styled dark backgrounds and light text across all STEM tools when `theme === 'contrast'`. Covers:
- Hex bg patterns: `#0f172a`, `#1e293b`, `#020617`, `#0a0e1a`, `#0a0a18`, `#0b1220`, `#162032` → `#000`
- RGBA bg patterns: `rgba(15,23,42,*)`, `rgba(2,6,23,*)`, `rgba(30,41,59,*)`, `rgba(8,18,32,*)`, `rgba(9,17,28,*)`, `rgba(11,17,32,*)` → `#000`
- Light text colors (slate-100/200/300/400, zinc/neutral/gray equivalents) → `#ffff00`
- Dark borders (`#334155`, `#475569`) → `#ffff00`
- Property-name-aware (matches inline-style substrings): `background:` rules don't touch `color:` text and vice versa.
- SVG `fill`/`stroke` deliberately untouched — those encode information in visualizations.
Reaches all 101 hardcoded-palette tools without per-tool migration.

**Piece C — This document + architecture.md note.**
Design rationale recorded so the immersive dark-palette aesthetic isn't accidentally erased by future "let's make tools follow theme" attempts.

## Design rationale — why we chose targeted contrast over full theme migration

The original instinct ("migrate all 101 tools to follow app theme") would have:
- Broken the lab-immersion aesthetic. STEM visualizations (planetariums, microscopes, optics ray tracing, simulators) traditionally use dark backgrounds for glare reduction, spectral color visibility, and the "lab mode" psychological signal.
- Risked breaking 101 custom simulations with subtle visual regressions (gradients, semi-transparent overlays, color-coded data viz).
- Cost 1-2 days of work for an unclear UX win — many users would prefer the immersive dark experience regardless of app theme.

What was actually broken — and now fixed — was **high-contrast accessibility users getting no benefit from the contrast theme inside STEM tools.** Piece B addresses that without forcing all tools into the host's day/night switching.

The CSS-variable infrastructure (this doc's original proposal, defined at AlloFlowANTI.txt:22016) remains. Tools that want to opt in to full theme awareness can use `var(--allo-stem-*)` for their backgrounds and `window.AlloStemTheme.palette()` for their canvas-drawn elements. The 3 already-theme-aware tools (echolocation, echotrainer, geosandbox) demonstrate this pattern.

## TL;DR

- **104 STEM Lab tools scanned.** ~855 occurrences of hardcoded dark navy/slate backgrounds (`#0f172a`, `#1e293b`, `#020617`).
- **Root cause**: STEM tools use **inline `style={{ background: '#0f172a' }}`** instead of Tailwind utility classes. The existing theme-dark CSS in [AlloFlowANTI.txt:21809-21859](AlloFlowANTI.txt#L21809-L21859) only overrides Tailwind utility classes (`.theme-dark .bg-white { ... }`), so it can't reach inline styles.
- **Fix architecture**: introduce CSS custom properties scoped to themes. Inline styles change from hex literals to `var(--allo-stem-canvas)`. The variable resolves per-theme.
- **Aaron's guidance preserved**: the existing dark color palette stays — it becomes the dark-theme variant. Light theme gets a corresponding light palette, contrast theme a high-contrast palette.

## The data

### Color frequency (top hardcoded backgrounds across all STEM tools)

| Color | Count | Role |
|---|---|---|
| `#0f172a` (slate-900) | 596 | Primary "dark canvas" — the dominant background |
| `#1e293b` (slate-800) | 208 | Panel/card background on dark canvas |
| `#020617` (slate-950) | 51 | Deeper nested panels |
| `#0a0e1a` / `#0a0a18` | ~50 | Variants of the same dark-canvas idea |
| `#faf5ff`, `#fef3c7`, `#f0fdf4`, etc. | ~250 | Pastel accent backgrounds (intentional design, not the theme-switching problem) |

**~855 of those 1,150 hex-color backgrounds are the dark-canvas issue.** The pastel ones are intentional accents that shouldn't change with theme.

### Top affected tools

| Tool | Hardcoded color count | Notes |
|---|---|---|
| `nutritionlab` | 412 | Heaviest — needs careful work |
| `roadready` | 283 | |
| `fireecology` | 113 | |
| `astronomy` | 101 | |
| `llm_literacy` | 98 | |
| `microbiology` | 73 | |
| `optics` | 70 | |
| `geometryworld` | 67 | |
| `bridgelab` | 65 | |
| `statslab`, `birdlab`, `stewardship`, `applab`, `spacecolony`, `flightsim`, `playlab`, `throwlab`, `renewables`, `printingpress`, `learning_lab` | 20-46 each | Mid-range |

`fractions` has only 2 hardcoded background hexes — but those 2 are exactly the bars area that doesn't flip in your screenshot. Small surface area = good pilot target.

## Why the current theme system doesn't reach STEM tools

The existing theme system at [AlloFlowANTI.txt:21809](AlloFlowANTI.txt#L21809):

```css
.theme-dark .bg-white {
    background-color: #162032 !important;
    color: #f1f5f9 !important;
    border-color: #334155 !important;
}
.theme-dark .bg-slate-50,
.theme-dark .bg-slate-50\/50,
.theme-dark .bg-slate-50\/80 {
    background-color: #0f172a !important;
}
```

These rules override **Tailwind utility classes** on the rendered DOM. AlloFlow's chrome uses those utility classes everywhere (`<div className="bg-white">`), so theme-dark catches them.

STEM tools were authored by various Claude instances who used **inline React style** instead: `el('div', { style: { background: '#0f172a' } }, ...)`. Inline styles win the CSS specificity battle against `.theme-dark .bg-white` because CSS can't override an inline style without the inline style itself being a CSS variable.

So the fix isn't to add more `.theme-dark` overrides — it's to give the inline styles something the theme can change.

## Proposed architecture: CSS custom properties

Define a small palette of STEM-specific variables on each theme class. Tools use the variables instead of hex literals.

```css
/* Default (light) theme — STEM tools */
:root, .theme-default {
    --allo-stem-canvas:       #ffffff;   /* main tool background */
    --allo-stem-panel:        #f8fafc;   /* card/panel background */
    --allo-stem-deeper:       #e2e8f0;   /* nested panel */
    --allo-stem-text:         #0f172a;   /* primary text on canvas */
    --allo-stem-text-soft:    #475569;   /* secondary text */
    --allo-stem-border:       #cbd5e1;   /* default border */
}

.theme-dark {
    --allo-stem-canvas:       #0f172a;   /* ← preserves Aaron's existing dark */
    --allo-stem-panel:        #1e293b;   /* ← preserved */
    --allo-stem-deeper:       #020617;   /* ← preserved */
    --allo-stem-text:         #f1f5f9;
    --allo-stem-text-soft:    #94a3b8;
    --allo-stem-border:       #334155;
}

.theme-contrast {
    --allo-stem-canvas:       #000000;   /* pure black */
    --allo-stem-panel:        #1a1a1a;
    --allo-stem-deeper:       #000000;
    --allo-stem-text:         #ffffff;
    --allo-stem-text-soft:    #fbbf24;   /* yellow accent for AAA contrast */
    --allo-stem-border:       #ffffff;
}
```

Then tools migrate from:

```js
el('div', { style: { background: '#0f172a' } }, ...)
```

to:

```js
el('div', { style: { background: 'var(--allo-stem-canvas)' } }, ...)
```

**The existing dark palette is preserved as the dark-theme variant.** No design erasure — just promoting hardcoded values to named, theme-aware variables.

## Migration strategy

### Step 1 — Define the variables (one edit)

Add the three theme blocks above to AlloFlowANTI.txt, near the existing `.theme-dark` block at line 21809.

### Step 2 — Pilot on one small tool (Fractions Lab)

- 2 hardcoded backgrounds total — minimal blast radius
- Aaron's specific example from the screenshot — direct visual verification
- Confirms the CSS-variable approach actually flips when theme changes
- Verifies no breakage to other styles in that tool

### Step 3 — Bulk migration with allowlist

Once the pilot proves the architecture, run a scripted migration:

```
#0f172a → var(--allo-stem-canvas)
#1e293b → var(--allo-stem-panel)
#020617 → var(--allo-stem-deeper)
```

For each tool:
1. Find every `background: '#0f172a'` (and variants) in inline styles
2. Replace with the corresponding `var(--allo-stem-*)`
3. Find every adjacent `color: '#e2e8f0'` / `color: '#f1f5f9'` text color and replace with `var(--allo-stem-text)`
4. Mirror to `desktop/web-app/public/stem_lab/`
5. Verify visually in each theme

Realistic pace: ~10 tools per focused session. ~10 sessions to migrate all 104, but with strict prioritization (top-20 tools cover ~80% of occurrences), 2 sessions could get 80% coverage.

### Step 4 — Edge cases that need hand-review

- **Tools that use dark gradients** (e.g., `linear-gradient(135deg, #0f172a, #1e293b)`) — need decomposition into variable references
- **Canvas / SVG visualizations** that draw to canvas with fixed colors — the canvas drawing code itself needs theme-awareness, not just the container
- **Tools with pure dark aesthetic design intent** (e.g., space-themed `astronomy`, `spacecolony`, `flightsim`) — these might stay dark regardless of theme. They'd opt out by using fixed hex values intentionally, with a comment noting the design intent.

## Out of scope for this audit

- The 250+ pastel accent backgrounds (`#faf5ff`, `#fef3c7`, etc.) — these are intentional and should NOT change with theme
- Canvas drawing colors inside `<canvas>` elements — those are imperative pixel writes, not CSS-controllable
- Color-coded data visualization (chart colors, fraction-bar colors in Fractions Lab) — these encode information, not theme
- SEL Hub tools — separate audit if needed
- Main monolith chrome — already handled by the existing `.theme-dark .bg-X` system

## Recommendation

1. **Today/next session: pilot Fractions Lab.** Add the CSS variable block + migrate the 2 hardcoded backgrounds. Verify visually in all 3 themes. ~30 minutes.
2. **After pilot validates: bulk-migrate top 5 tools** (`nutritionlab`, `roadready`, `fireecology`, `astronomy`, `llm_literacy`) — covers ~1,000 of the ~1,150 occurrences. ~2 sessions.
3. **Remaining 99 tools** in batches over future sessions as bandwidth allows, or in parallel by multiple instances.

The dark palette is good and you should keep it. This migration is purely about making it switchable rather than hardcoded.
