# Voxel Archaeology: Contents + Architecture Analysis

**Status:** Architecture analysis, not built. Authored 2026-05-31. Companion to `VOXEL_ARCHAEOLOGY_SPEC.md` (the spec is "what/why"; this is "what to include + how").
**Working id/file:** `archaeology` / `stem_lab/stem_tool_archaeology.js`

---

## 1. The platform contract (verified from the existing tools)

A STEM tool is a self-contained `.js` (no build) that, on load, calls:

```js
window.StemLab.registerTool('archaeology', {
  title: '...', icon: '...', lightBackground: true /* opt out of dark canvas treatment */,
  render: function (ctx) {
    var h = window.React.createElement;   // tools use React.createElement, not JSX
    // ...return a React element tree...
  }
});
```

Available from the platform (confirmed in `stem_lab_module.js` and `stem_tool_rocks.js`):
- `ctx` carries hub state + setters (e.g. `setStemLabTool(null)` to go back), and the progress/XP data object.
- `window.AlloStemTheme.palette()` / `palette('dark')` — current theme colors. Pair with `var(--allo-stem-*)` CSS vars.
- `announceToSR(message)` — ARIA live-region announcer (this is how existing tools talk to screen readers).
- `window.StemLab.setupHiDPI(canvas, w, h)` — DPR-correct canvas sizing.
- XP / quest / `recordGameCompletion` — the hub's completion + reward system; tools report progress into it.
- Shared reduced-motion CSS is already injected by the hub; honor it. Respect global mute; use `window._alloHaptic`.

**Implication:** existing tools draw their interactive surface on a `<canvas>` and expose it to assistive tech with a single `aria-label` plus keyboard shortcuts. That works for "click a zone" tools. It does NOT work for an excavation grid where every cell is individually interactive. That gap drives the next decision.

## 2. The defining architectural decision: DOM-grid interaction, canvas as visuals only

Do **not** make the canvas the interactive surface. Build the excavation grid as **real, focusable DOM elements** (an ARIA grid of `gridcell` buttons), and use canvas/CSS only as a visual layer drawn to match.

Why this is the right call for this tool specifically:
- Per-cell excavation requires per-cell focus, labels, and state. A single aria-labeled canvas cannot expose 36 distinct, individually-operable cells to a screen reader or keyboard. A DOM grid gets keyboard navigation, focus, and SR labeling **for free, by construction**.
- It is strictly more accessible than the rocks/platetectonics canvas+shortcut pattern, which matters because accessibility is AlloFlow's whole brand and this is a net-new tool with no legacy to preserve.
- The 2D plan grid is small (e.g. 6x6) so DOM-element-per-cell has no performance issue. Canvas can still render the richer visual (textures, artifact art, the cross-section) underneath or beside the DOM grid, marked `aria-hidden`.

So: **DOM owns interaction and semantics; canvas owns pixels.** This is the architectural spine.

## 3. Three-layer module structure (and the testability lesson)

Separate the tool into three layers inside the one file, in dependency order:

1. **Pure engine (no DOM, no React, no globals).** Site generation, excavation logic, dating evaluation, scoring, feedback. Plain functions on plain data. This is the part that can be unit-tested headless.
2. **React view (`render(ctx)`).** Builds the ARIA grid, cross-section, and log from engine state; wires keyboard + `announceToSR`; reports XP via `ctx`. Holds UI state with `useState`.
3. **Visual layer.** CSS-styled grid cells and/or a canvas drawn from engine state, `aria-hidden`, theme-aware via `AlloStemTheme.palette()`.

**Apply the pipeline lesson here: build the pure engine decoupled and tested from day one.** The pipeline became hard to test precisely because logic was entangled with DOM and globals. Do the opposite now: keep the engine a pure module so a `tests/archaeology_engine.test.js` golden master can pin excavation, dating, and scoring behavior before any UI exists. This is cheap when done at the start and expensive to retrofit.

## 4. Pure engine API (illustrative)

```
generateSite(config) -> SiteModel        // deterministic given a seed; no Math.random at runtime in tests
exposeCell(state, x, y) -> { state, exposed }   // excavate topmost un-removed layer at (x,y)
recordFind(state, x, y) -> state          // mark an exposed artifact as recorded (context preserved)
removeFind(state, x, y) -> { state, lostContext: bool }  // removing before recording loses context
proposeOrdering(state, ordering) -> { correct, explanation }  // superposition check
scoreSession(state) -> { systematic, contextPreserved, datingCorrect, summary }
```

All pure: `(data) -> data`. No DOM, no `window`, no time, no randomness at call time (seed the site so tests are deterministic).

## 5. Data model

