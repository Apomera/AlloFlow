# Claude handoff: Tree Life Labcument.

It includes implementation details, file locations, test results, remaining checks, scientific boundaries, and a ready-to-use continuation prompt. All changes remain local and uncommitted.


Edited 4 files
+321
-0
.tmp/tree-review/grove-3d-ui.txt
.tmp/tree-review/
grove-3d-ui.txt
+60
-0
tests/tree_lab_grove_scene.test.js
tests/
tree_lab_grove_scene.test.js
+31
-0
tests/e2e/treelab-grove-3d.spec.ts
tests/e2e/
treelab-grove-3d.spec.ts
+105
-0

Show 1 more file
9:19 PM




Environment

Changes

Local

Commit or push

Sources
Codex App Tools
Chrome DevTools MCP server
Web search

View all
UDL-Tool-Updated
docs


Prepared September 4, 2026 at the user's request to conserve quota. Continue from the existing files; do not rebuild the feature from scratch.

## Immediate context and user intent

The user asked for repeated improvements to Tree Life Lab's engagement, pedagogy, visuals, intuitiveness, and simulation quality. They approved exploring and implementing an optional grove survival/reproduction campaign with preset events and a second generated-event mode. They also considered trait/adaptation cards, GMO experiments, emerald ash borer, and old-growth forests, while explicitly worrying about misconceptions about evolution.

The most recent feature request was: **“please keep enhancing. Does this have 3d visuals as well?”** The single-tree lab already had real 3D. This pass added an optional real 3D close-up to Grove Journey. The whole-grove habitat map remains 2D. The latest instruction is to prepare this handoff for Claude; implementation work has been paused for that handoff.

Work is local, uncommitted, and not deployed. Do not deploy or commit unless requested. The repository has a very large number of unrelated modified and untracked files, including the root `AGENT_HANDOFF.md`; preserve them. This separate document avoids overwriting that handoff. Only touch Tree Lab files, related tests, and related documentation. No subagents were authorized for this work.

