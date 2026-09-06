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

## Third enhancement pass (2026-09-05)

9. **Dock width choice.** A "Width" select (Compact 14rem / Standard 17rem / Wide 22rem) sits beside the position select and is persisted as readoutsWidth. It is offered only for side placements (meaningless below the chamber) and is implemented as a `--particle-dock` custom property on `#particle-workspace[data-width]`, so left and right placements share it. The 1440 px browser case measures the dock at compact and wide and expects at least 100 px difference.
10. **Collapsed status line.** With the dock collapsed, the essential bar shows a plain-text `227 K · 64 particles · paused` summary (`data-testid="particle-mini-status"`, deliberately NOT a live region), so collapsing the dock never hides the chamber state. Rendered and browser suites assert it.
11. Render harness now exposes `persisted()` (latest toolData.particleLab3d) so tests can check what the tool saved.

## Fourth enhancement pass (2026-09-05)

12. **Stray hero margin fixed.** The scoped `<style>` was the root's first child, and the root's `space-y-4` skips only `[hidden]` siblings, so the hero card silently gained a 1rem top margin. The style element now carries `hidden`. The browser suite asserts the hero card's computed margin-top is 0.
13. **Dock scroll shadows.** `#particle-readouts` paints CSS-only scroll shadows (the background-attachment local/scroll pair) so a soft dark edge plus a faint cyan glow appears wherever more cards sit above or below the visible part of the dock. Verified visually at scroll top and scrolled (scratch/particle-layout/variant-dock-scrolled.png).
14. **Dock hint** now says the dock always sits below the chamber on narrow screens, because the position select still shows the saved side preference there.
15. **WCAG harness** beforeAll (Chromium launch) got a 60 s budget; a cold launch exceeded vitest's 10 s hook default and skipped all 26 cases.
16. **Variant capture script** scratch/particle_capture_variants.mjs (run with `node`) screenshots five layouts the suite measures but never captures: mobile 390, dock below, dock left + wide, collapsed with the status line, and a scrolled dock. All five were inspected and look right.

## Fifth enhancement pass (2026-09-05)

17. **Reading and focus order follow the dock placement.** The viewport and dock nodes are hoisted into `particleViewportNode` / `particleReadoutsNode` (keys `viewport` / `readouts`) and the workspace is built with `h.apply(...)` so a LEFT dock precedes the chamber in DOM order (WCAG 1.3.2 / 2.4.3). React moves the existing nodes; the canvas element and its WebGL context are preserved (asserted in both suites).
18. **`stageNarrow` state** mirrors the CSS container query: a ResizeObserver on `#particle-stage` sets it when the stage is <= 760 px wide (0 px, i.e. unmeasured in jsdom or a hidden tab, counts as wide). It drives the DOM order (a narrow stage keeps the chamber first because the dock is forced below), hides the Width select there, and shows a "shown below on this screen" note beside the position select so the saved side preference is not confusing on a phone. `#particle-workspace` also carries `data-narrow`.

## Sixth enhancement pass (2026-09-05): phone fullscreen

Captured immersive fullscreen on a phone for the first time (portrait 390x844, landscape 844x390, landscape with Conditions open, portrait with UI hidden) and fixed what the captures showed:

19. **Portrait heading clipped mid-row.** The quality toggle pushed the fullscreen heading to a third row inside its 16vh cap. In a narrow stage (container <= 760px) the heading now shows only the preset row (`#particle-preset-row`); the note and quality group are hidden. Presets still switch; quality is available outside fullscreen.
20. **Dock strip was mostly hint text.** The dock's how-to paragraph (`.particle-dock-hint`) is hidden in fullscreen, so the strip below the chamber shows a real card.
21. **Secondary controls cut off mid-button.** In phone fullscreen (narrow stage OR viewport height <= 500px) `#particle-secondary-row` becomes ONE horizontally scrolling row (nowrap, thin scrollbar, camera group nowrap), and an open "Visual overlays" disclosure lays out inline instead of stacking under its summary. The controls container cap is 30vh. Net effect: the chamber in portrait grew from ~250px to ~545px tall.
22. The immersive browser cases assert: hint hidden; on phones the row and the container have no vertical overflow and the quality group is hidden; presets hidden only on short viewports; on desktop the quality group stays.
23. scratch/particle_capture_variants.mjs now has the four immersive variants and prints layout metrics for them.

