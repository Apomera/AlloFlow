# Particle Lab UI handoff for Claude

User asked to fix UI overlap in normal and fullscreen Particle Lab 3D, suggested movable/collapsible UI, and invited related improvements. A first agent built the readouts dock and stopped at a quota-conscious checkpoint. A second session (2026-09-04, Claude) reviewed that work, finished the outstanding checks, and fixed three further defects. Work is LOCAL, UNCOMMITTED, and NOT DEPLOYED.

## Workspace and boundaries

- Workspace: C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated
- There are hundreds of pre-existing unrelated modified/untracked files. Preserve them. Do not reset the tree or run a broad build/sync/commit. Other sessions run large vitest suites in this same tree; commit by explicit pathspec only.
- The two LIVE copies of the tool are stem_lab/ (CDN, web/Canvas) and desktop/web-app/public/stem_lab/ (desktop app). Both carry this work and are byte-identical. desktop/app-build/ and desktop/web-app/build/ are build outputs and were not touched.
- tests/beehive_wcag_a11y.test.js is modified by another lane. Leave it alone.

## Changed deliverables

1. stem_lab/stem_tool_particlelab3d.js
2. desktop/web-app/public/stem_lab/stem_tool_particlelab3d.js (byte-for-byte mirror)
3. tests/particle_lab_3d_accessibility.test.js
4. tests/particle_lab_3d_render_a11y.test.js
5. tests/particle_lab_3d_layout_browser.test.js (new, untracked)
6. tests/chemistry_particle_wcag_browser.test.js (three new particle cases, a faithful dark-theme substrate, and a 60 s budget)

## Implemented behavior (first agent)

- Removed all informational cards pinned on top of the 3D canvas: temperature/pressure, activity, scene key, membrane pore lattice, collective system probe, chamber guide, and tracer analyzer.
- Moved these cards into a separate scrollable 'Chamber readouts' dock. Readouts can be collapsed and placed Right, Left, or Below using a labeled native select.
- Saves readoutsOpen and readoutsPosition through the existing toolData persistence mechanism. Default is open/right. Container widths <=760px place the dock below the canvas automatically; the user's side preference is retained.
- A compact essential bar below the scene always provides Run/Pause, Fullscreen/Exit, and Hide UI/Show controls. Panel controls are also in this bar when UI is visible.
- Hide UI removes ALL informational cards, optional controls, preset heading, and experiment runway. Essential controls stay available. H still toggles UI only when the canvas has focus.
- The canvas DOM node stays mounted while moving/collapsing/hiding UI, preserving the Three.js runtime.
- Fullscreen uses available viewport height (100dvh) and bounded scrolling for optional controls. Experiment runway is omitted in fullscreen.
- Native fullscreen and the CSS immersive fallback are both retained. Fullscreen conditions focus the temperature slider when opened and restore focus to their trigger when closed. Collapsing the dock restores focus to Show readouts.
- Camera controls wrap on narrow widths; layout controls have 44px minimum height and visible focus styles.

## Added in the 2026-09-04 review session