## Workspace and important files

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` (PowerShell).

- Source: `stem_lab/stem_tool_treelab.js`.
- Desktop public mirror: `desktop/web-app/public/stem_lab/stem_tool_treelab.js`. Keep these byte-identical.
- Initial review: `docs/tree-life-lab-engagement-review-2026-09-04.md`.
- Passes 1–5 and their validation: `docs/tree-life-lab-improvements-2026-09-04.md`.
- Campaign proposal: `docs/tree-life-lab-grove-campaign-concept-2026-09-04.md`.
- Delivered campaign, biological assumptions, references, and future scope: `docs/tree-life-lab-grove-implementation-2026-09-04.md`.
- New campaign units: `tests/tree_lab_grove.test.js` (13 tests).
- New 3D units: `tests/tree_lab_grove_scene.test.js` (4 tests).
- Campaign browser workflows: `tests/e2e/treelab-grove.spec.ts` (2 tests).
- New 3D browser workflows: `tests/e2e/treelab-grove-3d.spec.ts` (2 tests).
- Existing discovery, evidence, physiology, and other Tree Lab suites are also present. Use `rg --files tests` with a tree/treelab filter to locate them, rather than guessing filenames.
- Browser harness: `tests/e2e/helpers/stem_gl_harness.ts`; unit harness: `tests/helpers/stem_widgets_smoke_harness.js`.
- Captures and logs: `.tmp/tree-review/` (local artifacts, not necessarily tracked).

No applicable `AGENTS.md` or `.openai/hosting.json` was found during earlier checks. Re-check if your environment or instructions differ.

## Completed earlier improvements

The guided lab now includes prediction, fair paired drought trials, evidence, reflection, recovery, and milestones, with simpler K–2 presentation. Root uptake relative to canopy demand and shade response were made consistent across live growth, annual updates, and trials. Carbon maintenance and allocation tradeoffs remain visible. These are teaching models, not empirically calibrated predictions.

Food-balance evidence uses a shared signed scale, optional numerical detail, and preserved historical results. Responsive/sticky layout was corrected for tablets, short windows, and expanded guides. Existing 3D woodland, hills, grass opacity/tint, foliage fill lighting, and reduced-motion pose reuse were refined. Read the improvements document before changing these systems.

## Grove Journey: already implemented

- Optional `grove` tab; an eight-year campaign across nine named habitat patches.
- Founders: 40-year oak in patch 0, 25-year aspen in patch 4, four-year aspen in patch 6, grown with the existing engine under stated favorable conditions. Each tree has its own reproductive carbon budget.
- Three annual allocation cards: roots, reserves, offspring. These are resource-allocation presets, not gene changes or an assertion that trees collectively plan.
- Authored event deck (gentle/rain/drought/storm) and deterministic bounded procedural weather. Generated weather is **not AI-generated**; no external generation service is called. First year is gentle; consecutive drought years are excluded in this introductory scenario.
- Weather, storm location, dispersal, and establishment use independent keyed random draws. A code plus mode and choices reproduces the same run; changing attempt count cannot reroll weather.
- Annual updates call existing `simulateYear` once per previously living tree. New offspring arrive after the annual update and do not age/reproduce in their birth turn.
- Offspring priority can trigger at most three attempts per mature tree. Oak maturity 20 and aspen maturity 10 are labeled scenario assumptions. Oak uses animal-dispersed seed; aspen uses local shoots or wind seed according to route. Carbon is charged once per attempt; `seedsBanked` is carbon, not a literal seed count.
- Establishment depends on route, moisture, light, and capacity. Maximum three living trees per patch, 27 total. Aspen shoots retain clone-group identity and disperse locally. Seed identity does not prove measured genetic independence.
- Storms target one of the founding canopy patches independently of player decisions; living foliage is required to open a new gap. A gap adds 0.18 light, capped at one, and persists through the run.
- Success: after eight years, living established descendants occupy at least two patches. Establishment requires surviving beyond arrival year; a lineage may survive its parent.
- Forecasts, outcome receipts, keyboard patch controls, selected-patch details, a persistent field journal, rewind/replay, and setup are implemented.
- Saves contain version, seed, mode, and at most eight choices, reconstructed by deterministic replay. Lab tree and experiments are separate; the lab clock pauses while in the grove.

Important boundaries: no shared soil-water competition, actual genetic variation, network carbon exchange, invasive-species mechanics, or old-growth dynamics. The UI explains those limits. Future evolution should model existing heritable variation and differential survival/reproduction over appropriate generation times, not need-driven mutations or upgrades to an adult tree. Artificial selection and genetic engineering should be distinct optional experiments. Emerald ash borer requires an appropriate host scenario; the oak/aspen grove does not simulate it. Old growth requires forest-specific structural habitat and regeneration, not merely an age counter. See the campaign implementation document for cited background and suggested future scope.

## Latest change: campaign 3D close-up

This is implemented in both source and mirror, not merely a mockup:

- **Habitat map / 3D close-up** pressed-button switch above the map; map remains the default.
- A selected-patch action also opens its trees in 3D.
- Patch and individual-tree selectors, species/age/height/diameter, camera rotate/tilt/zoom/reset buttons, and leaves/trunk/roots inspection.
- Rendering follows the actual selected campaign individual and local conditions. Empty patches explain the absence of trees without showing a fabricated specimen.
- `groveSceneState(state, patch, requestedId)` selects the requested individual within the patch, otherwise a living tree then a dead tree; empty patch returns null. It uses the last completed event, or starting conditions at year zero, rather than the next forecast. It derives the existing summer visual state without mutating the run. Exported through `window.__alloTreeLabEngine`.
- Existing module-level `TREE3D` / `StemLab.makeBayViewer` is reused, with stable `GROVE_3D_ATTACH` and `GROVE_3D_SUBJECT`. One canvas is reused during growth and tree changes; changing to map or an empty patch releases it. Returning to Grow restores the independent lab tree.
- Grove-specific selected part and viewer status are separate from lab state (`grovePart`, `groveViewerStatus`). UI state also uses `groveView` and `groveTree`.
- A summer illustration is explicitly labeled. Background woodland is scenery; the map records the actual grove. Roots are a schematic cutaway, not reconstructed root architecture. Inspecting does not advance time.
- Failed 3D rendering keeps map navigation and measurements available, with camera buttons disabled.
- Theme tokens, high contrast, reduced motion, and phone layout are supported. This does not add a full 3D whole-forest view or new fullscreen functionality.

Useful search anchors: `groveSceneState`, `GROVE_3D_SUBJECT`, `GROVE_3D_ATTACH`, `function viewGrove`, `grove-closeup`, `Campaign tree in 3D`.

## Validation actually completed

Earlier passes recorded 197 existing focused unit tests passing. Campaign work then passed all 13 additional tests, for 210 unique focused units across those completed runs. Do not imply all 210 were rerun for the latest 3D change.

Latest focused command:

```powershell
npx vitest run tests/tree_lab_grove.test.js tests/tree_lab_grove_scene.test.js --maxWorkers=1 --testTimeout=30000 --reporter=dot
```

**17 tests passed across two files**, including the new failed-3D-host fallback test. Final log: `.tmp/tree-review/grove-3d-unit-verified.txt`. This final run emitted a React missing-list-key warning while server-rendering the 3D fallback. It is not a failing assertion; it remains a small cleanup item. Likely inspect the section returned by the close-up render function, currently `h('section', { className: 'grove-closeup', ... })`, when it is inserted into an array. Confirm the ownership before applying a key.

Latest browser command:

```powershell
npx playwright test tests/e2e/treelab-grove-3d.spec.ts tests/e2e/treelab-grove.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list
```

**All four browser tests passed**, taking approximately 6.4 minutes. Log: `.tmp/tree-review/grove-3d-browser.txt`.

Coverage includes real campaign tree/condition identity; canvas reuse during growth and selection; empty patch cleanup; restoration of separate lab tree; camera and part controls; full campaign/save/replay; keyboard operation; phone overflow; and zero axe violations in the tested campaign/close-up regions in light, dark, and high-contrast themes. This is scoped automated accessibility coverage, not a complete accessibility certification or learner study.

After the four browser tests, one caption-only fix changed year-zero wording from “last completed year's conditions” to “starting patch conditions.” Both source and mirror were written and syntax checked. The final 17-unit run passed after that change. Browser screenshots have **not** been refreshed after that caption-only fix; do not mistake their old sentence for a source regression.

## Captures reviewed and remaining finish work

Captures: `.tmp/tree-review/grove-3d-oak.png`, `grove-3d-light.png`, `grove-3d-dark.png`, `grove-3d-contrast.png`, `grove-3d-phone.png`. Existing campaign captures also remain there.

Visually inspected: oak, phone, and light. The light capture shows a 25-year aspen with readable selectors, tree measurements, camera buttons, and condition explanations. The phone capture fits without overflow. The oak capture has the roots selection highlight; roots are mostly below ground in the existing scene, so do not claim a detailed exposed root system. Dark and high-contrast screenshots have not yet received manual visual inspection in this pass, although their browser accessibility checks passed.

The feature work is substantially complete. Recommended next steps are deliberately bounded:

1. Resolve the React list-key warning and verify the affected focused test, if continuing code cleanup.
2. Optionally refresh just the theme/phone capture test after the caption fix (see test title in `treelab-grove-3d.spec.ts`, beginning “keeps the 3D close-up accessible”). Manually review dark/high contrast. Do not rerun every historical suite without a reason.
3. Append a sixth-pass 3D section to the improvements document and a 3D section to the campaign implementation document. Those documents currently stop at the initial campaign; this handoff is the authoritative record of the latest 3D pass until updated.
4. Check source/mirror byte equality, JavaScript syntax, and scoped `git diff --check`. They were written together; a final independent mirror/diff check for this last pass has not yet been recorded.
5. Show the user the preview and explain how to find **3D close-up**. Clearly distinguish the 2D whole-grove map from the 3D selected-tree view. No deploy/commit is pending authorization; neither was requested.

Do not expand into genetics, invasive species, AI narratives, or a full 3D forest merely to finish this pass. These remain possible future directions, with the science boundaries above. User testing of tradeoffs, arrival versus establishment, habitat effects, and fair replay is more informative than assuming longer sessions mean learning.

## Local execution lessons

- Run one Playwright suite at a time, and do not overlap browser tests with unit tests. This machine showed severe contention and timeouts under concurrent runs.
- New browser specs use `video: 'off'`, `trace: 'off'`, and Chromium flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; preserve these for reliable local WebGL checks.
- Redirect test logs to `.tmp/tree-review/` when helpful; avoid dumping huge SSR outputs or whole-repository status. Use scoped git paths because the worktree is very busy.
- In this Codex session, default shell reads sometimes failed despite readable workspace permissions. Reviewed `require_escalated` shell calls worked. This is an environment observation, not a requirement to bypass your own permissions.
- Existing-file `apply_patch` sometimes failed on read; an asserted Node text replacement via a PowerShell literal here-string worked. Keep changes narrowly anchored and syntax-check afterward. Node `writeFileSync` for both source and mirror was more reliable than `copyFileSync` on this OneDrive workspace.
- Avoid destructive cleanup, resets, broad staging, or repository-wide formatting. There is extensive unrelated in-progress work.
- No browser verification or code changes were launched after the user requested this handoff. Do not depend on old process/session IDs; use the completed logs above.

## Suggested continuation prompt

“Read `docs/CLAUDE-HANDOFF-TREE-LIFE-LAB-2026-09-04.md` and continue from the current Tree Life Lab implementation. Preserve unrelated changes. Finish the small 3D cleanup/documentation/verification items, then show me the result. Keep evolution, GMO, invasive-species, and old-growth mechanics scientifically explicit and separate if we later expand them.”

## Status update (Claude, September 4, 2026)

All five finish items above are complete. The close-up section is now keyed (`key: 'closeup'`), which removed the React list-key warning; the 13 campaign and 4 scene unit tests pass (17 total, scene file rerun alone after a fork-worker start timeout under contention). The dark/high-contrast/phone browser capture test was rerun after the caption fix and passed; light, dark, high-contrast and phone captures were visually inspected and show the corrected year-zero caption. A sixth-pass section was appended to the improvements document and a campaign 3D close-up section to the implementation document. Source and mirror are byte-identical, syntax passes, and scoped `git diff --check` is clean. Logs: `.tmp/tree-review/grove-3d-unit-keyfix.txt`, `grove-3d-unit-keyfix-scene.txt`, `grove-3d-browser-captures-refresh.txt`. Still local, uncommitted and undeployed.

## Seventh pass (Claude, September 4, 2026, later)

At the user's request to keep enhancing, a seventh pass added: per-year `landings` and `losses` records on receipts with a "Where it happened" list; snag glyphs, patch snag counts and arrival/loss badges on the map; an optional predict-then-check step (`grovePending`, `grovePredictions` in UI state, never in the save format); a completed-run ledger (`groveLedger`, max 12) compared in the ending card and counted in setup; and one explicit scenario rule for dry-patch mortality of trees three years old or younger (`dry_seedling`), added because a 48-world probe showed the campaign never lost a tree. Weather and the save format are unchanged. New tests: `tests/tree_lab_grove_evidence.test.js` (5) and `tests/e2e/treelab-grove-evidence.spec.ts` (1). Both documents carry a seventh-pass section with validation. Logs: `.tmp/tree-review/grove-pass7-*.txt`, `grove-evidence-browser-final.txt`. Search anchors: `whereList`, `predictionCheck`, `ledgerBlock`, `function snag`, `dry_seedling`. Still local, uncommitted, undeployed. Local lesson: vitest fork workers can stall at startup for minutes when many node processes are running; a 500 s foreground budget was not enough once, and the run completed on its own in the background.

## Eighth pass (Claude, September 4, 2026, later still)

Receipts gained `reserves` and `banked` (whole-grove stored food and reproductive savings), shown in the evidence with the year-on-year change. "Where it happened" groups patches with identical outcomes. New discoveries: `young-loss` (engine), `prediction-hit` and `fair-replay` (earned in `saveRun` via the shared `predictionOutcome` helper). The field journal opens with `journeyChart()`, a two-series SVG line chart (living trees, established descendants) whose colour pairs were validated with the dataviz palette checker: light `#059669`/`#b45309` on `#ffffff`, dark `#059669`/`#d97706` on `#1e293b`, high contrast white/yellow; dash and marker shape are the secondary encoding, per-point `<title>` hover, aria-label lists every value, timeline list is the table view. Simulation and save format unchanged. Four unit tests and browser assertions added; all green. Anchors: `journeyChart`, `predictionOutcome`, `'young-loss'`, `key: 'stored'`. Local machine note: under memory pressure vitest fork workers die with "Worker exited unexpectedly" rather than failing tests; rerun the affected file alone and read the per-file counts, not just the exit code.