## Seventh enhancement pass (2026-09-05): host themes, screenshotted

24. **High contrast made the 3D chamber a black void.** The host rule `.theme-contrast [class*="bg-"] { background-color:#000 !important }` matched the chamber's two decorative overlay divs (`bg-[radial-gradient(...)]` vignette and the `bg-gradient-to-r` top line) and painted an opaque black sheet OVER the canvas. axe passed (nothing to measure) and every geometry check passed (the canvas was there, just covered). Fix: `.theme-contrast #particle-viewport > [class*="bg-"] { background-color: transparent !important }`. Any STEM tool with a decorative `bg-*` overlay above a canvas has the same bug.
25. **Pale gradient cards under yellow ink.** The Investigation prompt and Tracer walk notebook cards keep their `bg-gradient-to-br from-cyan-50/yellow-50` background-image while the theme turns their text yellow (axe cannot rate gradients). Fix: `.theme-contrast #particle-lab-root [class*="bg-gradient"] { background-image: none !important }` so the theme's black ground takes over.
26. New browser case "keeps the 3D chamber visible ... high-contrast": mounts the contrast theme, asserts the overlays are transparent and every gradient card has no background-image, then RUNS the simulation and samples the viewport screenshot for lit pixels (> 0.5% bright), so a covered canvas fails.
27. Dark theme on the host's white card was captured too (scratch/particle-layout/variant-theme-dark-hostcard.png) and looks right: white cards with dark ink around the dark stage.
28. Capture script gained `theme`, `hostCard`, `fullPage` variant flags and an `ONLY=<substring>` env filter.

## Eighth enhancement pass (2026-09-05): dialog placement

Captured six more unseen states (keys dialog at 1440 and 320, portrait fullscreen with Conditions open, WCAG text-spacing override at 1440 and 390, plain 320). Five were clean. One was not:

29. **Keyboard shortcuts dialog cut off.** The overlay was `absolute inset-0` inside the stage, so the dialog was centred in the STAGE (1450-1535 px tall on phones, 928 px on desktop), not the viewport. Measured before the fix: at 320x568 the dialog ran from y=248 to 959 in a 568 px viewport; at 1440x900 from 414 to 1024. The last rows (H, D, ?, Esc, pointer note) were off-screen even on desktop. The overlay is now `fixed inset-0` with inline `zIndex: 99990` (same value the immersive stage uses, and an inline style because arbitrary z classes may not be in the compiled bundle). After: 320 -> 16..552, 390 -> 102..742, 1440 -> 145..755, all inside the viewport; the 320 case scrolls inside the dialog.
30. New browser cases "opens the keyboard shortcuts dialog fully inside a $width by $height viewport" at 320x568 and 1440x900: scroll to the Keys button, open, assert the dialog box is within the viewport and focused, that the desktop dialog needs no inner scroll, and that Escape closes it and returns focus to the opener.
31. scratch/particle_probe_keys.mjs measures the dialog box at three sizes; scratch/particle_capture_variants.mjs gained `keys` and `textSpacing` flags.

## Ninth enhancement pass (2026-09-05): visual polish, verified at 3x zoom

Added scratch/particle_zoom.mjs, which screenshots small details at deviceScaleFactor 3 (dock top edge, dock bottom edge, essential bar) with a `LABEL=before|after` env var. Two problems were only legible at that magnification:

