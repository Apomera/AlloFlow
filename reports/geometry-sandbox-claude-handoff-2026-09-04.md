# Claude handoff: Geometry Sandbox and immersive Stretch Lab

Prepared September 4, 2026 (America/New_York). Workspace: C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated

## Start here

> **Status update (Claude, September 4, 2026, evening):** the four remaining items below are done. See reports/geometry-sandbox-finishing-pass-2026-09-04.md for what changed and the verification evidence. Still uncommitted and undeployed.


The user requested a broad review of Geometry Sandbox, including immersive mode, bugs, UI/UX, visual clarity, sculpture customization, learning benefits and engagement. After the review, the user authorized implementation with “please go ahead sounds fantastic.” Substantial changes are implemented locally. The user has now explicitly asked to wrap up and hand off to Claude because quota is almost exhausted. Do not restart the audit or assume the task is fully finished.

The next step is a small finishing pass: fix the remaining outdated browser assertion, resolve mobile immersive framing, inspect final screenshots, and validate the affected cases. Nothing has been deployed or committed. No new branch was created. The repository already had extensive unrelated modifications; preserve them. Do not reset, clean, stage all, or rebuild the whole app indiscriminately. No subagents were used.

Original audit: reports/geometry-sandbox-review-2026-09-04.md. That document describes the pre-implementation state; its opening statement that application files were unchanged applies to the review phase only. This handoff supersedes that statement for current status.

## Files changed in this implementation

- stem_lab/stem_tool_geosandbox.js and desktop/web-app/public/stem_lab/stem_tool_geosandbox.js.
- immersive_geometry/immersive_geometry.html and its desktop/web-app/public mirror.
- ui_strings.js, its public mirror, and dev-tools/i18n/stem_geosandbox_en.json: added 68 interface strings and clarified the separate Stretch Lab launch label. Existing dictionary data was preserved by merging into current content.
- tests/geosandbox_workbench.test.js: 16 new mathematical/import regressions.
- tests/e2e/geosandbox-workbench.spec.ts: 12 new browser regressions.
- tests/e2e/19-geosandbox-gl.spec.ts: updated the drag status expectation to “Moved X +1.00 u” because its 42-pixel gesture applies two 0.5-unit increments. One other exact-title assertion still needs updating, described below.

Initial implementation backups are in scratch/geometry-implementation-2026-09-04/stem_tool_geosandbox.js.before and immersive_geometry.html.before. Compare against these when isolating this task's changes; Git HEAD also contains unrelated differences from earlier work. The scratch folder contains intermediate scripts; do not blindly rerun patch scripts because most replacements are intended to run only once.

Source/public byte parity checked when writing this handoff:
- stem_lab/stem_tool_geosandbox.js: true
- immersive_geometry/immersive_geometry.html: true
- ui_strings.js: true

## Implemented fixes

1. Floating sculpture measurements now use the same display scale (2.6 world units per recipe unit, multiplied by whole-sculpt scale) as the math panels.
2. Uniform scaling preserves proportions at bounds. Investigations measure the accepted before/after geometry and refuse a false ×1.25 comparison when the size limit prevents it. Other edits invalidate an active investigation.
3. Torus annulus sections are now normal to local Z, matching the actual rendered torus. Slice position and profile wording distinguish local Z depth from local Y height. Torus dimensions are normalized to maintain a valid ring opening.
4. Challenge mode switches to its own single-shape model, preserves the previous workspace, and restores it on exit.
5. Identification challenges hide answer-bearing titles, palettes, coach content and model descriptions until results are shown.
6. Immersive mobile HUD is scrollable and collapsible, uses under half the screen, and places primary operations first. Related controls are in three disclosure sections. Touch view-turn and center controls were added. Mission focus opens its containing disclosure.
7. Regular mobile layout places a sticky canvas before the control column. Canvas sizing, ResizeObserver, camera fit and horizontal overflow were corrected. A compact mobile measurement readout was added.
8. Immersive launch parameters are consumed after initial use, so refreshing resumes autosaved edits instead of repeatedly restoring the launch dimensions.
9. Whole-object actions and AI replacements enter undo history. Redo is available. A drag is one undo transaction; pointer cancellation restores interaction. A current-recipe ref captures manual edits made while an asynchronous AI response is pending.
10. Part movement normalizes and clamps state consistently with rendering. Movement steps use displayed units at any whole-object scale. Group movement clamps the group together and respects locked members.
11. Retry now recreates the canvas and renderer after transient WebGL initialization failure.
12. Shape choices have distinct accessible names and selection state. Browser modifier shortcuts such as Ctrl+A no longer mutate geometry in immersive mode.