## Ninth pass (Claude, September 4, 2026)

Forecast risk preview: `dryNext` / `youngAtRisk` computed in `viewGrove`; map buttons get `is-dry-next` + a `grove-patch-dry` chip and ", dry next year" in the label; the forecast card shows a `.grove-risk` paragraph; the selected patch shows next year's moisture. Reflection: `noteField()` inside `ledgerBlock` writes `note` onto the current run's ledger entry via `upd('groveLedger', fn)`; notes appear in the "Other runs" list. Journal `ul`/`ol` list styles restored. Two unit tests and browser assertions added; 24 units + browser green; captures `grove-forecast-risk.png`, `grove-map-dry-next.png`. Local, uncommitted, undeployed.

## Tenth pass (Claude, September 5, 2026)

K-2 wording layer in `viewGrove`: `simple`, `say()`, `priorityName()`, `priorityCopy()`, `eventCopySimple`; 31 `say(` call sites. Facts and structure unchanged. Unit test in `tests/tree_lab_grove_evidence.test.js` (K-2 vs default band on the same loss year) and a second browser test in `tests/e2e/treelab-grove-evidence.spec.ts`; 29 units + 2 browser tests green; captures `grove-k2-decisions.png`, `grove-k2-receipt.png`. Local, uncommitted, undeployed. Largest open item: Grove Journey strings do not go through `__alloT` / the language packs.