1. **Stage no longer stretches to the sidebar.** The first normal.png was 944 x 3922 px: the stage sits in a grid beside a ~3900 px notebook sidebar and stretched to it, leaving ~3400 px of empty dark stage under the controls (pre-existing, but now very visible). Fix: `#particle-stage[data-fullscreen="false"] { align-self: start; }` in the tool's scoped style. The layout suite now asserts the gap below the last stage child is <= 8 px in normal mode.
2. **Collective-probe COM line** was text-slate-500 on the dark probe card (4.13:1). Now text-slate-400.
3. **High-contrast theme:** the host paints every card black but leaves `text-cyan-700` alone (#0e7490 on black, 3.91:1) on the Temperature/Particle-count/edge/diameter/attraction outputs. The root now carries `id="particle-lab-root"` and the scoped style adds `.theme-contrast #particle-lab-root .text-cyan-700 { color: #67e8f9 }`.
4. **Test budgets:** the accessibility sweep that reads 100+ stem_lab files synchronously needed 60 s (it took 33 s under OneDrive contention and tripped vitest's 5 s default). The WCAG harness per-case budget went 20 s -> 60 s for the same reason.
5. **WCAG harness dark substrate:** the harness renders tools bare under `main.theme-dark`, so the host's generic `.theme-dark .bg-white { #162032 }` remaps apply, although production scopes them with `:not([data-stem-tool-surface] *)` and wraps the tool in a white card. A per-case `hostCard: true` flag now wraps the markup in that production card. It is opt-in because under the faithful substrate the pre-existing `molecule lab dark theme` case shows slate-600 ink on molecule's own dark token panels at 1.93:1 (a real finding for that tool's owner, untouched here).

## Second enhancement pass (same session, later)

6. **D shortcut.** While the canvas has focus, D shows or hides the readouts dock (ignored while the UI is hidden, since Hide UI already removes the dock). Listed in the Keys panel and in the canvas aria-keyshortcuts (now `Space R T V E M G C L F H D ? Escape`, asserted by the accessibility suite).
7. **One collapse control.** The dock heading's duplicate "Collapse" button is gone; the essential bar's "Collapse readouts / Show readouts" toggle (aria-controls="particle-readouts") is the single owner. The dock hint now mentions the bar controls and the D key. The render suite asserts the dock contains no collapse button and covers D, Shift+D, and D-while-hidden.
8. **Taller chamber on tall desktops.** The workspace height is `clamp(520px, 62vh, 780px)` (bottom dock: `clamp(740px, 82vh, 1000px)`); mobile (container <= 760px) keeps 610px and fullscreen is unchanged. Because the stage now aligns to the grid start, this is the only way the chamber gains height on a large monitor.

## Validation status

Latest (after the second enhancement pass, machine still at 100% CPU from other sessions' vitest runs):
- accessibility + render a11y (jsdom): 46/46 pass (scratch/particle-enh-jsdom.log).
- layout browser suite: 7/8 pass (scratch/particle-enh-browser.log). All four normal-mode cases (with the single collapse control and taller clamp) and all three immersive cases pass. The native fullscreen + screenshots case captured all three PNGs at 23:40 and then timed out at 60 s under load. normal.png is now 944 x 931 (was 944 x 3922) and was inspected: stage ends under the control row, dock right, COM line legible. fullscreen.png inspected: same layout at 1440 x 900 with Pause/Exit visible.
- Source and mirror byte-identical; node --check and git diff --check clean.

Earlier in the session:

- `node --check` passes; source and desktop mirror are byte-identical; `git diff --check` clean.
- tests/particle_lab_3d_accessibility.test.js + tests/particle_lab_3d_render_a11y.test.js: 45/45 pass (final run after the last source edit).
- tests/particle_lab_3d_layout_browser.test.js: 8/8 passed after the align-self change (scratch/particle-rerun3.log), including the corrected 1024 px case (stage.clientWidth <= 760 governs auto-bottom docking, not viewport width) and native fullscreen. Native fullscreen WORKS in headless Chromium; the earlier 30 s timeout was screenshot latency, not a fullscreen failure.
- Screenshots in scratch/particle-layout/ were visually inspected: fullscreen.png shows dock right, no overlap, essential bar and secondary controls inside 900 px; clear-view.png shows only Pause/Exit/Show controls over the chamber. normal.png still shows the pre-fix 3922 px stage; recapture after a quiet run.
- tests/chemistry_particle_wcag_browser.test.js filtered to `particle lab 3d`: 4/4 pass (overview, readouts below, dark theme on the host card, high contrast). Text-spacing 200% and 320 px reflow are included in each case.
- KNOWN PRE-EXISTING FAILURE, not this lane: `molecule lab dark theme` in the same WCAG file fails on the untouched HEAD test file too (inline emerald inks #047857/#0f766e on the harness's navy bg-white remap, 2.97:1).
- The very last full run of the layout browser suite (scratch/particle-final-browser.log) saw the four fullscreen cases time out at 60 s while two OTHER sessions' vitest runs held the CPU at 100% with 0.4 GB free; module import alone took 145 s versus 10 s earlier. The source edits since the 8/8 pass are a root id, one contrast CSS rule, and one class swap, none of which touch fullscreen state. A retry of just those four cases (scratch/particle-final-fullscreen.log) passed 1280x720 and timed out on 844x390, 320x568, and native fullscreen at 60 s; by then even a WMI process query took over two minutes, so the machine was still saturated. Rerun the second command below on a quiet machine before calling the browser suite green after the final edits.

## Commands

    npx vitest run tests/particle_lab_3d_layout_browser.test.js --maxWorkers=1
    npx vitest run tests/particle_lab_3d_layout_browser.test.js -t 'immersive|native fullscreen' --maxWorkers=1
    npx vitest run tests/particle_lab_3d_render_a11y.test.js tests/particle_lab_3d_accessibility.test.js --maxWorkers=1
    npx vitest run tests/chemistry_particle_wcag_browser.test.js -t 'particle lab 3d' --maxWorkers=1
    node --check stem_lab/stem_tool_particlelab3d.js
    cmp stem_lab/stem_tool_particlelab3d.js desktop/web-app/public/stem_lab/stem_tool_particlelab3d.js
    git diff --check -- stem_lab/stem_tool_particlelab3d.js desktop/web-app/public/stem_lab/stem_tool_particlelab3d.js tests/particle_lab_3d_accessibility.test.js tests/particle_lab_3d_render_a11y.test.js tests/chemistry_particle_wcag_browser.test.js

Run the browser suites only when the machine is quiet: check `Get-CimInstance Win32_Processor | select LoadPercentage` first. The browser harness reads app/static/css/main.*.css; the tool's layout CSS is a scoped style element, so no host rebuild is needed to test it.

## Open items

1. Rerun the native fullscreen case on a quiet machine so the browser suite reports 8/8 (its screenshots already succeeded).
2. Molecule lab dark theme contrast (see above) belongs to that tool's owner.
3. Commit by pathspec (the six files above) when Aaron asks; do not deploy unasked.
4. Further ideas not started: a resizable dock width, and localising the new dock strings through ui_strings if this tool is in the i18n lane.