```
SiteModel {
  cols, rows, depth,
  strata: [ { index, name, material, period, color, pattern } ],  // 0 = surface, last = oldest
  cells: cells[x][y] = { excavatedToDepth: int, artifactId|null at each depth }
  artifacts: [ { id, type, label, description, trueStratum, fragile } ]
}
ExcavationState {
  site: SiteModel,
  cursor: {x, y},
  exposed: set of cells whose current layer is exposed,
  recorded: set of artifactIds recorded-in-context,
  removed: set of artifactIds removed (with a lostContext flag if removed before recorded),
  log: [ {action, x, y, depth, artifactId?, ts} ]   // ts stamped by the view, not the engine
}
```

## 6. The three synchronized views (one state, three representations = UDL by design)

- **Plan view (interactive):** ARIA `grid` of `gridcell` buttons, one per (x,y), showing current depth/material/exposed-artifact. Arrow keys move a roving-tabindex cursor; Enter excavates; a second key records. This is the only surface the user operates.
- **Cross-section view (representation):** a side view of strata and depth at the cursor's row or column. Canvas or DOM; `aria-hidden` if canvas, with an adjacent text summary.
- **Excavation log (representation):** a running text list of actions and finds; doubles as the screen-reader history and the basis for the end-of-dig site report.

## 7. Accessibility architecture (the acceptance gate)

- ARIA `grid`/`row`/`gridcell` with **roving tabindex** (one tab stop, arrow keys move within).
- Every cell has an accessible name: position + depth + material + exposed artifact. State changes pushed through `announceToSR`.
- **No color-only encoding:** strata carry a label and a pattern, not just a palette color. All text meets WCAG 2.1 AA via theme vars in light/dark/high-contrast.
- Focus management on layer change and view switches; visible focus ring.
- Honor reduced-motion and global mute; never convey essential state by motion or sound alone.

## 8. Platform integration

- Register as in section 1; `render(ctx)` returns the view.
- Report progress through the hub's XP/quest system (`recordGameCompletion` and `ctx`), e.g. XP for systematic excavation, a quest for "interpret the site correctly." Match the shape used by an existing tool (study `rocks`).
- Theme via `AlloStemTheme.palette()`; canvas via `setupHiDPI` if used; no PII, no network, no new CDN.

## 9. What the tool should INCLUDE (content/feature inventory)

**MVP (build first):**
- One dig site, deterministic from a seed: 6x6 plan, 5 strata (e.g. topsoil, occupation layer, ash/destruction layer, earlier occupation, sterile/bedrock), 3 to 5 artifacts placed in specific strata.
- Excavate-one-layer-at-a-time mechanic on the DOM grid.
- **Record-before-remove**: recording preserves context; removing first loses the artifact's dating information. This mechanic *is* the ethics lesson.
- **Relative-dating challenge**: order the recovered artifacts by age using superposition; engine checks and explains.
- **End-of-dig site report**: a short summary of what was found, in what layer, and the inferred sequence.
- Feedback that rewards systematic, context-preserving work and explains losses without punishing exploration harshly.

**Phase 2 (later):**
- Absolute-dating mini-step (radiocarbon/dendrochronology) contrasted with relative dating.
- Multiple sites and difficulty levels (grid size, strata count, ambiguous stratigraphy, intrusive features like pits that cut through layers — a great advanced concept).
- A "publish your site report" export (ties to the platform's literacy/recording theme).
- Richer artifact sets tied to a historical period, with a short factual blurb each.

**Content guardrails (from the spec):** context-over-loot reward structure; accurate dating science; no pseudo-archaeology; an age-appropriate provenance/repatriation note; domain accuracy reviewed by someone with a history/anthropology background.

## 10. Testability

A `tests/archaeology_engine.test.js` golden master should pin, against the pure engine:
- Site generation is deterministic for a given seed.
- Excavation exposes the correct layer/artifact; you cannot reach depth n+1 before n.
- Recording vs removing sets context-preserved vs lost correctly.
- The superposition ordering check passes the correct order and rejects wrong ones with the right explanation.
- Scoring rewards systematic/context-preserving sessions and reflects dating correctness.

Because the engine is pure, these run headless under the existing vitest setup with no DOM and no mocks.

## 11. Phasing summary

1. Pure engine + its golden-master tests (no UI).
2. DOM ARIA-grid plan view + keyboard + `announceToSR`, reading engine state.
3. Cross-section + log views; theme; XP/quest integration.
4. Visual polish (canvas textures/art) as enhancement.
5. Phase 2 content (absolute dating, multiple sites, intrusive features, export).

## 12. Risks / open questions

- **Content accuracy** needs a domain check (no archaeologist among current advisors).
- **Canvas-vs-DOM balance:** keep interaction in DOM; if performance or richness later pushes toward canvas, never regress the DOM-operable path.
- **Scope creep:** the MVP is one site and one mechanic; resist adding dating methods and multiple sites before the accessible core is solid.
- **XP/quest shape:** confirm the exact `ctx`/`recordGameCompletion` contract against `stem_lab_module.js` before wiring rewards.