## Eleventh pass (Claude, September 5, 2026)

Visuals/engagement/a11y: event icons + titles on `.grove-progress` tiles; glyph scale from `heightM`; `.grove-glyph.is-new` wrapper pop-in (class only when `!reduceMotion`, keyframe also disabled by media query; wrapper has no transform attribute on purpose); `gap` light wedge path `M70 2 L30 86 L110 86Z`; `.grove-patch-water` bar + ", soil N% wet" in labels; `.grove-discovery` status banner in the receipt (engine discoveries earned this year plus a first prediction hit). Two unit tests + browser assertions; 31 units and 2 browser tests green. Local, uncommitted, undeployed.

## Twelfth pass (Claude, September 5, 2026)

Keyboard flow and sharing: `focusLater`, `tabIndex: -1` on setup/forecast/ending h3, `.grove-skip` link to `#grove-decisions`, `.grove-goal-dots`, `copyText` (alloCopyText, clipboard, execCommand, then `.grove-share-text` fallback), `runSummaryText`, `shareBlock` in the replay column; `groveShare` UI state cleared on save/setup. 33 units + 2 browser tests green. Local, uncommitted, undeployed.

## Thirteenth pass (Claude, September 5, 2026)

`habitatDetail()` ground marks (`.grove-habitat.is-damp/is-exposed/is-sheltered`), patch `title` tooltips, `.grove-evidence-link` -> `#grove-receipt` (tabIndex -1, `aria-live` removed to avoid double announcement with `srSay`). 34 units + 2 browser tests green. Local, uncommitted, undeployed.

## Fourteenth pass (Claude, September 5, 2026) - single-tree views

Moved off the campaign to the lab views. Measured first: Grow/Chemistry/Spread/Check are all axe-clean with no phone overflow, the scene sticky works (canvas moved 293px over a 1400px scroll), and the Grow layout measures 667x578 canvas in a 695/620 workbench split. Two "defects" seen in the first capture were downscaling artifacts - do not trust a 4500px screenshot rendered at 607px wide. Real finding: view heights are grow 4500, transport 3236, chem 2174, spread 1928, quiz 1124 desktop; grow is 7015 on a 390px phone.

Added a Grow section navigator: `GROW_SECTIONS`, `growSection(node, id, label)` wrapping five `pushKeyed` panels in labelled focusable `<section>`s, and `growNav()` rendering the pill links (inline theme tokens plus CSS for hover/focus only - the tool defines `--tree-ink`/`--tree-muted`/`--tree-accent`/`--tree-focus`, NOT `--tree-border`/`--tree-card`). New files `tests/tree_lab_grow_nav.test.js` (3) and `tests/e2e/treelab-grow-nav.spec.ts` (2); main suite reran green at 180. Local, uncommitted, undeployed.

## Fifteenth pass (Claude, September 5, 2026) - Transport

Generalised last pass's navigator instead of copying it: `GROW_SECTIONS` -> `LAB_SECTIONS[viewId]`, `growSection` -> `labSection`, `growNav()` -> `sectionNav(viewId)`, CSS class `.allo-tree-grow-section` -> `.allo-tree-lab-section` (nav class `.allo-tree-grow-nav` kept). Transport ids: `xport-sec-pipes|sugar|trunk|girdling`. Transport is a plain card list, NOT the workbench layout - it has no `.allo-tree-workbench-mission`. Its cards close with `], undefined, '<class>'));`, which is the anchor to use; counting parentheses fails because they appear inside string literals. Heights: transport 3236 desktop / 6172 phone, axe-clean. Tests: 5 units, 3 browser; main suite + units = 185 green. A per-theme screenshot inside a loop is flaky here (races the 3D settle) - assert axe in the loop, capture once outside. Local, uncommitted, undeployed.

## Sixteenth pass (Claude, September 5, 2026) - Chemistry + tab strip

Chemistry navigator: unlike Grow/Transport its cards are band-gated (trade = g68+, bill = g912+) and K-2 returns early, so `viewChem` collects `chemNav` via a local `chemPart(node, id, label)` wrapper and does `kids.unshift(sectionNav('chem', chemNav))` after the list is complete. `sectionNav(viewId, sections)` now takes an optional explicit list and returns null below two destinations. Ids: `chem-sec-reaction|curves|limits|trade|bill`.

Tab strip: already a correct ARIA tabs implementation (TABS is filtered BEFORE `.map`, so the roving indices match the rendered set) but had ZERO test coverage anywhere. Traced every key: arrows/wrap/Home/End all correct, focus follows, one roving tabindex. Now covered by a browser test.

Test lessons: a fixed `waitForTimeout(300)` after activating a tab is too short when a heavy view re-renders - use `expect.poll`. And do not assert `boundingBox().y < 400` on a short page; a 2174px view cannot scroll its last section to the top, so use `toBeInViewport()`. 8 units + 5 browser; main + nav + grove evidence = 205 green. Local, uncommitted, undeployed.

## Seventeenth pass (Claude, September 5, 2026) - Compare chart series identity

Compare was never measured before: 3118px, third-longest view, axe-clean. Real defect found by RUNNING the palette validator with `--pairs all` (adjacent-only passes and hides it): dark `#d55181` vs `#199e70` = CVD Delta E 1.6 deutan; dark yellow vs orange 10.6 normal; light magenta vs orange 12.9 normal. Five lines on one chart were colour-only.

Fix: `SPECIES_DASH[i % 5]` now applies in EVERY theme for both the polyline and the legend swatch (it was `isContrast ? ... : ''` in both places). No hex changed, so every other use of the species hues is untouched. This follows the shared palette's own rule: past three all-pairs-safe slots the remedy is secondary encoding, not re-stepping. New file `tests/tree_lab_compare_series.test.js` (3). Main + compare + nav = 191 green. Local, uncommitted, undeployed.

