# Enhancement 66 — Clearer paired views

Paired landmark comparisons now leave more room for the scene. The panel measures the projected landmark centers and labels, then chooses among six positions to reduce overlap. Its height is capped, with a scrollable body and controls that remain visible. Distance values appear before the graph so the comparison is readable immediately.

**Move panel** finds a clearer position after you pan. The panel stays still during camera turns. **Minimize** leaves a small **Show comparison** button while preserving both landmark markers. Restoring it keeps the open distance disclosure and keyboard focus. In short fullscreen landscape views, the panel stays in the center column to avoid the controls at the sides.

## Placement and model limits

Placement uses measured CSS rectangles, with extra space around landmark centers. Centers receive more weight than labels. Equal scores retain the current position. Layout is recalculated when the panel, stage, or disclosure changes; ordinary camera panning does not trigger panel movement.

Available space can still be insufficient to clear both landmarks, particularly on a phone. The layout selects the least obstructive candidate; minimizing remains available. It protects projected center markers and labels rather than an object's full visual extent. Camera coordinates, lens, physics, catalog, and renderer are unchanged by panel actions. Model distances keep their existing meaning: generated scene coordinates, not surveyed measurements.

## Verification

- Seventeen focused tests: eight layout tests, five pair-framing tests, and four inspector tests. These include 288 viewport combinations and 240 pair-projection cases.
- Nine browser workflows covering visible galaxy labels, independently calculated distances, keyboard minimize/restore, exact flyby return, stable placement while panning, and moving the panel without changing camera state or rendered pixels.
- Five scoped accessibility audits: desktop, phone, fullscreen, forced colors, and short landscape fullscreen.
- Eight screenshots and eight checks for reachable controls at least 44 by 44 pixels.
- Exact UI mirrors, syntax checks, a reversible change record, unchanged renderer and 18 preview images, and an empty Git index.

See [verification.json](verification.json), [browser results](browser-verified/check.json), and [unit results](unit/pair-layout-refined-summary.json).

The first browser attempt compared page-relative coordinates before and after focus scrolled the page; the final check focuses the canvas before recording the panel anchor. The refined attempt reached the landscape case, where Chromium rejected resizing an active fullscreen window. The final harness exits fullscreen, resizes, and re-enters it using the button's accessible name. Earlier runs, including a locator correction, are retained. Visual review also prompted moving distance values ahead of the graph and adding the short-landscape layout.

Validation used Chromium with SwiftShader. The full application suite and physical-device GPU matrix were not run. Changes remain uncommitted.