## Added customization and learning features

- A collapsed-by-default precise part inspector: dimensions, local XYZ position, XYZ rotation, proportion lock, part names, groups, movement step, color and material finish.
- Duplicate, mirror across local X, ground, center X/Z and lock actions. Group movement is explicitly opt-in; it does not implement general multi-selection or grouped rotation/scaling.
- Optional transparent unselected parts, subtler selection glow and a clear selected outline.
- Whole-sculpt scale/rotate/recolor controls work without AI. Camera presets: front, side, top, isometric and Fit.
- Sculpture title, update existing save versus Save a copy, JSON import/export and restore a deleted saved sculpture.
- Validated imports support 1–14 analytic box/sphere/cylinder/cone/torus parts. Distorted, lathe and extruded recipes are rejected rather than assigned misleading exact primitive measurements. File input limit: 1 MB.
- Learning notebook stores predictions, explanations, exact comparison results, units, timestamps and before/after recipes in existing tool state. Entries can reopen the before/after model with Undo available to recover current work, and export as JSON. Completed entries are no longer silently dropped after 30 records.
- Written explanations or a self-certified model demonstration can complete an investigation. This is not audio/video capture or automatic assessment of the demonstration.
- Three design briefs: symmetry, equal volume with differing surface area, and a monument using three primitive families. Each has saved notes and an evidence export.
- The launch button now says Stretch Lab and its tooltip explains that sculptures remain in the regular workspace. There is no immersive sculpture-transfer implementation.

## Verification: exact current status

- Final focused unit run: **335/335 passed, 0 failed**, across eight files. Result: scratch/geometry-implementation-2026-09-04/final-unit-tests.json.
- Main browser run: **17 passed, 1 failed**. Result: scratch/geometry-implementation-2026-09-04/final-browser-tests.json. All eight then-existing new workbench tests passed. Nine of ten existing real-WebGL cases passed. The remaining long sculpture test reached a stale drag-message assertion; that expectation was subsequently corrected.
- Targeted follow-up: **4 passed, 1 failed**. Result: scratch/geometry-implementation-2026-09-04/final-browser-followup.json. Group bounds/locks, single-drag undo, display-unit movement and asynchronous AI undo all passed. The existing long sculpture test now stops earlier at another stale expectation: it expects the SVG title “Cross-sectional area by height”, but the improved actual title is “Cross-sectional area by height (local Y)”. Update that exact assertion and rerun the case; do not remove the meaningful drag or rendering assertions.
- Across those runs, 21 distinct browser cases have passed; the 22nd still needs its final successful rerun. Do not report the complete browser suite as green yet.
- The separate scratch/geometry-implementation-2026-09-04/browser-check.cjs harness previously passed 26 checks with real Three.js, OrbitControls and A-Frame. See browser-results.json. It checked sprite agreement, exact fields, mobile order/overflow, save/remount, torus plane bounds, Retry, challenge isolation/concealment, immersive resume, modifier keys, HUD collapse and page errors. That successful run predates the last grouping, compact-mobile-readout, async-undo and wording refinements.
- No external AI request was made for testing; the asynchronous-response test uses a local stub. No physical headset, controller, touch device, production deployment, full app integration, OS fullscreen or actual screen-reader session was tested. SwiftShader scene text can show rendering artifacts; avoid misclassifying those as hardware rendering defects.