## Eighteenth pass (Claude, September 5, 2026) - colour sweep + species grid

Swept for the colour-only defect class found last pass. Results: FACTOR_HUES (light/co2/water/temperature) PASS all-pairs in both modes - no action. Allocation hues (`#22c55e,#a16207,#f59e0b,#ec4899,#38bdf8`) FAIL all-pairs CVD (amber vs green 5.7 protan) but the strip has a full `aria-label` listing every part and percentage plus five labelled sliders beneath, which is the documented direct-label remedy - no action, and no 5-colour set can clear all-pairs anyway. Quiz status already ships glyph + srSay + inset bar + dashed border for wrong - no action.

Real find: `.allo-tree-species-grid` used `repeat(auto-fit,minmax(285px,1fr))`, which resolves to FOUR columns on the 1331px panel and strands the fifth of five species cards beside three empty slots. Now explicit: 5 columns >=1180px, 3 by default, 2 <=900px, 1 <=620px (existing rule). At 1365px that is 258px per card, verified no overflow and all five the same height, so the stat bars align across species. New file `tests/e2e/treelab-compare-layout.spec.ts` pins per-row counts at 5 widths and asserts no row of four. Main + compare + nav = 191 green. Local, uncommitted, undeployed.

## Nineteenth pass (Claude, September 5, 2026) - fixed-count grids + curve axis

Applied the pass-18 rule tool-wide. FIRST fix the measurement: bucketing children into rows by exact `getBoundingClientRect().top` reports a false [1,3] because a highlighted panel sits ~2px proud - bucket within 6px. Corrected data: `.allo-tree-pipe-grid` (2) and `.allo-tree-habitat-ribbon` (4) are fine everywhere.

Two real orphans at ~860px, both fixed with explicit counts: `.allo-tree-curve-grid` (4 items) went 3+1, now `repeat(2,...)` base + `min-width:920px` -> 4 + `max-width:460px` -> 1; `.allo-tree-quiz-story-path` (6 items) went 5+1, now `repeat(3,...)` base + `min-width:940px` -> 6 (its existing 760px->2 and 460px->1 rules still apply).

Separate real defect: the curve y-axis max used `round(yMax, 1)`, and a SEEDLING's gross photosynthesis is <0.05, so on FIRST LOAD both axis ends read "0". Now `yMax >= 1 ? round(yMax,1) : round(yMax,2)`. Test the DEFAULT mount (`{ view: 'chem' }` with no tree), not just a synthetic grown tree - the bug only appears in the state every learner starts in.

Test gotchas hit: `page.evaluate(stringCallback, arg)` DROPS the arg - pass a real function. Curve axis labels cannot be picked by document order (the limiting panel adds an end-anchored annotation) - filter to purely numeric text. And a bash heredoc ate `\d` in a regex; use the Edit tool for regex literals. New file `tests/e2e/treelab-grid-orphans.spec.ts` (2). Main + compare + nav = 192 green.

**Repo state:** concurrent commit d15f79d50 (2026-09-05 13:02, "Deploy everyone's work") swept in Tree Lab through the Grow navigator (pass 14) and deployed it. Passes 15-19 (labSection rename, Transport + Chemistry navigators, always-on SPECIES_DASH, species grid, curve axis) are still local and uncommitted.

## Twentieth pass (Claude, September 5, 2026) - printing

First-load sweep across all six views (mount `{ treeLab: {} }`, no tree): clean, only honest seedling zeros. Then added the missing print support - treelab had 0 `@media print` rules against 38 sibling tools that have them.

Print rules hide `.allo-tree-tabs`, `.allo-tree-grow-nav`, `.grove-skip`, `.grove-camera-controls`, `.grove-view-switch`, `.grove-action`, `.allo-tree-button`, `canvas`, `input[type=range]`; clear background-color AND background-image (gradients are background-image - clearing only the colour leaves the washes); flatten shadows; release `.allo-tree-workbench-sticky`; `break-inside:avoid` on cards/sections/patches. Do NOT blanket-hide `button`: `.grove-patch` and `.allo-tree-quiz-opt` are content.

★★★ A closed `<details>` is not laid out at all in Chromium, so NO print CSS can reveal it, and `getComputedStyle(child).display` still reads 'block' - a vacuous assertion that passes while nothing renders. `ensurePrintExpansion()` (module-level, registered once, guarded by `PRINT_HOOKED`) sets `open` on `beforeprint` and restores on `afterprint`. `page.emulateMedia({media:'print'})` does NOT fire beforeprint - dispatch it, then assert the content's `getBoundingClientRect().height > 0`.

New file `tests/e2e/treelab-print.spec.ts` (2). Main + compare + nav + grove evidence = 209 green. Local, uncommitted.

## Twenty-first pass (Claude, September 5, 2026) - read-aloud

Sibling-marker comparison across 147 stem tools: speechSynthesis 17 tools / treelab 0 (the gap); forced-colors 7/11 ok; aria-live 135/9 ok; localStorage 37/0 (n/a, uses platform save); requestFullscreen 14/0 (n/a, has its own viewerFull stage).

Added `receiptSpeechText`, `stopSpeaking`, `speakReceipt`, `readAloudButton` in `viewGrove`, plus `.grove-speak` CSS (hidden in print). Refactored `whereList` into `whereLines(r)` (data) + `whereList(r)` (render) so speech and list share ONE derivation. State: `d.groveSpeaking`. Rate 0.85 for K-2, else 0.95.

★★★ **`window.speechSynthesis` is a read-only accessor**: `w.speechSynthesis = stub` silently does nothing, the tool then calls the REAL engine (mute in headless), and the feature looks completely dead. Use `Object.defineProperty(w, 'speechSynthesis', { configurable: true, value: stub })`. Suspect the stub before the code when a feature appears inert.

