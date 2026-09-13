# Geometry World entry review — September 12, 2026

Implemented and verified in the local repository. No commit or deployment was performed in this pass; the Gemini Canvas share has not been verified against these new assets.

## Result

- Ordinary entry and re-entry open the four-mode Home menu, including returning users with the old intro flag.
- Persisted subpages reset to the main menu. Stale lesson-intro, settings, and creator overlays are cleared using the existing Home action.
- A saved Print Lab backup no longer prevents Home from appearing. An explicit return request is remembered for the current mount, so consuming its marker does not reopen Home over the returned workspace.
- Restoring a Print Lab project explicitly clears persisted Home flags.
- When the enhancement becomes available on a later render, the legacy intro no longer consumes its welcome gate.
- Invalid saved page names fall back to the main menu.
- Back/Escape navigation restores focus to the mode card used to enter a subpage.
- The four mode cards form a labeled navigation region, and the introductory text explains how to return Home.
- The Learn selector cannot accidentally preview or launch Garden from a stale saved lesson choice.

Home intentionally stays closed during an explicit Print Lab return and after Continue within the same visit. Existing graphics-failure recovery remains available if the 3D engine cannot initialize.

## Verification

126 tests passed across five suites:

```powershell
node node_modules/vitest/vitest.mjs run tests/geometry_world_home_chooser.test.js tests/geometry_world_keyboard_access.test.js tests/geometry_world_input_transitions.test.js tests/geometry_world_engine_lifecycle.test.js tests/geometry_world_printlab_bridge.test.js --maxWorkers=1 --testTimeout=90000 --hookTimeout=90000 --reporter=default --reporter=json --outputFile.json=reports/geometry-world-entry-2026-09-12/tests.json
```

The Home suite now covers 14 cases, including six additional lifecycle/navigation regressions. Its partial THREE mock logs an initialization error; the suite completes successfully. Real Chromium checks below use actual WebGL and report no page errors.

```powershell
node reports/geometry-world-entry-2026-09-12/verify-home.cjs
node reports/geometry-world-entry-2026-09-12/verify-returning.cjs
```

- 47 Home browser checks passed: four modes, keyboard navigation, saved-build validation/import, creation flows, high contrast, collapsed toolbar, fullscreen, fresh touch entry, and 320×700 / 390×844 / 844×390 / 1440×1000 viewports. No page or console errors.
- 10 returning-user browser checks passed: stale flags, main-menu reset, Continue, focus restoration, actual Print Lab → Revise round trip, preservation of blocks/selection/undo/scale, manual Home access, and ordinary remount. No page errors.
- Portrait and short-landscape screenshots visually inspected. All four mode cards are reachable by scrolling, with at least 44px targets and no horizontal overflow.
- Both canonical files passed Node syntax checks. Targeted `git diff --check` passed. Desktop mirrors are byte-identical.

## Files changed

```text
stem_lab/stem_tool_geometryworld.js
stem_lab/stem_tool_geometryworld_builder.js
desktop/web-app/public/stem_lab/stem_tool_geometryworld.js
desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js
tests/geometry_world_home_chooser.test.js
```

SHA-256:

```text
core:    46c9418d36dc6bd222bb25a6a6849008f4032ee3559df2b188053de09275c8ca
builder: e0eba2e220522d1df0f0a6c58f2b6c177a318866d7224699045403da42d95c28
```

The evidence JSON files, browser runners, screenshots, and before-source snapshots are in this directory. Existing Gemini/Kokoro NPC speech work was not changed by this focused entry review.