## Remaining work, in order

1. In tests/e2e/19-geosandbox-gl.spec.ts update the profile-title assertion to include “(local Y)”. The drag expectation should remain “Moved X +1.00 u”. Run only the affected long test first. This is an outdated expectation, not a demonstrated product regression.
2. **Finish immersive mobile framing.** The saved mobile screenshot shows the rectangle and scene text extending beyond the narrow viewport after a desktop-to-mobile resize. The HUD is fixed, but model framing still needs attention. No camera-framing patch has been applied; only source inspection was in progress when the user asked to stop.
   Relevant code: positionDesktopWorkspace near line 2685, positionMeasurePanel near 2713, their update path around 2767, resetView near 3038, and recenterSpatialPanel near 3173. The scene uses figure, rig, camera and workspacePose. recenterSpatialPanel currently uses a fixed 3-unit center distance. Prefer adapting the non-XR workspace placement to viewport aspect/FOV and the visible area above the HUD, with a resize hook. Preserve physical-headset behavior. Verify actual projected model bounds at 390×844 and after resize; do not infer success solely from HUD dimensions.
3. Rerun browser-check.cjs after finishing framing to update its evidence. Before its screenshots, clear the DOM text selection left by the Ctrl+A test (window.getSelection()?.removeAllRanges()). Current immersive screenshots have blue selection highlights caused by that test. Capture appropriate uncluttered views, inspect them, and adjust any proven clipping.
4. Confirm source/public parity again after edits, and add a concise implementation report if useful. Keep remaining opportunities separate from completed work. English fallback strings are registered; translations of the new copy and physical-device QA remain future work.

## Useful commands and artifacts

Run from the workspace root. Use the existing local dependencies; no installation or deployment is necessary.

- Unit suites: node node_modules/vitest/vitest.mjs run tests/geosandbox_math_audit.test.js tests/geosandbox_mode_isolation.test.js tests/geosandbox_panel_render.test.js tests/geosandbox_render_geometry.test.js tests/geosandbox_stretch_challenge.test.js tests/geosandbox_visual_clarity.test.js tests/immersive_geometry_stretch.test.js tests/geosandbox_workbench.test.js --maxWorkers=1
- Affected browser case: node node_modules/@playwright/test/cli.js test tests/e2e/19-geosandbox-gl.spec.ts --grep "clicking a sculpt primitive" --workers=1 --retries=0
- New cases: node node_modules/@playwright/test/cli.js test tests/e2e/geosandbox-workbench.spec.ts --workers=1 --retries=0
- Visual workflow: node scratch/geometry-implementation-2026-09-04/browser-check.cjs

Both browser specs serve the working tree on an ephemeral localhost port. Although the repository's Playwright default base URL is a live site, these specs explicitly navigate to their own local harness/server.

Screenshots in scratch/geometry-implementation-2026-09-04: sculpt-desktop-after.png, sculpt-mobile-after.png, torus-section-after.png, immersive-desktop-after.png, immersive-mobile-after.png. These are evidence from an earlier successful visual run, not screenshots of every final refinement. Original review scripts and evidence are under scratch/geometry-review-2026-09-04/.

## Environment caveats

Normal sandbox execution and image viewing repeatedly failed with “apply deny-read ACLs.” Read/write/test commands were run through approved require_escalated exec calls; no automatic approval rejection occurred. Windows/OneDrive sometimes returned UNKNOWN open/copy errors even when destination bytes were correct. Verify file contents after any such error. Reliable replacement was to write a staged file inside this workspace's scratch directory, then use native PowerShell Move-Item -LiteralPath with -Force to the exact verified destination. Do not introduce broad deletes or touch unrelated user work. Source files and their desktop/public copies need to remain synchronized.

There is no background implementation worker, deployment or scheduled automation to wait for. The user is excited to test with students; prioritize a truthful, reviewable finishing pass over broad new feature expansion.