★★★ A heredoc-written script put REAL line breaks inside the GROVE_CSS string and broke the file. Repaired by converting bare LF (not preceded by CR) back to the two-char escape, via a script written with the Write tool - never a shell heredoc for anything containing backslashes. Verify with `node --check` AND the full unit suite.

New file `tests/e2e/treelab-read-aloud.spec.ts` (3). 209 units + print/grove browser suites green. Local, uncommitted.

## Twenty-second pass (Claude, September 5, 2026) - Compare section navigator

Measured body scrollHeight per view at 1365x1000, grown oak: grow 4584 (nav), transport 3302 (nav), compare 2663 (NO nav), chem 2240 (nav), spread 1928 (none), quiz 1124 (none). Compare was the tallest view without a jump strip.

`viewCompare` now uses the chemPart pattern (`cmpPart` collector) so band-gated blocks never leave dangling links: `cmp-sec-experiment` (hero card), `cmp-sec-trail` (reasoning trail), `cmp-sec-species`, `cmp-sec-next` (conclusion). `kids.unshift(sectionNav('compare', cmpNav))`.

The species stage was ALREADY `h('section', {aria-label: 'Five species strategies'})`. It got `id` + `tabIndex:-1` in place instead of a labSection wrapper (which would have nested two labelled regions with the same name), and its nav entry reuses `stem.treelab.species_strategies` so link text == region label, matching the invariant labSection gives the others.

★ Compare is `min: 'g35'` in TABS, so `{view:'compare', bandOverride:'k2'}` falls back to Grow - a band loop over compare must exclude k2 or it silently asserts against the Grow view.

★ Four full Compare renders in one jsdom test exceed the 5s vitest default (five simulated species each); that test carries an explicit 30000ms timeout.

3 unit tests appended to `tests/tree_lab_grow_nav.test.js`, 1 browser test appended to `tests/e2e/treelab-grow-nav.spec.ts` (includes a uniform-pill-style assertion). 246 units / 9 browser tests green. Local, uncommitted.

## Twenty-third pass (Claude, September 5, 2026) - heading outline

Measured outline per view: `h3 🌳 Tree Life Lab` FIRST, then `h2` chapter title, then h3 cards. The document opened at h3 and jumped UP. ★★★ axe never reports this: `heading-order` only flags levels SKIPPED going down; a rising level is legal, and the rule is best-practice (excluded by the wcag2a/2aa tag filter) anyway.

Changes (5 sites, all measured for visual parity): hero `.allo-tree-hero-title` h3 -> h2; grove header tagline h2 -> h3 + `.grove-header h2{` -> `h3{` (2 occurrences, base + 480px media); quiz finale title h2 -> h3 + `.allo-tree-quiz-finale-copy h2{` -> `h3{`. Chapter title stays h2. Remaining `h('h2'` sites: hero, chapter, fullscreen sr-only dialog title.

★ The app resets headings to 14px/400, so ALL visible sizes come from class or inline rules - retagging is visually inert PROVIDED the paired CSS selector is renamed. Verified by inserting an h2 twin next to the retagged h3 in the live page and diffing computed size/weight/margin/line-height (h3 42px vs h2 14px = the rule followed the tag correctly).

New file `tests/tree_lab_headings.test.js` (4 tests, 7 views x 4 bands): highest heading first, no skipped level, no empty heading, exactly two h2s.

★★★ `27-treelab-a11y.spec.ts` "the app stylesheet is actually applied" was failing BEFORE this pass - verified by running it against `git show HEAD:` of the tool. The root paints a GRADIENT, so `getComputedStyle(root).backgroundColor` is transparent on a fully styled page. Guard now compares `backgroundColor + ' | ' + backgroundImage` against `'rgba(0, 0, 0, 0) | none'`. Third gradient/background-color confusion in this project.

250 units / a11y + grove + grove-evidence + print + evidence browser suites green. Local, uncommitted.

## Twenty-fourth pass (Claude, September 5, 2026) - quiz answer position bias

★★★ The existing gate `does not let a student score the quiz by answer position` measures ALL 16 questions and PASSED (A=2,B=4,C=5,D=5). Students never see that set. Per band pool the old rotation `shift=(i*3+1)%4` gave: k2 A1/B1/C2/D1, g35 A1/B2/C2/D3, g68 **A1**/B3/C4/D4, g912 A2/B4/C5/D5. "Never A" was nearly a strategy for grades 6-8.

`QUIZ` is now built by an IIFE that keeps a per-band load table and gives each question the position with the lightest load across the pools that will SHOW it (`BANDS.filter(b => atLeast(b, item.band))`), tie-broken by `(p + i) % n`. Result: g35/g68/g912 exactly even, k2 even to within 1 (5 questions), longest same-position run 2. Adding a question rebalances automatically.

Two new tests in `tests/tree_lab.test.js` beside the old gate: per-pool spread <= 1 with every position used, and no position three times running. Both fail on the old placement.

★ A fixture in `turns the knowledge check into an evidence-led mastery journey` hard-coded `quizPicks: {0: 0}` as a WRONG pick; question 0's answer is now at index 0. It derives the wrong pick from `E.QUIZ[0].correct` instead - never write an answer index as a literal.

★ Migration note: a saved `quizPicks` index from an older build points at a different option now; `quizSeen` (right/wrong) is unaffected.

252 units green + print, grid-orphans, quiz a11y browser suites. Local, uncommitted.

## Twenty-fifth pass (Claude, September 5, 2026) - phone sweep of the knowledge check

`.allo-tree-quiz-leaf-trail` was `display:flex;flex-wrap:wrap` with 22px chips; at 390px twelve chips wrapped 11 + 1. Now module-scope `trailColumns(n)` (exported on the engine) picks the widest count from 6 down to 3 whose remainder is not exactly 1; the trail element carries `gridTemplateColumns: repeat(N,22px)` inline and the `max-width:760px` rule switches it to `display:grid` (the inline value is inert under flex at desktop, which is why it can be set unconditionally). Pool sizes 5/8/12/16 -> rows [5] [6,2] [6,6] [6,6,4].