32. **The dock scroll cue from pass four did nothing.** The `background-attachment: local/scroll` shadow technique paints on the element's own background, but the readout cards are OPAQUE and scroll over it, so the shadow was completely hidden. The before/after zooms show a hard card cut versus a real fade. Replaced with a mask over the content: a `data-scroll` attribute (`none|up|down|both`) is set from a scroll listener plus a ResizeObserver, and `mask-image` fades whichever edge has more cards. The effect has no dependency array on purpose, because the card count changes with trace, probe and preset, and it only sets an attribute (no re-render).
33. **"Readouts" and "Width" were bare words wedged between buttons.** The dock's controls (collapse toggle, position select, width select, narrow-screen note, and the collapsed status line) are now wrapped in `.particle-dock-cluster`, one bordered panel with its own ground, and `.particle-dock-label` is a 10px uppercase caption so the words read as field labels. The bar now has a clear rhythm: Run, then the dock cluster, then Fullscreen and Hide UI. Collapsed it reads `[Show readouts | 239 K · 64 particles · paused]` inside the cluster. Cluster height is unchanged (`padding: 0 8px` around the 44px controls).
34. **High-contrast override for the cluster.** It paints its panel from this stylesheet, so the host's blanket `[class*="bg-"]` blackening never sees it; it would have stayed navy blue in high contrast. It is now black with a yellow border, verified in the contrast capture.
35. New browser case "fades the dock edge that has more cards beyond it": asserts the fixture actually overflows, then that the flag is `down` at the top, `both` in the middle, `up` at the bottom, and that a gradient mask is applied.

## Tenth enhancement pass (2026-09-05): control row grouping

36. **The control row was ~20 loose buttons.** Only the speed and camera sets were boxed; everything else floated. The row's logical sets are now wrapped in `.particle-control-group` panels styled to match those two (4px padding, 8px radius, slate-900 on slate-700), each a `role="group"` with a name: **Playback** (Step, Reset), **Particle tracer** (Trace, New walk, Save walk), **Scene overlays** (Visual overlays disclosure, Gravity). Speed and Camera views keep their existing groups. The row gap went from 8px to 12px so the panels separate. This is a screen-reader win too: twenty unstructured buttons became five named groups.
37. Phone fullscreen keeps its single scrolling row: the new groups are added to the `flex-wrap: nowrap` rule alongside the camera group, and high contrast blackens them with the dock cluster.
38. **Scroll-cue effect churn.** It had no dependency array, so it detached and reattached the listener and rebuilt the ResizeObserver on every render. Split in two: attach once per dock mount (`[showHud]`), and a separate no-dep effect re-measures via a shared `measureReadoutScroll` helper. Behaviour is identical; neither triggers a re-render.

## Eleventh enhancement pass (2026-09-05): Label in Name, and a camera control that lied

39. **Ten WCAG 2.5.3 (Label in Name, Level A) failures.** Buttons whose `aria-label` did not contain their visible text, so voice control users saying what they see could not activate them: Hide UI, New walk, Save walk, Keys (?), Hero ("Overview camera view"), Close ("Detail camera view"), Follow tracer ("Enable tracer follow camera"), Heat B +80%, Cool B -45%, and Collect membrane evidence. Every accessible name now starts with the visible text and then adds the description; the two toggles that only needed a state description drop the label entirely and rely on their visible text plus `aria-pressed`. **axe never flagged these**: its `label-content-name-mismatch` rule is experimental, so the WCAG harness's `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa` tag filter excludes it.
40. **Showcase camera was a control that lied.** The runtime already suppresses the orbit under reduced motion (`controls.autoRotate = ... && !reducedMotion`), but the button still latched on, reported `aria-pressed="true"`, showed as the active camera view and persisted, while nothing moved. It now matches Follow tracer: disabled under reduced motion with an explanatory name, the C shortcut announces that it is unavailable instead of toggling, and a persisted `autoCamera: true` no longer restores into a reduced-motion session.
41. New browser case "keeps every visible control label inside its accessible name (WCAG 2.5.3)" walks every button, summary and `role="button"` in the tool and fails on any accessible name that does not contain the visible text. scratch/particle_probe_labelname.mjs is the standalone version. **Normalize BOTH sides the same way** or a name containing "0/5" looks like a mismatch against a visible "0 5".
42. Tests and capture scripts that addressed controls by their old accessible names were updated (Hide UI, Show controls (H), Keys).

## Twelfth enhancement pass (2026-09-05): unavailable controls could not explain themselves

43. **Four `disabled` buttons carried a reason nobody could reach.** A `disabled` button leaves the tab order, so Save walk ("available after the first particle collision"), Showcase camera and Follow tracer ("unavailable because reduced motion is preferred") and Collect membrane evidence ("until both species have at least five membrane encounters") showed as greyed out with no way for a keyboard, screen-reader or voice-control user to find out why. All four now use `aria-disabled="true"` instead: they stay focusable, their handlers no-op and announce the reason, and the faded look is painted from the tool's own stylesheet (the `disabled:` Tailwind variants stop firing once the attribute is gone). The tool now has zero hard-disabled buttons.
44. **The shortcuts modal does trap Tab** (probed, `scratch/particle_probe_focus.mjs`): focus cycles inside the dialog and Escape returns it to the opener. No change needed, but the probe is there for the next dialog.
45. New browser case "keeps unavailable controls reachable so their reason can be read": every `aria-disabled` button must be focusable, not hard-disabled, visibly faded, and carry a real explanation; the tool must have no `button:disabled` at all; and activating one must not latch. Note Playwright's own actionability refuses to click an `aria-disabled` element, which is a useful confirmation in itself, so the case drives it with `dispatchEvent`.

## Thirteenth enhancement pass (2026-09-05): the tool talked over itself

46. **The chamber activity card narrated the physics.** `#particle-stage-activity` was `role="status" aria-live="polite"` while its detail line carried running metrics ("A on solution side 50% • B leak 0%"). Measured with scratch/particle_probe_live.mjs: nine live-region text changes in six seconds of running simulation, six of them that card, so a screen reader re-announced a full sentence roughly once a second for as long as the simulation ran, drowning out everything else. It is no longer a live region; run and pause were already announced deliberately in `toggleRun`, and the visible text is unchanged and still readable on demand. Re-measured: zero live-region changes in six seconds, one deliberate announcement.
47. New browser case "does not narrate the running simulation through a live region": asserts the activity card carries no `aria-live` or `role`, then watches every live region through five seconds of a running simulation and fails any that changes more than three times. Milestone transitions stay allowed; ticking with the physics does not.

## Fourteenth enhancement pass (2026-09-05): saved data was trusted blindly

Audited every persisted key against every key read back on load. Persistence itself was sound (the apparent write-only/read-only mismatches were all my regex missing computed patches like `patch[field] = value` and `persist(Object.assign(...))` — worth knowing before treating such a diff as a finding). Two genuine gaps came out of it:

48. **An unknown saved preset crashed the render.** `presets.filter(p => p.id === preset)[0].note` throws if the id is not one of the five, and `bucket.preset` was restored verbatim. A bucket from an older build, a corrupted save or an imported one blanked the tool. Restores are now validated: `restoreOneOf` for `preset`, `quality`, `cameraView`, `membraneSelectivity` and `timeScale`, and `restoreNumber` (clamped to each slider's real range) for `temperature` 40-900, `count` 24-120, `boxSize` 7-18, `attraction` 0-1.5, `gravity` 0-2 and `permeability` 0-1. `particleDiameter` and `massRatioB` were already clamped, so the class was half-recognised. The lookup itself also falls back to the first preset now. **An out-of-range `count` mattered most: it feeds the particle loop and geometry allocation directly.**
49. **The camera view never persisted.** `bucket.cameraView` was read on mount but nothing ever wrote it, so a student's chosen framing reset on every return while every other view preference survived. `setCameraShot` now persists it.
50. New jsdom cases: "survives a stale or corrupt saved bucket instead of rendering it" (renders with a hostile bucket, asserts temperature clamps up to 40 K, count clamps down to 120, and exactly one real preset ends up selected) and "remembers the chosen camera view".

## Fifteenth enhancement pass (2026-09-05): the tool leaked its WebGL context

51. **`renderer.dispose()` does not release the context.** The scene teardown disposes every geometry, material, the controls and the renderer, so it looked complete. It is not: the context stays alive until the canvas is garbage collected. Measured with scratch/particle_probe_contexts.mjs over twenty mount/unmount cycles in one page: `WARNING: Too many active WebGL contexts. Oldest context will be lost.` Chromium caps concurrent contexts at about sixteen and this lab has roughly twenty 3D tools, so a student moving between them gets an earlier tool's context force-lost, and that tool paints black on return. Fixed with a `rendererRef` plus a mount-scoped effect whose cleanup calls `dispose()` then `forceContextLoss()`. After the fix the twenty cycles produce no such warning.
52. **The trap in that fix:** it must NOT live in the scene effect, whose cleanup also runs on every preset, quality, count and reset change (the scene is rebuilt on the same canvas). Losing the context there would leave a black chamber while every geometry assertion still passed. Verified both ways with scratch/particle_probe_rebuild.mjs, which samples lit pixels after a preset change, a quality change and a reset.
53. New browser case "keeps painting after the scene is torn down and rebuilt" (lit-pixel sampling across two rebuilds) and source contract "releases the WebGL context on unmount, and only on unmount" (checks the release sits in a `}, []);` effect).

## Sixteenth enhancement pass (2026-09-05): surviving a lost context, and how far the leak spreads

54. **A lost context was permanent.** The chamber had no `webglcontextlost` handling, so once the browser took the context away the chamber went black for good with no message and no way back. That is not hypothetical: the browser drops a context on a GPU reset, and on the ~16 context cap that pass fifteen measured. The canvas now listens for `webglcontextlost` (calling `preventDefault()`, which is what makes restoration possible at all) and `webglcontextrestored`. On loss the scene parks, an alert overlay explains what happened and offers **Rebuild**; on restore the scene rebuilds itself.
55. **It needed its own state, not `ready`.** Reusing `ready` would have fought the loader effect, whose first line is `if (ready) return;` — flipping `ready` false makes it immediately resolve (Three.js is already loaded) and set `ready` true again, wiping the message and rebuilding on a still-dead context. A separate `contextLost` flag gates the scene effect instead, and the listeners are mount-scoped so they outlive the parked scene effect.
56. New browser case "recovers when the browser takes the WebGL context away": takes the context with `WEBGL_lose_context`, asserts the alert and the Rebuild button appear, restores it, and samples lit pixels to prove the chamber paints again instead of staying black.
57. **Lab-wide exposure, NOT fixed here.** Of the 30 tools in `stem_lab/` that create a `THREE.WebGLRenderer`, **17 never call `forceContextLoss`**: anatomy, aquaculture, aquarium, beehive, brainatlas, cephalopodlab, dinolab, echolocation, echotrainer, flightsim, geologyexplorer, geometryworld, magnetism (six renderers), molecule, moonmission, pets and solarsystem (two renderers). Those belong to other lanes, several with uncommitted work, so this pass only surveyed them. The fix and its trap are written up in the memory note `feedback_webgl_context_not_released_on_unmount`.

## Seventeenth enhancement pass (2026-09-05): the skip link went nowhere, plus two clean bills of health

58. **The "Jump to the 3D particle chamber" skip link did not move focus.** `#particle-stage` is a `<section>` with no `tabindex`, so activating the link scrolled but left `document.activeElement` on `<body>` (measured, scratch/particle_probe_skiplink.mjs). A screen-reader user was never delivered to the chamber, and Tab afterwards only continued sensibly because Chromium happens to move the sequential focus navigation starting point — behaviour other browsers do not guarantee. The stage now carries `tabIndex: -1`, so the link focuses it and its `aria-label` ("Three-dimensional particle simulation") is announced; the next Tab continues inside the stage. New browser case "moves focus to the chamber when the skip link is used".

Two things were checked and found sound, recorded so nobody re-investigates:

59. **No unbounded growth in a long run.** The evidence history is capped with `.slice(-36)` and each particle's `freeFlights` buffer shifts above 32 entries.
60. **The kinetic-theory comparison shown to students is honest.** `meanFreePathEstimate` computes V / (√2 · (N−1) · π · d²), which is the standard λ = 1/(√2·n·σ) with σ = πd² (using N−1 scatterers, slightly more correct than the textbook N), and the simulation collides at centre separation < `particleDiameter` — the same d the formula uses. Theory and measurement are therefore consistent, so the tool's "agreement" verdict is not comparing mismatched quantities.

## Eighteenth enhancement pass (2026-09-05): target sizes on desktop

61. **Ten targets were under the 24 by 24 minimum (WCAG 2.2 SC 2.5.8, Level AA).** Measured at 1440px with scratch/particle_probe_targets.mjs: the eight sidebar range sliders rendered 16px tall, and the two thermal-pulse buttons (Heat B +80%, Cool B -45%) were 23px. **The WCAG harness never saw this** because it renders at 320px only, where the `min-h-11` utilities apply; desktop drops to `sm:min-h-6`, and these controls had no minimum at all. Fixed in the tool's scoped stylesheet: `input[type="range"]` gets `min-height: 24px` (clicking the track actuates the control, so the whole input is the pointer target) and a `.particle-pulse-button` class gives the two buttons the same floor. Re-measured: zero targets under 24 by 24.
62. New browser case "meets the 24 by 24 minimum target size on desktop (WCAG 2.5.8)" walks every button, link, select, summary and range input at 1440px and fails any under the minimum. Mobile and contrast layouts were recaptured to confirm the extra 8px per slider changes nothing visually.

## Nineteenth enhancement pass (2026-09-06): the copy button could not work where AlloFlow runs

63. **"Copy complete lab report" called `navigator.clipboard.writeText` directly.** Gemini Canvas, the surface AlloFlow actually runs in, refuses that API by permissions policy, so the call rejects on **every** click there while passing every test on a normal origin. The student loses their whole written investigation report. It now routes through `window.alloCopyText` (the shell's clipboard-then-execCommand helper that exists for exactly this reason), with an inline `execCommand` fallback for standalone pages, run synchronously inside the click so it keeps the transient activation. The failure toast now tells the user to select and copy manually instead of just saying it failed.
64. New jsdom case "copies the lab report through the shell helper, not the raw clipboard API": asserts the helper receives the report text, then removes the helper and asserts the `execCommand` fallback fires and cleans up its scratch textarea.
65. **Lab-wide exposure, NOT fixed here.** 43 of the tools in `stem_lab/` call `navigator.clipboard.writeText` directly and only 3 of those reference `alloCopyText` at all. Every one of those copy buttons fails in Canvas. Those files belong to other lanes, so this pass only counted them. See the memory note `feedback_canvas_clipboard_route_through_allocopytext`, which already documents the rule.

Two more clean bills of health from this pass:

66. **Focus indicators.** Every focusable control in the tool changes its computed appearance on focus (scratch/particle_probe_focusring.mjs walks buttons, links, selects, summaries, inputs and textareas). WCAG 2.4.7 is satisfied; axe does not check this.
67. **Touch scrolling.** The chamber captures drags for camera orbit, but on a 390px phone the workspace is 610px inside an 844px viewport, so there is always non-canvas area to scroll from and the page is never trapped.

## Twentieth enhancement pass (2026-09-06): the untested recovery path, and a clean sweep of the repo's own gates

68. **The engine-load failure path had never been exercised.** Every other browser case injects `three.min.js` before the tool, so `ready` starts true and `StemLab.ensureThree` is never called — meaning the error state, its message and its Retry button were shipped untested, on exactly the path a school network filter produces (which is what the message itself describes). New browser case "offers a working Retry when the 3D engine cannot load" builds its own page, stashes `window.THREE` away so the tool must go through the loader, fails the first attempt, and asserts: the alert says the engine is unavailable, the stage stays `aria-busy="true"`, the dead canvas is not tabbable, then Retry triggers a second loader attempt, clears the alert, and leaves the canvas focusable with the stage ready. It passes — the path works, it simply had no cover.
69. **The repo's own scanners are clean on this tool**, recorded so nobody re-runs them: `check_free_vars` (no free variables — note the gate only checks files handed to it, so pass the path explicitly), `scan_canvas_var_colors` (no hits for this tool), `check_css_template_literals`, `check_aria_handler` (104 string-attribute sites clean).
70. **The replay timer is cleaned up** (`clearTimeout` in the effect's return), so no stray timer can fire after unmount.
71. `tests/particle_lab_3d_layout_browser.test.js` is covered by the default runner: `vitest.config.js` includes `tests/**/*.test.js`. It is still UNTRACKED, so **it protects nothing until it is committed**.

## Twenty-first enhancement pass (2026-09-06): the AI coach could strand the student

72. **A hung coach request left the button disabled forever.** `requestLabCoach` was otherwise well built — it guards re-entry, catches errors, falls back to the built-in coach and clears its flag in a `finally`. But it `await`ed `ctx.callGemini` with no time limit, and the Ask lab coach button is `disabled` while `isCoaching` is true. A request that never settles (a stalled network, a throttled backend) therefore left the student looking at "Coach is thinking…" with no way to retry. The call is now raced against `COACH_TIMEOUT_MS` (20 s) which resolves empty, and the existing "no usable AI answer" branch turns that straight into the built-in coach.
73. New render cases "still coaches the student when the AI call fails" and "…when the AI returns nothing usable" mount with an injected `aiHintsEnabled` context and a failing or blank `callGemini`, then assert the built-in coaching text appears and the button is enabled again. A source contract pins the race and the `finally`; the never-settling case has no behavioural test because it would need fake timers wrapped around React, and that is stated in the test itself rather than left implied.

## Twenty-second enhancement pass (2026-09-06): the second door into the simulation, and a slider that lied

74. **Restoring a saved trial bypassed the validation added in pass fourteen.** Trials live in the same persisted bucket, and `restoreTrial` fed `trial.count`, `trial.boxSize`, `trial.temperature`, `attraction`, `gravity`, `permeability`, `massRatioB` and `particleDiameter` straight into the setters, plus `trial.preset || 'gas'`. A stale or corrupt trial was therefore a second door for exactly the values pass fourteen closed at the front door. All eight now go through the same `restoreOneOf` / `restoreNumber` helpers with the same ranges.
75. **The chamber-size slider shipped with two different ranges.** The sidebar control was `min 8 / max 15` and the fullscreen conditions control `min 7 / max 18`, both bound to `boxSize`. A student who set 16, 17 or 18 in fullscreen saw the sidebar slider report 15 afterwards while the simulation ran at the real value; 7 behaved the same way at the bottom. Found while writing the trial test, which restored a clamped 18 and got 15 back. Both are now 7 to 18, the range that was already reachable and persisted.
76. New render case "clamps a stale saved trial when it is restored" (restores a deliberately corrupt trial and asserts each control lands in range with a real preset selected), and a generic source gate "exposes one range per chamber setting, not two" that groups every `min/max/value:` slider declaration by the state it drives and fails if any state has more than one range.

## Twenty-third enhancement pass (2026-09-06): rebuild races, and closing the range gate properly

77. **The range gate now compares `step` as well as min and max.** Two controls for one setting must also move in the same increments, not just span the same bounds. All eight sliders currently agree.
78. **Rapid rebuild churn is safe, and now gated.** Preset, quality and reset each tear the scene down and rebuild it on the same canvas while an animation frame is in flight — and clicking faster than a rebuild takes is ordinary student behaviour. Hammered 18 times in a probe: no page errors, chamber still painting. New browser case "survives rapid preset, quality and reset churn while running" does 8 rounds, then samples lit pixels and asserts the canvas node was never replaced. This is the case that would catch a future change to the teardown, or to where the WebGL context is released, turning the chamber black.
79. That case needed a 120 s budget rather than the usual 60 s: it is a real interaction sequence plus a pixel sample, and it timed out at 60 s while the CPU was saturated by other sessions.

## Validation status

Latest (2026-09-06, after the twenty-third pass):
- accessibility + render a11y (jsdom): 57/57 pass (scratch/particle-enh23-jsdom.log).
- layout browser suite: 21/21 pass (scratch/particle-enh23-browser.log).
- WCAG harness particle cases: 4/4 pass (scratch/particle-enh23-wcag.log).

Previous (after the twenty-first pass):
- accessibility + render a11y (jsdom): 55/55 pass (scratch/particle-enh21-jsdom.log).
- layout browser suite: 20/20 pass (scratch/particle-enh21b-browser.log). The first attempt lost three cases to 60 s timeouts while the CPU sat at 100% with a dozen foreign node processes; the rerun passes on the same source, in 318 s rather than the usual ~135 s.
- WCAG harness particle cases: 4/4 pass (scratch/particle-enh21-wcag.log).
- Two earlier attempts at the jsdom pair failed with 5 s test / 10 s hook timeouts on tests that normally run in well under a second. That is CPU load from other sessions, not a regression; both files pass together on the same source.
- The first attempt at all three (scratch/particle-enh17-*.log) failed with `[vitest-pool-runner]: Timeout waiting for worker to respond` and a skipped WCAG file. That is worker startup under CPU load, not a regression — the reruns above pass on identical source.

Previous (after the twelfth pass):
- accessibility + render a11y (jsdom): 48/48 pass (scratch/particle-enh12-jsdom.log).
- layout browser suite: every case passes on the current source. The full run (scratch/particle-enh12-browser.log) was 13/14 with the native fullscreen case timing out at 60 s while the CPU sat at 100%; the rerun of that case passed (scratch/particle-enh12b-native.log).
- WCAG harness particle cases: 4/4 pass (scratch/particle-enh12b-wcag.log). The first run's four cases also passed but the file still exited non-zero because the afterAll Chromium close hook timed out at 30 s under the same load; that teardown budget is now 60 s, matching the startup hook.
- An earlier run of the same three suites (scratch/particle-enh10-*.log) failed 9 cases while the machine sat at 100% CPU with 14 foreign node processes. Every failure was a hook/test/waitForSelector TIMEOUT, not an assertion; the reruns above pass on the same source. Check the failure reason before assuming a regression here.
- The scroll-cue case read `data-scroll` immediately after setting `scrollTop`, but the scroll event is asynchronous, so it failed once. It now waits for the flag (`page.waitForFunction`) and reports the value it actually saw; three consecutive solo runs passed before the full run.
- Source and mirror byte-identical; node --check and git diff --check clean. scratch/ is not git-ignored, so the capture script and PNGs show as untracked; they are not deliverables.

After the second enhancement pass (machine at 100% CPU from other sessions' vitest runs):
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

1. Molecule lab dark theme contrast (see above) belongs to that tool's owner.
2. Commit by pathspec (the six files above) when Aaron asks; do not deploy unasked.
3. Not started: this tool has no ctx.t calls at all, so the new dock strings are English-only like the rest of it; localise with the tool if it enters the i18n lane.