★ NO DEFECT (measured, no change): the tab strip already reveals the selected tab on a phone - on mount via the `ref` on the selected tab, after a resize from desktop, and after keyboard End. The screenshot that suggested otherwise was an artefact of resizing after mounting wide.

New: 1 unit test in `tests/tree_lab.test.js` (column choice for n=1..24 plus the four real pool sizes), 1 browser test appended to `treelab-grid-orphans.spec.ts` (four bands x five widths, fails on the old flex wrap).

★ Unit files run together on a loaded machine hit the 5s vitest default; `--pool=forks --maxWorkers=2` is the reliable local invocation, and the heading tests now carry explicit 20000/30000ms limits.

253 units + quiz a11y + print browser suites green. Local, uncommitted.

## Twenty-sixth pass (Claude, September 5, 2026) - sampled contrast (axe incomplete)

★★★ axe returns 85-261 `color-contrast` nodes as INCOMPLETE per surface (gradient backgrounds); the a11y suite asserts on VIOLATIONS only, so none of that text was ever checked. Zero violations on the previously uncovered surfaces (Grove x4, Transport dark/contrast, Quiz dark/contrast) - the gap was never a violation, it was the incomplete bucket.

Method: hide every glyph (`color:transparent` AND `svg text{fill:transparent}`), one full-page screenshot, sample the pixel under each text box, worst pixel of a 7x7 patch, compare to the axe-reported text colour. 977 nodes decided across 5 surfaces; 20 under AA.

Fixes: new `--tree-accent-text` var = `#047857` in light (5.48:1 on white), `T.accent` in dark/contrast; all 44 `color:var(--tree-accent)` sites moved to it. The accent FILL keeps `#059669` because the near-black onAccent ink on it is 4.95:1 and darkening the fill would break that. `.allo-tree-memory-year-state` (8px) muted grey on the green chip was 3.16:1 in dark -> `--tree-ink` (6.57:1). Hero stat value set its accent INLINE (`tree.seedsBanked > 0 ? T.accent : T.text`) so the var swap missed it.

★★★ MEASUREMENT TRAP: SVG text uses `fill`, not `color`, so a `color:transparent` overlay leaves it painted and the sample under an axis label is the GLYPH - five "failures" in the compare chart at 1.00-2.23:1 were my own error. Always hide `svg text`/`tspan` fill too.

★ `.allo-tree-memory-compare-arrow` stays at 3.46:1: aria-hidden decorative glyph = graphical object, 3:1 floor. Listed in the spec's GRAPHICAL allowlist with that reasoning.

New: `tests/e2e/treelab-contrast-sampled.spec.ts` (5 surfaces) + `tests/e2e/helpers/png_pixels.ts` (dependency-free PNG reader on node:zlib; Chromium writes 8-bit RGB/RGBA non-interlaced). Gate proven non-vacuous by re-injecting `#059669`: 8 failures on Grow (light).

★ Writing several MB of screenshots into the OneDrive tree makes the next vitest run crawl (114s for 17 tests, spurious 5s timeouts). Delete the captures before running units.

253 units + 24 a11y browser tests green. Local, uncommitted.

## Twenty-seventh pass (Claude, September 6, 2026) - contrast across every surface

Ran the sampled measurement over 16 surfaces: 2515 nodes, 15 under the floor.

REAL 1 - season field guide identity hues used as TEXT on the light cards: `#f59e0b` 2.04, `#eab308` 1.91, `#38bdf8` 2.13, `#22c55e` 2.26, `#ea580c` 3.54. Added `inkTone(hex)` beside `tone(hex)` with `SEASON_INK` (`#22c55e->#15803d`, `#f59e0b->#b45309`, `#eab308->#a16207`, `#ea580c->#c2410c`, `#38bdf8->#0369a1`), published `--season-ink` / `--ledger-ink` beside `--season-hue` / `--ledger-tone`, and moved the 10 TEXT `color:` rules onto the ink vars with `/([;{])color:var\(--x\)/` so `border-color:` is not caught. Graphics keep the hue.

REAL 2 - `'--tab-icon': isContrast ? T.cardAlt` gave the selected tab a near-black chip while the tab's ink is `T.onAccent` (black on the yellow tab): an invisible glyph. Now `'transparent'` in that theme.

★★★ PHANTOM (my measurement): worst-pixel-in-a-7x7-patch reads a 1px white chip BORDER as the background in high contrast and reports white-on-white at 1.00:1 on legible text. Switched to the MEDIAN pixel of the patch; three phantoms vanished, both real faults stayed. Also un-pin `position:sticky/fixed` before a stitched full-page capture.

`treelab-contrast-sampled.spec.ts` now covers 12 surfaces (was 5), all green. 253 units + 24 a11y green. Local, uncommitted.

## Twenty-eighth pass (September 6, 2026) - focus indicator visibility

★★★ `--tree-focus` in light was `#34d399`: 1.92:1 on white, 1.75:1 on the slate card, under the 3:1 for a focus indicator. Now `#047857` (5.48:1). Dark `#a7f3d0` 11.4:1 and contrast `#ffffff` were already fine - this was a LIGHT-theme-only fault, i.e. the default.

Two more found by measuring on the page: `.grove-patch.is-selected` drew `outline:3px var(--grove-accent);outline-offset:1px`, so the focus ring at offset 3px landed ON that ring (1.46:1) - selection moved to `box-shadow:inset 0 0 0 3px` + border-color, leaving the outline to focus. And `[tabindex="0"]` containers (the discovery card) had NO focus rule and fell back to the UA ring: near-black, 2.94:1 on the dark card - added `.allo-tree-lab [tabindex="0"]:focus-visible`.

★ A computed-style diff (before/after focus) says every control "changes on focus" and proves nothing about visibility. Measure the ring colour against the sampled pixels it is drawn over.

★ A first sweep flagged 5 controls as having NO indicator; they were inside a CLOSED `<details>`, where `.focus()` silently does nothing. Skip anything where `document.activeElement !== el` after focusing, or open the folds first.

★ Two screenshots per control (focused/unfocused diff) took 13-20 min for 4 surfaces under SwiftShader. One unfocused full-page capture plus computed ring colours does the same job in ~3 min. Also give `page.screenshot` an explicit `timeout: 180_000` - the 30s default fails under 3-worker parallelism here.

New file `tests/e2e/treelab-focus-visible.spec.ts` (5 surfaces, 205 rings). Proven non-vacuous by injecting `--tree-focus:#34d399`: fails at 1.60-1.86:1. 253 units + 36 browser tests (contrast + a11y) + 6 grove browser tests green. Local, uncommitted.

## Twenty-ninth pass (September 6, 2026) - chart mark contrast (WCAG 1.4.11)

Measured SVG marks the same way as text (hide marks, capture, sample underneath). Light growth lines: `#1baf7a` 2.82:1, `#eda100` 2.17:1, `#e87ba4` 2.69:1 against the white chart - under the 3:1 for a meaningful graphic. Dashes (added earlier) fix IDENTITY, not visibility.

Rebuilt both palettes by SEARCHING with the dataviz validator's exported `validate()` (`--pairs all`), not by eye:
- LIGHT `['#1f68c0','#b45309','#15803d','#5b21b6','#9d174d']` - ALL CHECKS PASS, >=4.8:1 on the card.
- DARK `['#38bdf8','#fdba74','#16a34a','#8b5cf6','#ec4899']` - deutan 8.8 / tritan 12.2 / normal 22.6, all >=3:1, FAILS the lightness band on two steps. Deliberate: the OLD dark palette had deutan ΔE **1.6** (pink vs green indistinguishable) and failed the normal floor too, and a search over ~4500 in-band combinations found NONE that separates five hues inside the dark band.

★ The validator's report rows are `[label, status, detail]` where the first two rows use booleans and the rest strings - a `status === 'fail'` filter silently counts band failures as passes.

★ Measuring ALL svg marks produces false positives by design: marker halos are stroked in the SURFACE colour on purpose (overlap separator) and gridlines are meant to be recessive. The durable spec measures `polyline[data-species]` only.

New file `tests/e2e/treelab-chart-marks.spec.ts` (3 themes). 253 units + 37 browser tests green. Local, uncommitted.

## Thirtieth pass (September 6, 2026) - response curve contrast

Same fault class as pass 29 in the Chemistry curves: light `#ca8a04` 2.94:1 on the white panel, dark `#7c3aed` 2.57:1 on the dark card. `FACTOR_HUES(dark)` shared three of four hues between themes; it now returns a per-theme set, searched with the validator:
- light `{ light:'#a16207', co2:'#7c3aed', water:'#0369a1', temperature:'#9f1239' }` - all checks pass, CVD 11.3, >=4.5:1.
- dark `{ light:'#bf8700', co2:'#8b5cf6', water:'#0284c7', temperature:'#e11d48' }` - all checks pass, CVD 7.5 (legal: each curve has its own labelled panel).

The curve stroke path now carries `data-curve: c.id`, so a measurement targets the line rather than the 0.1-opacity area or the here-dot.

★★★ `tests/tree_lab.test.js` `paths()` matched the literal `<path d="`; adding `data-curve` BEFORE `d` made it match zero paths, and its assertion (a gated input plots FLAT) would then have passed vacuously on an empty array had `expect(shade.length).toBe(4)` not been there. Attribute-order-sensitive regexes over rendered HTML are a standing trap - key off the data attribute.

`treelab-chart-marks.spec.ts` now covers Compare (5 lines) and Chemistry (4 curves) x 3 themes = 6 tests. 253 units + 42 browser tests green. Local, uncommitted.

## Thirty-first pass (September 6, 2026) - meter fill vs track

Measured fill-against-track for `.allo-tree-habitat-fill`, `.allo-tree-species-trait-fill`, `.allo-tree-strategy-fill`, `.grove-patch-water i`. Failures: strategy bars 1.53/1.44:1, trait meters 1.44:1, grove water 2.54:1, dark factor bars ~2.5:1, and high contrast drew `#ffff00` on a `#ffffff` track = **1.07:1**.

Fixes: new `--meter-track` token (`#e2e8f0` light / `#0f172a` dark / `#000000` contrast) on `.allo-tree-habitat-track` and `.allo-tree-strategy-track,.allo-tree-species-trait-track`, plus `--grove-track` (`#eef2f7` / `#0f172a` / `#000000`) on `.grove-patch-water`; tracks previously used `--chapter-border`/`--grove-line`, which is too close to the fills in every theme. Meter fills moved from `tone()` to `inkTone()`, and `SEASON_INK` gained `'#ec4899': '#9d174d'` and `'#8b5cf6': '#5b21b6'`. All measured meters now 3.06-8.3:1.

New file `tests/e2e/treelab-meter-contrast.spec.ts` (7 surfaces). 253 units + 47 browser tests green. Local, uncommitted.

## Thirty-second pass (September 6, 2026) - WCAG 1.4.12 text spacing

Applied the four reader overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, p margin 2em) and looked for leaf text whose scrollWidth/Height exceeds its client box.

Two truncations: `.allo-tree-tab-hint` was `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` (clipped at 101-111px in a 90px box), and `.allo-tree-quiz-story-copy strong` / `>span` the same. Both now `white-space:normal;overflow-wrap:anywhere`. No visual change at default spacing; also removes a translation-length truncation that predates this criterion.

★ Measure LEAF text elements only (p/span/strong/li/label/button/h*/td/summary). Cards with decorative blobs overflow their own box for unrelated reasons - a first version reported 5 "clipped" cards per view and 0 real findings.

★ Verify the overrides actually applied (compare computed letterSpacing before/after) - the first run reported identical before/after counts because the style tag had not taken effect, which reads exactly like a pass.

New file `tests/e2e/treelab-text-spacing.spec.ts` (7 views; also asserts nothing was clipped BEFORE the overrides). 253 units + 40 browser tests green. Local, uncommitted.
