# STEM Lab + SEL Hub — axe depth audit (WCAG 2.2 A/AA)

Generated 2026-09-26T06:56:40.008Z by `/tmp/claude-0/-home-user-AlloFlow/3efddaaf-b151-5c02-b4cf-dbf152bb6493/scratchpad/stemsel/summarize.cjs` from `out/*.json` (per-tool raw) — harness `probe.cjs`.

## Method

- Tool set = the modules the app actually fetches (`stemToolModules` / `selToolModules` in AlloFlowANTI.txt): 149 unique STEM (stem_tool_forge.js is listed twice) + 72 SEL tool files. `stem_lab/stem_tool_timeline.js` is on disk but NOT in the manifest, so it was not audited.
- Each tool rendered in Chromium through the REAL hub `renderTool` (stem_lab_module.js / sel_hub_module.js), with the manifest support modules loaded, React 18 UMD production, static Tailwind build of stem_lab + sel_hub, the STEM palette from app_styles_module.js, and a ctx whose `update`/`updateMulti` really set state (the repo probe passes no-ops).
- States walked (same as dev-tools/axe_a11y_depth.cjs): baseline → open every `<details>` → click each `[aria-expanded=false]` toggle one by one → click each `[role=tab]` (max 40) and re-open revealed `<details>`; axe after each. Violations are billed to the FIRST state that exposed them. Run in light and dark (dark = theme-dark host, OS `prefers-color-scheme: dark`).
- axe-core 4.12.1, all rules except page-level ones (region, bypass, landmark-one-main, page-has-heading-one) and AAA color-contrast-enhanced. "WCAG A/AA" below = rules tagged wcag2a/2aa/21a/21aa/22aa; best-practice-only rules are listed separately.
- Source lines are a heuristic grep (aria-label/id/placeholder/text/class/inline colour from the snippet): treat as the likely site, verify before editing.

## Totals

- Tool files audited: 220 (148 STEM, 72 SEL); excluded as not-a-tool (registers nothing): stem_lab/stem_tool_geometryworld_builder.js
- Harness-errored / did not fully render: 0
- Clean (no violations of any kind, no harness errors): 138
- Clean of WCAG A/AA (no contrast, no A/AA rule; best-practice findings allowed): 209 (137 STEM, 72 SEL)
- Tools that CRASHED on a walked state (real product bugs; audit resumed after remount): 
- Tools with ≥1 non-contrast WCAG A/AA violation: 0
- Tools with ≥1 color-contrast violation: 11

## Hand-verified non-contrast WCAG A/AA violations (source read, line confirmed)

| # | rule (SC) | tool file:line | element / state | suggested fix |
|---|---|---|---|---|
| 1 | aria-required-parent + aria-required-children (1.3.1 A) | stem_lab/stem_tool_playlab.js:4158-4172 | `div role=table "Session stats"` whose direct children are `span role=rowheader` / `span role=cell` with no `role=row` (20 cells + the table). State: Scout tab, "Your Numbers" `<details>` | wrap each label/value pair in `h('div',{role:'row',style:{display:'contents'}}, …)`, or use a `<dl>` / real `<table>` |
| 2 | scrollable-region-focusable (2.1.1 A) | stem_lab/stem_tool_dna.js:5228 | `div.max-h-60.overflow-y-auto` Genetic disorders reference list (Protein tab, inside `<details>`) — scrolls, holds no focusable content | add `tabIndex: 0`, `role: 'region'`, `aria-label` to the scroller |
| 3 | scrollable-region-focusable (2.1.1 A) | stem_lab/stem_tool_dna.js:5624 | `div.grid.max-h-60.overflow-y-auto` codon reference table (Challenge tab) | same as #2 |
| 4 | nested-interactive (4.1.2 A) | stem_lab/stem_tool_rocks.js:7009 (buttons at 6995, 7019) | `svg role=img` "Igneous, metamorphic and sedimentary rock…" contains `g role=button tabIndex=0` arrows/nodes (baseline). role=img makes children presentational, so SR users cannot reach/identify the buttons | drop `role:'img'` on the svg (use `role:'group'` + aria-label) and keep the per-button names |
| 5 | nested-interactive (4.1.2 A) | sel_hub/sel_tool_orientations.js:610 (button g at ~598) | `svg role=img` "Scatter of eight traditions…" contains `role=button tabIndex=0` points (Compass tab) | same as #4 (`role:'group'`), the list of real buttons below can stay |
| 6 | aria-progressbar-name (1.1.1 A / 4.1.2) | sel_hub/sel_tool_perma.js:308 | `div role=progressbar` (Self-check tab, "N of M rated") has no name | add `'aria-label': 'Self-check progress'` or `aria-labelledby` the "N of M rated" div above (line 307) |
| 7 | aria-progressbar-name | sel_hub/sel_tool_restorativecircle.js:2675 | per-badge `div role=progressbar` (Badges tab), no name and no aria-valuenow | add `'aria-label': badge.name + ' progress'` and `'aria-valuenow': pct` |
| 8 | link-in-text-block (1.4.1 A) — dark theme only | stem_lab/stem_tool_swimlab.js:339 | `<a>` "Red Cross", `color: T.link` (#bae6fd) inline in #94a3b8 text: 1.93:1 vs surrounding text, no underline | add `textDecoration: 'underline'` (T.link style) |

(The summary tables below bill the swimlab link to line 25 — that heuristic hit a comment; 339 is the real site.)

## Render crashes found while walking states (REAL product bugs, not harness)

These blank or break the tool for a learner, and hid the states behind them from this audit (the harness remounted and continued).

| tool file:line | trigger | cause |
|---|---|---|
| sel_hub/sel_tool_zones.js:33912 | click "View badges" | `if (showBadgesPanel) return …` runs BEFORE `React.useEffect` at :35076, so the hook count changes → React #300 "Rendered fewer hooks than expected"; the hub's boundary replaces the tool. |
| sel_hub/sel_tool_coping.js:26622 | click "N/19 badges earned" | same pattern: early return before `React.useEffect` at :28571 → React #300. |
| sel_hub/sel_tool_sleep.js:433-454 | open "Sleep diary" tab with an empty diary (every new learner) | the closing `}` of `if (diary.length > 0) {` sits after `experimentSummary` is built (line 454 `});        }`), so `experimentSummary` is undefined and `experimentSummary.length` (:479) throws → "This tool could not open". |
| stem_lab/stem_tool_statslab.js:2610 | open "Data" tab | `t('stem.statslab.select_group_name…')` but `t` is shadowed by `var t = d.twoColData;` (:2505) inside `_renderData` → "t is not a function"; StemLab renderTool returns null (empty panel). |

All four sites are committed at HEAD (no uncommitted edits in those files at audit time).

## Contrast root causes (1262 failing nodes; 1076 visible in LIGHT mode across 75 tools)

- **Dimmed "locked"/unearned items** — 491 nodes / 15 tools render text inside `opacity: 0.4` wrappers (e.g. sel_hub/sel_tool_zones.js:33895 `opacity: earned ? 1 : 0.4`; same pattern in 24 files incl. emotions, mindfulness, social, perspective, strengths, community, teamwork, journal, safety, ethicalreasoning, cultureexplorer, upstander, path; stem geologyexplorer, a11yauditor). Text is not a disabled control, so 1.4.3 applies. Fix: keep full-opacity text and signal "locked" with an icon/label + border style.
- **SEL print-view footer** — 26 SEL tools, `fontSize: 9, color: #94a3b8` on the white print sheet = 2.56:1 (e.g. sel_hub/sel_tool_perma.js:559, sel_tool_sleep.js:718). One shared pattern in 27 files ("Created with AlloFlow SEL Hub."). Fix: #475569 or darker.
- **Hardcoded slate-500 (#64748b) small text on slate-800/900** — e.g. sel_hub/sel_tool_coping.js:28642 research citations (`_copFg('#64748b')`, 10px, 3.07:1 on #1e293b, 80 nodes on the Learn tab); similar in maps, path, advocacy, careercompass.
- **White on sky-500 (#0ea5e9) buttons** — 2.77:1, 7 SEL tools (e.g. sel_hub/sel_tool_bigfeelings.js:532 "Log this incident", :488 "Add"; circlesofsupport:364). Fix: sky-700 (#0369a1) background.
- **Tailwind 500-weight accent text on light cards** — stem_tool_migration.js (text-sky-500 2.6:1, ~65 nodes), stem_tool_dna.js (codon colours #f59e0b/#ef4444/#3b82f6 on tints, Challenge tab), stem_tool_echolocation.js (#f59e0b/#c084fc on white), restorativecircle (text-amber-500/600, text-slate-600 on dark panels).
- **DARK theme only (186 nodes, 11 tools)** — (a) STEM host: the dark palette's `--allo-stem-text-soft: #94a3b8` (app_styles_module.js:469) still applies inside the WHITE tool card that StemLab.renderTool paints in dark mode, so `var(--allo-stem-text-soft, …)` text is 2.56:1 (anatomy 18 nodes, e.g. stem_tool_anatomy.js:13651). Fix belongs in the host card (reset --allo-stem-* to light values on `[data-stem-tool-surface]`). (b) Tailwind `dark:` variants follow the OS (`prefers-color-scheme`), so `text-slate-700 dark:text-slate-200` on a white card = 1.23:1 for OS-dark users (ecosystem :8127, anatomy textareas :15981/:15848), and `text-slate-600` on `dark:bg-slate-900` panels = 2.35:1 (physics :2754, anatomy :3118). These depend on the OS-dark + app-dark combination; lower confidence than the light-mode set.

## Harness notes / caveats

- Tool set = app manifest. `stem_lab/stem_tool_timeline.js` exists on disk but is not in `stemToolModules`, so the app never loads it; not audited. `stem_lab/stem_tool_geometryworld_builder.js` is an enhancement module (registers no tool); excluded.
- `stem_tool_fieldjourneys.js` renders into an open shadow root. axe grades open shadow DOM (baseline 2 findings, both best-practice), but the tab/toggle walk uses `document.querySelectorAll` and does not pierce shadow roots, so its interior states are NOT walked. `dev-tools/shadow_a11y_probe.cjs` is the right instrument for it.
- Crashed views (zones/coping badge panels, sleep diary, statslab Data tab) were not audited — fix the crashes, then re-probe.
- Repo harness defects found while adapting (not fixed; read-only): (1) `dev-tools/axe_a11y_depth.cjs` normalizes snippets with `replace(/s+/g, ' ')` — should be `/\s+/g`; it replaces every letter "s" with a space in reported HTML (dedupe still works, snippets are garbled). (2) Both depth probes pass `update`/`updateMulti` as no-ops, so tools whose tabs/toggles are driven by `ctx.update` never change state when clicked — behind-click states can go unmeasured. (3) Both probes mount `cfg.render` directly and seed `toolData[id] = {}`; the app goes through `renderTool` and starts SEL tools with no key (so `labToolData.x || defaultState()` works) — seeding `{}` crashed perma in an early run of this audit (harness artifact, fixed here). (4) `build_sweep_tailwind_css.cjs` scans only stem_lab, not sel_hub (the combined sheet here scans both). (5) Neither probe handles SEL tools (they read `window.StemLab._registry` only). (6) Using `page.setContent` leaves an opaque origin where `localStorage` throws — crashed musicSynth's beat pad in the first run; this audit serves the page from a routed http origin instead.
- Note: dev-tools/axe_tool_depth.cjs's header says contrast "is closed tree-wide as of 2026-08-25"; running the repo's own probe (patched for executablePath only) on stem_tool_anatomy.js --dark reproduces 12 baseline failures, so that claim no longer holds.
- Runs are deterministic: after fixing the seed state and origin, three further runs (with and without animation suppression plus reduced-motion emulation; the last one limited to the 80 contrast tools) gave identical node counts (1262 contrast, 218 non-contrast). Run 1, before those fixes, gave 1237/217. The final data is in `out/`; earlier runs are in `out_run1..3/`.


## Rule index (non-contrast)

| rule | WCAG A/AA? | tags | nodes | tools |
|---|---|---|---|---|
| heading-order | best-practice | best-practice | 74 | 47 |
| aria-allowed-role | best-practice | best-practice | 41 | 8 |
| landmark-main-is-top-level | best-practice | best-practice | 25 | 25 |
| landmark-no-duplicate-main | best-practice | best-practice | 25 | 25 |
| empty-table-header | best-practice | best-practice | 3 | 2 |
| landmark-contentinfo-is-top-level | best-practice | best-practice | 2 | 2 |
| empty-heading | best-practice | best-practice | 2 | 2 |

## Non-contrast WCAG A/AA violations, by rule then tool

## Best-practice-only findings (not WCAG A/AA failures)

### heading-order — Heading levels should only increase by one (moderate; best-practice)

**sel_hub/sel_tool_howl.js** (9)

- state: `tab "🎯 HOWL Radar"` [dark] — src: `sel_hub/sel_tool_howl.js:5054` (via text "Active Engagement")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 13px; font-weight: 700;">Active Engagement</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "🧪 SMART Lab"` [dark] — src: `sel_hub/sel_tool_howl.js:14359` (via style #fbbf24|fontSize: 14)
  - `<h4 style="margin: 0px; color: rgb(251, 191, 36); font-size: 14px; font-weight: 800;">SMART Score: 0 / 5</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "📋 Rubric"` [dark] — src: `sel_hub/sel_tool_howl.js:5054` (via text "Active Engagement")
  - `<h4 style="margin: 0px; color: rgb(125, 211, 252); font-size: 16px; font-weight: 800;">Active Engagement</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌟 Exemplars"` [dark] — src: `sel_hub/sel_tool_howl.js:7554` (via text "Tomas")
  - `<h4 style="margin: 4px 0px; color: rgb(253, 230, 138); font-size: 14px; font-weight: 800;">Tomas</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎓 Graduate"` [dark] — src: `sel_hub/sel_tool_howl.js:7831` (via text "Self-Knowledge")
  - `<h5 style="margin: 0px; color: rgb(253, 230, 138); font-size: 14px; font-weight: 800;">Self-Knowledge</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "⏱️ Run Protocol"` [dark] — src: `sel_hub/sel_tool_howl.js:4660` (via text "Council")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 14px; font-weight: 700;">Council</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "📚 Goals Library"` [dark] — src: `sel_hub/sel_tool_howl.js:7512` (via text ""By end of quarter, I will answer at lea")
  - `<h5 style="margin: 4px 0px; color: rgb(253, 230, 138); font-size: 13px; font-weight: 600; line-height: 1.5;">"By end of quarter, I will answer at least one question in class on 3 of 5 days."</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "⚖️ Climate Scenarios"` [dark] — src: `sel_hub/sel_tool_howl.js:15115` (via text "How to navigate any of these")
  - `<h5 style="margin: 0px 0px 6px; color: rgb(241, 245, 249); font-size: 13px; font-weight: 800;">How to navigate any of these</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎭 Rituals"` [dark] — src: `sel_hub/sel_tool_howl.js:7638` (via text "Rose Thorn Bud")
  - `<h5 style="margin: 0px; color: rgb(253, 230, 138); font-size: 13px; font-weight: 700;">Rose Thorn Bud</h5>`
  - Fix any of the following: Heading order invalid

**sel_hub/sel_tool_restorativecircle.js** (1)

- state: `tab "🧠 Empathy"` [dark] — src: `sel_hub/sel_tool_restorativecircle.js:847` (via text "What they SAID")
  - `<h5 id="rc-empathy-personA-said-label" class="text-xs font-bold text-blue-700">What they SAID</h5>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_algebracas.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_algebracas.js:2` (via text "Algebra CAS")
  - `<h3 style="font-size: 16px; font-weight: 700; margin: 0px;">🧮 Algebra CAS</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_anatomy.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:2` (via text "Human Anatomy Explorer")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🫀 Human Anatomy Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_angles.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_angles.js:2` (via text "Angle Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📐 Angle Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_aquarium.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_aquarium.js:2212` (via text "Aquaculture")
  - `<h3 class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">🐠 Aquaculture &amp; Ocean Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_archstudio.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_archstudio.js:4883` (via id "arch-floor-visibility-heading")
  - `<h3 id="arch-floor-visibility-heading">Floor visibility</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_areamodel.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_areamodel.js:2` (via text "Area Model")
  - `<h3 class="text-lg font-bold text-amber-800">🟧 Area Model</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_arithmetic.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_arithmetic.js:728` (via text "Place-value model")
  - `<h3 class="text-sm font-black" style="color: rgb(147, 197, 253);">Place-value model</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_beehive.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_beehive.js:28787` (via text "🐝 Beehive Colony Simulator")
  - `<h3 class="text-xl font-black tracking-tight sm:text-2xl text-slate-100">🐝 Beehive Colony Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_birdlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_birdlab.js:1447` (via text "Common Eider")
  - `<h3 style="font-size: 1.25rem; font-weight: 900; color: rgb(30, 41, 59); line-height: 1.15; margin-bottom: 2px; text-shadow: rgba(255, 255, 255, 0.85) 0px 1px 0px;">Common Eider</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_brainatlas.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_brainatlas.js:37` (via text "Brain Atlas")
  - `<h3 class="brainatlas-topbar-title">🧠 Brain Atlas</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_calculus.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_calculus.js:2100` (via text "Calculus Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">∫ Calculus Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_cell.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_cell.js:1965` (via text "Cell Simulator")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🔬 Cell Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_chembalance.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_chembalance.js:2` (via text "Chemistry Lab")
  - `<h3 class="text-lg font-bold text-slate-800">⚗️ Chemistry Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_circuit.js** (2)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_circuit.js:2` (via text "Circuit Builder")
  - `<h3 class="text-lg font-bold text-white tracking-tight">🔌 Circuit Builder</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📘Reference"` [dark] — src: `stem_lab/stem_tool_circuit.js:6236` (via text "Circuit Reference Library")
  - `<h3 class="text-base font-black text-amber-900">⚡ Circuit Reference Library</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_coding.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_coding.js:2529` (via text "Welcome to the Coding Playground!")
  - `<h3 class="text-sm font-bold text-white mb-2">Welcome to the Coding Playground!</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_companionplanting.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_companionplanting.js:11708` (via text "🌱 Companion Planting Lab")
  - `<h3 class="text-lg font-bold text-white">🌱 Companion Planting Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_coordgrid.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_coordgrid.js:2` (via text "Coordinate Grid")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📍 Coordinate Grid</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_dataplot.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_dataplot.js:2` (via text "Data Plotter")
  - `<h3 class="text-lg font-bold text-slate-800">📊 Data Plotter</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_datastudio.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_datastudio.js:693` (via text "📊 Charts & Graphs")
  - `<h3 class="text-lg font-bold flex items-center gap-2">📊 Charts &amp; Graphs</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_decomposer.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_decomposer.js:1` (via text "Material Decomposer")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">⚗️ Material Decomposer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_dna.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_dna.js:2` (via text "DNA / Genetics Lab")
  - `<h3 class="dna-command-title">DNA / Genetics Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_echolocation.js** (7)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_echolocation.js:5316` (via text "hearing as imaging")
  - `<h3 style="color: rgb(99, 102, 241); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sonar Vision — hearing as imaging</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🔦3D Cave"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5317` (via text "map by sound")
  - `<h3 style="color: rgb(8, 145, 178); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">3D Cave — map by sound</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌊Sound Waves"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5318` (via text "wavelength meets target size")
  - `<h3 style="color: rgb(14, 165, 233); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sound Waves — wavelength meets target size</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🚨Doppler Effect"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5319` (via text "the moving-prey signature")
  - `<h3 style="color: rgb(234, 88, 12); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Doppler Effect — the moving-prey signature</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🦠Bat Biology"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5320` (via text "the auditory specialist")
  - `<h3 style="color: rgb(147, 51, 234); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Bat Biology — the auditory specialist</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌳Acoustic Ecology"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5321` (via text "a soundscape we can")
  - `<h3 style="color: rgb(22, 163, 74); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Acoustic Ecology — a soundscape we can’t hear</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎵Sweep Discovery"` [dark] — src: `stem_lab/stem_tool_echolocation.js:5322` (via text "Sweep Discovery — tune the chirp")
  - `<h3 style="color: rgb(34, 211, 238); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sweep Discovery — tune the chirp</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_ecosystem.js** (3)

- state: `tab "🕸 Food web"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:2600` (via text "One meadow. More connections.")
  - `<h3>One meadow. More connections.</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌲 Conservation"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:9298` (via text "Conservation Manager: Maine")
  - `<h3 style="margin: 0px; color: rgb(134, 239, 172); font-size: 22px;">Conservation Manager: Maine</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "❔ Inquiry"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:9653` (via class "text-sm font-black text-slate-800 dark:text-slate-")
  - `<h4 class="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">❔ Meadow predator-prey parameter lab</h4>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_epidemic.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_epidemic.js:12` (via text "Epidemic Modeling Lab")
  - `<h3 class="text-base font-bold text-slate-800">Epidemic Modeling Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_fisherlab.js** (1)

- state: `tab "🎮 3D Sim"` [dark] — src: `stem_lab/stem_tool_fisherlab.js:20993` (via id "fl-core-mission-title")
  - `<h3 id="fl-core-mission-title" style="margin: 0px 0px 4px; color: rgb(248, 250, 252); font-size: 16px;">Casco Bay Stewardship Run</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_fractions.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_fractions.js:2` (via text "Fraction Lab")
  - `<h3 class="text-lg font-bold text-rose-800">🍕 Fraction Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_galaxy.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_galaxy.js:41` (via id "galaxy-tool-title")
  - `<h3 id="galaxy-tool-title" class="text-xl font-black text-slate-900">`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_geo.js** (10)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_geo.js:2073` (via text "the visual atlas")
  - `<h3 style="color: rgb(15, 118, 110); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Find Country — the visual atlas</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏛️ Capitals"` [dark] — src: `stem_lab/stem_tool_geo.js:2074` (via text "cultural anchors")
  - `<h3 style="color: rgb(126, 34, 206); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Capitals — govt seats + cultural anchors</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌍 Continents"` [dark] — src: `stem_lab/stem_tool_geo.js:2075` (via text "or 5, depending who you ask")
  - `<h3 style="color: rgb(21, 128, 61); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Continents — 7 (or 5, depending who you ask)</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏔️ Landmarks"` [dark] — src: `stem_lab/stem_tool_geo.js:2076` (via text "the visual mnemonics")
  - `<h3 style="color: rgb(180, 83, 9); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Landmarks — the visual mnemonics</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📏 Size Compare"` [dark] — src: `stem_lab/stem_tool_geo.js:2077` (via text "fight Mercator distortion")
  - `<h3 style="color: rgb(14, 116, 144); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Size Compare — fight Mercator distortion</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌐 Globe View"` [dark] — src: `stem_lab/stem_tool_geo.js:2078` (via text "honest spherical geometry")
  - `<h3 style="color: rgb(29, 78, 216); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Globe View — honest spherical geometry</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏆 Quiz Builder"` [dark] — src: `stem_lab/stem_tool_geo.js:2079` (via text "graded geography practice")
  - `<h3 style="color: rgb(185, 28, 28); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Quiz Builder — graded geography practice</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📍 Distance"` [dark] — src: `stem_lab/stem_tool_geo.js:2080` (via text "great-circle math")
  - `<h3 style="color: rgb(194, 65, 12); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Distance — great-circle math</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎚️ Distance Sense"` [dark] — src: `stem_lab/stem_tool_geo.js:2081` (via text "calibrate your gut")
  - `<h3 style="color: rgb(14, 116, 144); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Distance Sense — calibrate your gut</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_geo.js:4404` (via text "📐 Geometry Prover")
  - `<h3 class="text-lg font-bold text-violet-800">📐 Geometry Prover</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_heatlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_heatlab.js:1937` (via text "🌡️ Heat & Thermodynamics Lab")
  - `<h3 class="text-lg font-black tracking-tight text-white">🌡️ Heat &amp; Thermodynamics Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_inequality.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_inequality.js:2` (via text "Inequality Grapher")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🎨 Inequality Grapher</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_kitchenlab.js** (1)

- state: `tab "🔬Browning Lab"` [dark] — src: `stem_lab/stem_tool_kitchenlab.js:7710` (via text "🔬 Maillard browning discovery")
  - `<h3 class="text-sm font-black text-orange-700">🔬 Maillard browning discovery</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_lifeskills.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_lifeskills.js:2` (via text "Life Skills Lab")
  - `<h3 class="text-base font-bold flex items-center gap-2">🧭 Life Skills Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_manipulatives.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_manipulatives.js:2` (via text "Math Manipulatives")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🧮 Math Manipulatives</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_moonmission.js:12` (via text "Apollo Moon Mission")
  - `<h3 class="text-lg font-black text-slate-800 flex items-center gap-2">🚀 Apollo Moon Mission</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_multtable.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_multtable.js:2` (via text "Multiplication Table")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🔢 Multiplication Table</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_music.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_music.js:2` (via text "Music Synthesizer")
  - `<h3 class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">🎹 Music Synthesizer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_nuclearlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_nuclearlab.js:4461` (via text "☢️ Nuclear & Radiation Lab")
  - `<h3 class="text-lg font-black tracking-tight text-white">☢️ Nuclear &amp; Radiation Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_numberline.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_numberline.js:2` (via text "Number Line")
  - `<h3 class="text-lg font-bold text-blue-800">📏 Number Line</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_physics.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_physics.js:2` (via text "Physics Simulator")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">⚡ Physics Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_probability.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_probability.js:12` (via text "Probability Lab")
  - `<h3 class="text-lg font-bold" style="color: rgb(224, 231, 255);">🎲 Probability Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_rocks.js** (2)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_rocks.js:4680` (via text "Minerals Explorer")
  - `<h3 class="min-w-0 flex-1 text-lg font-bold text-slate-800 tracking-tight leading-tight">🪨 Rocks &amp; Minerals Explorer</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_rocks.js:12` (via text "Rock Cycle")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🪨 Rock Cycle</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_solarsystem.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_solarsystem.js:2` (via text "Solar System Explorer")
  - `<h3 class="text-lg font-bold text-slate-100">🌍 Solar System Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_unitconvert.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_unitconvert.js:358` (via text "Unit Converter")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📏 Unit Converter</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_volume.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_volume.js:2` (via text "3D Volume Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📦 3D Volume Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_wave.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_wave.js:2` (via text "Wave Simulator")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🌊 Wave Simulator</h3>`
  - Fix any of the following: Heading order invalid

### aria-allowed-role — ARIA role should be appropriate for the element (minor; best-practice)

**sel_hub/sel_tool_conflicttheater.js** (8)

- state: `baseline` [dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Missing Lunch Money" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232…`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Rumor That Got Out" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232,…`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Group Project Cut" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232, …`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The P..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The Idea That Wasn't Hers" ...>`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The Screenshot That Got Sent" ...>`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The L..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The "..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `tab "✏️ Letter Builder"` [dark] — src: `sel_hub/sel_tool_selfadvocacy.js:3352` (via aria-label "Choose a letter template")
  - `<section class="no-print" role="radiogroup" aria-label="Choose a letter template">`
  - Fix any of the following: ARIA role radiogroup is not allowed for given element

**stem_lab/stem_tool_aquarium.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_aquarium.js:22310` (via id "aquarium-learning-path")
  - `<details id="aquarium-learning-path" role="region" aria-labelledby="aquarium-learning-path-title" class="mb-2 rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-3 shadow-sm" style="an…`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_gisstudio.js:6174` (via style #38bdf8|#102c3b|#bae6fd|fontSize: 11)
  - `<aside role="status" style="margin-top: 8px; padding: 10px; border-left: 4px solid rgb(56, 189, 248); border-radius: 8px; background: rgb(16, 44, 59); color: rgb(186, 230, 253); font-size: 11px; line-height: 1.45;">`
  - Fix any of the following: ARIA role status is not allowed for given element

**stem_lab/stem_tool_money.js** (2)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_money.js:2623` (via aria-label "Money Math studio")
  - `<details class="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden" data-moneymath-focus="true" role="region" aria-label="Money Math studio">`
  - Fix any of the following: ARIA role region is not allowed for given element
- state: `expand 1 <details>` [dark] — src: `stem_lab/stem_tool_money.js:2623` (via aria-label "Money Math studio")
  - `<details class="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden" data-moneymath-focus="true" role="region" aria-label="Money Math studio" open="">`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_numberline.js** (2)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_numberline.js:2018` (via aria-label "Number Line workspace")
  - `<details class="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden" data-numberline-focus="true" role="region" aria-label="Number Line workspace">`
  - Fix any of the following: ARIA role region is not allowed for given element
- state: `expand 2 <details>` [dark] — src: `stem_lab/stem_tool_numberline.js:2018` (via aria-label "Number Line workspace")
  - `<details class="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden" data-numberline-focus="true" role="region" aria-label="Number Line workspace" open="">`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_playlab.js** (25)

- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs High Pr..." title="Tiki-Taka vs High Pr..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Mid-Blo..." title="Tiki-Taka vs Mid-Blo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Low Blo..." title="Tiki-Taka vs Low Blo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Offside..." title="Tiki-Taka vs Offside..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Hi..." title="Counter-Attack vs Hi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Mi..." title="Counter-Attack vs Mi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Lo..." title="Counter-Attack vs Lo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Of..." title="Counter-Attack vs Of..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Gegenpress (Counter-..." title="Gegenpress (Counter-..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — In-Swinger ..." title="Corner — In-Swinger ..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — Out-Swinger..." title="Corner — Out-Swinger..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — Short vs Hi..." title="Corner — Short vs Hi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- … 13 more in aggregate.json

**stem_lab/stem_tool_solarsystem.js** (1)

- state: `baseline` [dark] — src: not found (tag section)
  - `<section data-solarsystem-wor...="Earth" role="figure" aria-label="Reference world spot..." class="solar-world-spotligh..." style="--spotlight-color: #...">`
  - Fix any of the following: ARIA role figure is not allowed for given element

### landmark-main-is-top-level — Main landmark should not be contained in another landmark (moderate; best-practice)

**sel_hub/sel_tool_practicejourneys.js** (1)

- state: `baseline` [dark] — src: `sel_hub/sel_tool_practicejourneys.js:1960` (via aria-label "Practice Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Practice Journeys pilot">`
  - Fix any of the following: The main landmark is contained in another landmark.

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `baseline` [dark] — src: `sel_hub/sel_tool_selfadvocacy.js:4763` (via aria-label "Self-Advocacy Studio main content")
  - `<main id="selfadv-main-content" tabindex="-1" role="main" aria-label="Self-Advocacy Studio main content">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_alphafold.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_alphafold.js:38` (via class "af-launcher")
  - `<main class="af-launcher" data-alphafold-mission="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_aquaculture.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_aquaculture.js:24429` (via id "aq-topic-content")
  - `<main id="aq-topic-content" tabindex="-1" class="aq-topic-content" aria-labelledby="aq-topic-heading">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_autorepair.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(241, 245, 249); background: rgb(15, 23, 42); border-radius: 14px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_behaviorlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_behaviorlab.js:2` (via aria-label "Behavior Lab")
  - `<div class="behaviorlab-tool-shell behaviorlab-intro space-y-4" role="main" aria-label="Behavior Lab" data-behaviorlab-tool="intro">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_cellatlas.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_cellatlas.js:907` (via class "cal-shell")
  - `<main class="cal-shell" data-cell-atlas-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_consciousness.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(11, ...">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_fieldjourneys.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_fieldjourneys.js:1960` (via aria-label "Field Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Field Journeys pilot"><h1>The field station could not open</h1><p>The original Tree Life Lab engine did not load.</p><p>Your existing adventures and campaign saves have not been …`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_fireecology.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_fireecology.js:72` (via class "fireecology-tool-shell")
  - `<main class="fireecology-tool-shell" data-fireecology-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [dark] — src: not found (tag main)
  - `<main style="max-width: 1180px; margin: 0px auto;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_learning_lab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_learning_lab.js:21795` (via aria-label "Learning Lab main menu")
  - `<div role="main" aria-label="Learning Lab main menu" style="padding: 20px; max-width: 1000px; margin: 0px auto; color: rgb(241, 245, 249);">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_llm_literacy.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_llm_literacy.js:6379` (via aria-label "AI Literacy Lab main content")
  - `<main id="llm-literacy-main" aria-label="AI Literacy Lab main content">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_migration.js** (1)

- state: `baseline` [dark] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-slate-900" data-migration-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_moonmission.js:2596` (via class "max-w-5xl mx-auto px-1 space-y-3")
  - `<div class="max-w-5xl mx-auto px-1 space-y-3" role="main" data-moonmission-tool="true" aria-label="Apollo Moon Mission Simulator - Phase 1 of 10: Mission Briefing">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_openbim.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_openbim.js:1056` (via class "ob-shell")
  - `<main class="ob-shell">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_oratory.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_organismid.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(15, 19, 14); color: rgb(230, 234, 223); --oid-focus: #fbbf24; --oid-border: #3b4530; --oid-muted: #aeb6a6;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_pets.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_pets.js:130` (via class "petslab-menu-shell")
  - `<main class="petslab-menu-shell" data-petslab-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_singing.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_sourcebook.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_sourcebook.js:9962` (via class "min-w-0")
  - `<main class="min-w-0">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_spaceexplorer.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_spaceexplorer.js:3516` (via aria-label "Space Explorer mission select")
  - `<div class="se-shell space-y-3" role="main" data-spaceexplorer-ux="mission-select" aria-label="Space Explorer mission select">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_swimlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_swimlab.js:82` (via class "swimlab-menu-shell")
  - `<main class="swimlab-menu-shell" data-swimlab-readiness="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_trajectorycomputing.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_trajectorycomputing.js:2406` (via id "tc-main-content")
  - `<main id="tc-main-content" class="tc-paper" tabindex="-1">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_weathersystems.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_weathersystems.js:8448` (via class "min-w-0 space-y-4")
  - `<main class="min-w-0 space-y-4">`
  - Fix any of the following: The main landmark is contained in another landmark.

### landmark-no-duplicate-main — Document should not have more than one main landmark (moderate; best-practice)

**sel_hub/sel_tool_practicejourneys.js** (1)

- state: `baseline` [dark] — src: `sel_hub/sel_tool_practicejourneys.js:1960` (via aria-label "Practice Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Practice Journeys pilot">`
  - Fix any of the following: Document has more than one main landmark

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `baseline` [dark] — src: `sel_hub/sel_tool_selfadvocacy.js:4763` (via aria-label "Self-Advocacy Studio main content")
  - `<main id="selfadv-main-content" tabindex="-1" role="main" aria-label="Self-Advocacy Studio main content">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_alphafold.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_alphafold.js:38` (via class "af-launcher")
  - `<main class="af-launcher" data-alphafold-mission="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_aquaculture.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_aquaculture.js:24429` (via id "aq-topic-content")
  - `<main id="aq-topic-content" tabindex="-1" class="aq-topic-content" aria-labelledby="aq-topic-heading">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_autorepair.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(241, 245, 249); background: rgb(15, 23, 42); border-radius: 14px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_behaviorlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_behaviorlab.js:2` (via aria-label "Behavior Lab")
  - `<div class="behaviorlab-tool-shell behaviorlab-intro space-y-4" role="main" aria-label="Behavior Lab" data-behaviorlab-tool="intro">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_cellatlas.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_cellatlas.js:907` (via class "cal-shell")
  - `<main class="cal-shell" data-cell-atlas-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_consciousness.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(11, ...">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_fieldjourneys.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_fieldjourneys.js:1960` (via aria-label "Field Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Field Journeys pilot"><h1>The field station could not open</h1><p>The original Tree Life Lab engine did not load.</p><p>Your existing adventures and campaign saves have not been …`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_fireecology.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_fireecology.js:72` (via class "fireecology-tool-shell")
  - `<main class="fireecology-tool-shell" data-fireecology-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [dark] — src: not found (tag main)
  - `<main style="max-width: 1180px; margin: 0px auto;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_learning_lab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_learning_lab.js:21795` (via aria-label "Learning Lab main menu")
  - `<div role="main" aria-label="Learning Lab main menu" style="padding: 20px; max-width: 1000px; margin: 0px auto; color: rgb(241, 245, 249);">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_llm_literacy.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_llm_literacy.js:6379` (via aria-label "AI Literacy Lab main content")
  - `<main id="llm-literacy-main" aria-label="AI Literacy Lab main content">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_migration.js** (1)

- state: `baseline` [dark] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-slate-900" data-migration-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_moonmission.js:2596` (via class "max-w-5xl mx-auto px-1 space-y-3")
  - `<div class="max-w-5xl mx-auto px-1 space-y-3" role="main" data-moonmission-tool="true" aria-label="Apollo Moon Mission Simulator - Phase 1 of 10: Mission Briefing">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_openbim.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_openbim.js:1056` (via class "ob-shell")
  - `<main class="ob-shell">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_oratory.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_organismid.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(15, 19, 14); color: rgb(230, 234, 223); --oid-focus: #fbbf24; --oid-border: #3b4530; --oid-muted: #aeb6a6;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_pets.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_pets.js:130` (via class "petslab-menu-shell")
  - `<main class="petslab-menu-shell" data-petslab-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_singing.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_sourcebook.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_sourcebook.js:9962` (via class "min-w-0")
  - `<main class="min-w-0">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_spaceexplorer.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_spaceexplorer.js:3516` (via aria-label "Space Explorer mission select")
  - `<div class="se-shell space-y-3" role="main" data-spaceexplorer-ux="mission-select" aria-label="Space Explorer mission select">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_swimlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_swimlab.js:82` (via class "swimlab-menu-shell")
  - `<main class="swimlab-menu-shell" data-swimlab-readiness="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_trajectorycomputing.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_trajectorycomputing.js:2406` (via id "tc-main-content")
  - `<main id="tc-main-content" class="tc-paper" tabindex="-1">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_weathersystems.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_weathersystems.js:8448` (via class "min-w-0 space-y-4")
  - `<main class="min-w-0 space-y-4">`
  - Fix any of the following: Document has more than one main landmark

### empty-table-header — Table header text should not be empty (minor; best-practice)

**sel_hub/sel_tool_costbenefit.js** (1)

- state: `tab "🖨 Print view"` [dark] — src: `sel_hub/sel_tool_costbenefit.js:372` (via aria-label "Time frame")
  - `<th scope="col" aria-label="Time frame" style="width: 15%;"></th>`
  - Fix any of the following: Element does not have text that is visible to screen readers

**stem_lab/stem_tool_statslab.js** (2)

- state: `tab "📋 Data"` [dark] — src: `stem_lab/stem_tool_statslab.js:90` (via style #94a3b8)
  - `<th scope="col" style="padding: 6px; color: var(--allo-stem-text-soft, #94a3b8); text-align: left;"></th>`
  - Fix any of the following: Element does not have text that is visible to screen readers
- state: `tab "📋 Data"` [dark] — src: not found (tag th)
  - `<th scope="col"></th>`
  - Fix any of the following: Element does not have text that is visible to screen readers

### landmark-contentinfo-is-top-level — Contentinfo landmark should not be contained in another landmark (moderate; best-practice)

**stem_lab/stem_tool_printingpress.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_printingpress.js:439` (via style #9c8a6e)
  - `<div role="contentinfo" style="margin-top: 18px; padding: 14px 14px 10px; border-radius: 8px; background: rgb(19, 16, 12); border: 1px dashed rgb(92, 70, 48); color: rgb(156, 138, 110); font-size: 11px; text-align: cente…`
  - Fix any of the following: The contentinfo landmark is contained in another landmark.

**stem_lab/stem_tool_renewables.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_renewables.js:5008` (via aria-label "Source attribution")
  - `<div role="contentinfo" aria-label="Source attribution" style="margin-top: 18px; padding: 10px 14px; border-radius: 8px; background: rgb(13, 25, 22); border: 1px dashed rgb(47, 82, 71); color: rgb(136, 168, 158); font-si…`
  - Fix any of the following: The contentinfo landmark is contained in another landmark.

### empty-heading — Headings should not be empty (minor; best-practice)

**sel_hub/sel_tool_costbenefit.js** (1)

- state: `tab "🖨 Print view"` [dark] — src: not found (tag h1)
  - `<h1 style="margin: 0px; font-size: 22px; font-weight: 900;"></h1>`
  - Fix any of the following: Element does not have text that is visible to screen readers aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements tha…

**sel_hub/sel_tool_onepageprofile.js** (1)

- state: `tab "🖨 Print view"` [dark] — src: `sel_hub/sel_tool_onepageprofile.js:441` (via style #0f172a|fontSize: 28)
  - `<h1 style="margin: 0px; font-size: 28px; font-weight: 900; color: rgb(15, 23, 42);"></h1>`
  - Fix any of the following: Element does not have text that is visible to screen readers aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements tha…

## color-contrast (WCAG 1.4.3 AA), by tool

Grouped by fg/bg/ratio; one example element per group.

**stem_lab/stem_tool_ecosystem.js** — 51 nodes

- #475569 on #1e293b = 1.93 (need 4.5:1) ×21 — first at `tab "❓ Quiz"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:9883`
  - `<p class="text-[0.6875rem] text-slate-600 mt-1">Answer questions to track your progress</p>`
- #cbd5e1 on #ffffff = 1.48 (need 4.5:1) ×5 — first at `tab "🧪 Sandbox"` [dark] — src: not found (tag div)
  - `<div>Place fox</div>`
- #e2e8f0 on #d0dcdb = 1.14 (need 4.5:1) ×5 — first at `tab "🧪 Sandbox"` [dark] — src: not found (tag li)
  - `<li>Remove all foxes and watch rabbits plus the resource index</li>`
- #5eead4 on #d0dcdb = 1.05 (need 4.5:1) [tailwind dark: variant] ×3 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8570`
  - `<span class="text-xs font-semibold text-teal-700 dark:text-teal-300">Entities Placed:</span>`
- #5eead4 on #b8cac9 = 1.15 (need 4.5:1) ×1 — first at `tab "🧪 Sandbox"` [dark] — src: not found (tag div)
  - `<div>Place rabbit</div>`
- #cbd5e1 on #d2d8e8 = 1.04 (need 4.5:1) [tailwind dark: variant] ×1 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8561`
  - `<p class="text-[0.625rem] text-slate-600 dark:text-slate-300">These buttons place entities in consistent zones without requiring canvas clicking.</p>`
- #bbf7d0 on #d2d8e8 = 1.17 (need 4.5:1) [tailwind dark: variant] ×1 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8563`
  - `<button type="button" class="flex-1 min-w-[92px] px-2 py-1 rounded border border-green-600 text-green-800 dark:text-green-200 text-[0.6875rem] font-semibold">Add rabbit left</button>`
- #fecaca on #d2d8e8 = 1.01 (need 4.5:1) [tailwind dark: variant] ×1 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8564`
  - `<button type="button" class="flex-1 min-w-[92px] px-2 py-1 rounded border border-red-600 text-red-800 dark:text-red-200 text-[0.6875rem] font-semibold">Add fox right</button>`
- #a7f3d0 on #d2d8e8 = 1.11 (need 4.5:1) [tailwind dark: variant] ×1 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8565`
  - `<button type="button" class="flex-1 min-w-[92px] px-2 py-1 rounded border border-emerald-600 text-emerald-800 dark:text-emerald-200 text-[0.6875rem] font-semibold">Add plant center</button>`
- #e2e8f0 on #d2d8e8 = 1.15 (need 4.5:1) [tailwind dark: variant] ×1 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8566`
  - `<button type="button" class="flex-1 min-w-[92px] px-2 py-1 rounded border border-slate-500 text-slate-700 dark:text-slate-200 text-[0.6875rem] font-semibold">Reset sandbox</button>`
- … 11 more colour pairs in aggregate.json

**stem_lab/stem_tool_geologyexplorer.js** — 43 nodes

- #0f172a on #1a2436 = 1.14 (need 4.5:1) ×43 — first at `open 3 toggles` [dark] — src: `stem_lab/stem_tool_geologyexplorer.js:30`
  - `<span class="block truncate text-[10.5px] font-extrabold">🔒 Soil / Regolith</span>`

**stem_lab/stem_tool_anatomy.js** — 31 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×18 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:13623`
  - `<p style="margin: 3px 0px 0px; color: var(--allo-stem-text-soft, #475569); font-size: 11px; line-height: 1.45; font-style: italic;">Click any organ to see its structure, function, and connections. Hov…`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×5 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:3118`
  - `<p class="text-xs text-slate-600">Bones support movement, protect organs, store minerals, and house blood-forming marrow. Counts depend on age and anatomical conventions.</p>`
- #475569 on #1a2234 = 2.09 (need 4.5:1) ×2 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_anatomy.js:1897`
  - `<span class="text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mr-1">🧠 Layers</span>`
- #4338ca on #1a2234 = 2 (need 4.5:1) ×2 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_anatomy.js:13720`
  - `<button type="button" data-anatomy-layer-isolate="true" aria-label="Show only Skeletal layer" title="Temporarily show only the Skeletal layer" class="px-2 py-1 rounded-lg text-[0.6875rem] font-bold te…`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×2 — first at `tab "🏠 Homeostasis"` [dark] — src: `stem_lab/stem_tool_anatomy.js:15981`
  - `<textarea aria-label="Homeostasis hypothesis" placeholder="Hypothesis: What does each variable help regulate? Why can we not compare range widths measured in different units?" class="w-full text-[0.75…`
- #1e293b on #0f172a = 1.22 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:2`
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🫀 Human Anatomy Explorer</h3>`
- #cbd5e1 on #f8fafc = 1.41 (need 4.5:1) ×1 — first at `open 8 toggles` [dark] — src: `stem_lab/stem_tool_anatomy.js:6723`
  - `<p class="anatomy-recall-evidence" data-anatomy-recall-evidence="quads">No scored answers recorded yet. Confidence is your self-rating, not a mastery score.</p>`

**stem_lab/stem_tool_playlab.js** — 17 nodes

- #475569 on #0f172a = 2.35 (need 4.5:1) ×15 — first at `tab "Scout"` [dark] — src: `stem_lab/stem_tool_playlab.js:279`
  - `<div role="columnheader" style="width: 38px; flex-shrink: 0; text-align: center; font-size: 9px; color: rgb(71, 85, 105); font-weight: 500; padding: 2px 0px;">High</div>`
- #b45309 on #0f172a = 3.55 (need 4.5:1) ×2 — first at `tab "Scout"` [dark] — src: `stem_lab/stem_tool_playlab.js:1123`
  - `<div role="columnheader" style="width: 38px; flex-shrink: 0; text-align: center; font-size: 9px; color: rgb(180, 83, 9); font-weight: 700; padding: 2px 0px;">Mid-Block</div>`

**stem_lab/stem_tool_echolocation.js** — 8 nodes

- #818cf8 on #2a2e61 = 4.23 (need 4.5:1) ×6 — first at `tab "🌊Sound Waves"` [dark] — src: `stem_lab/stem_tool_echolocation.js:3362`
  - `<span class="text-[0.6875rem] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400">1910s</span>`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×2 — first at `tab "🔦3D Cave"` [dark] — src: `stem_lab/stem_tool_echolocation.js:1763`
  - `<p>Loading 3D engine... (Three.js required)</p>`

**stem_lab/stem_tool_wave.js** — 3 nodes

- #312e81 on #1e293b = 1.28 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_wave.js:2545`
  - `<p class="text-xs text-indigo-900 font-semibold flex-1 min-w-[220px] m-0">Ready to think like a physicist? Two open-ended investigations — no answer dumps, just you and the data.</p>`
- #7e22ce on #1e293b = 2.09 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_wave.js:2788`
  - `<span class="text-sm font-bold text-purple-700">✨ Explain at my level</span>`
- #475569 on #1e293b = 1.93 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_wave.js:2810`
  - `<p class="text-[0.6875rem] italic text-slate-600">Click “Explain” for the AI tutor to describe the current wave at your chosen reading level.</p>`

**stem_lab/stem_tool_music.js** — 3 nodes

- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [dark] — src: `stem_lab/stem_tool_music.js:1229`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(239, 68, 68);">Kick</span>`
- #3b82f6 on #1e293b = 3.97 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [dark] — src: `stem_lab/stem_tool_music.js:1908`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(59, 130, 246);">Cymbal</span>`
- #8b5cf6 on #1e293b = 3.45 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [dark] — src: `stem_lab/stem_tool_music.js:1909`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(139, 92, 246);">Tom Hi</span>`

**stem_lab/stem_tool_a11yauditor.js** — 2 nodes

- #717b8c on #ffffff = 4.27 (need 4.5:1) ×2 — first at `tab "📖 Learn"` [dark] — src: `stem_lab/stem_tool_a11yauditor.js:942`
  - `<div class="text-base font-bold">Sample text</div>`

**stem_lab/stem_tool_beehive.js** — 2 nodes

- #edf5e9 on #ffffff = 1.11 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_beehive.js:28755`
  - `<textarea id="beehive-thermo-hypothesis" placeholder="Hypothesis: At 40°C outside, how many fanning bees keep the brood area near 34–36°C?" class="w-full text-[0.75rem] border border-slate-300 rounded…`
- #4f46e5 on #10182a = 2.81 (need 4.5:1) ×1 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_beehive.js:27526`
  - `<div class="text-[0.625rem] font-black uppercase tracking-[0.14em] text-indigo-600">Next revision</div>`

**stem_lab/stem_tool_titration.js** — 1 nodes

- #0e7490 on #0f172a = 3.33 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_titration.js:649`
  - `<button type="button" aria-label="Back" class="text-xs font-bold transition-colors titr-back" style="color: rgb(14, 116, 144);">← Back</button>`

**stem_lab/stem_tool_physics.js** — 1 nodes

- #475569 on #0f172a = 2.35 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_physics.js:2754`
  - `<p id="physics-gravity-presets-help" class="mb-2 text-xs text-slate-600">Changes gravity only. Launch angle, velocity, mass, and air drag stay as you set them.</p>`

## Harness errors / render problems (separate from violations)


## Clean tools

`stem_tool_artstudio.js`, `stem_tool_wheelandfire.js`, `stem_tool_applab.js`, `stem_tool_forge.js`, `stem_tool_ratios.js`, `stem_tool_areaperimeter.js`, `stem_tool_timeschedule.js`, `stem_tool_citylab.js`, `stem_tool_arccity.js`, `stem_tool_funcgrapher.js`, `stem_tool_geosandbox.js`, `stem_tool_printlab.js`, `stem_tool_watercycle.js`, `stem_tool_platetectonics.js`, `stem_tool_dinolab.js`, `stem_tool_dissection.js`, `stem_tool_cyberdefense.js`, `stem_tool_logiclab.js`, `stem_tool_punnett.js`, `stem_tool_semiconductor.js`, `stem_tool_gamestudio.js`, `stem_tool_molecule.js`, `stem_tool_universe.js`, `stem_tool_economicslab.js`, `stem_tool_treelab.js`, `stem_tool_machinelab.js`, `stem_tool_graphcalc.js`, `stem_tool_magnetism.js`, `stem_tool_climateExplorer.js`, `stem_tool_stewardship.js`, `stem_tool_spacecolony.js`, `stem_tool_spacestation.js`, `stem_tool_coasterlab.js`, `stem_tool_worldbuilder.js`, `stem_tool_flightsim.js`, `stem_tool_atctower.js`, `stem_tool_throwlab.js`, `stem_tool_echotrainer.js`, `stem_tool_butterfly.js`, `stem_tool_geometryworld.js`, `stem_tool_freeforms.js`, `stem_tool_roadready.js`, `stem_tool_firstresponse.js`, `stem_tool_bikelab.js`, `stem_tool_evolab.js`, `stem_tool_weldlab.js`, `stem_tool_nutritionlab.js`, `stem_tool_bakingscience.js`, `stem_tool_allobotsage.js`, `stem_tool_skatelab.js`, `stem_tool_optics.js`, `stem_tool_typingpractice.js`, `stem_tool_assessmentliteracy.js`, `stem_tool_cephalopodlab.js`, `stem_tool_astronomy.js`, `stem_tool_bridgelab.js`, `stem_tool_microbiology.js`, `stem_tool_raptorhunt.js`, `stem_tool_schoolbehaviortoolkit.js`, `stem_tool_parentinglab.js`, `stem_tool_lawnavigator.js`, `stem_tool_eligibility.js`, `stem_tool_papertrail.js`, `stem_tool_lumen.js`, `stem_tool_cellular.js`, `stem_tool_accesslens.js`, `stem_tool_datalab.js`, `stem_tool_simshelf.js`, `stem_tool_circuitshelf.js`, `stem_tool_moleculeshelf.js`, `stem_tool_particlelab3d.js`, `stem_tool_zoomgallery.js`, `stem_tool_scaleexplorer.js`, `sel_tool_zones.js`, `sel_tool_coping.js`, `sel_tool_emotions.js`, `sel_tool_mindfulness.js`, `sel_tool_somaticreset.js`, `sel_tool_social.js`, `sel_tool_perspective.js`, `sel_tool_decisions.js`, `sel_tool_conflict.js`, `sel_tool_strengths.js`, `sel_tool_goals.js`, `sel_tool_community.js`, `sel_tool_teamwork.js`, `sel_tool_journal.js`, `sel_tool_safety.js`, `sel_tool_crisiscompanion.js`, `sel_tool_advocacy.js`, `sel_tool_civicaction.js`, `sel_tool_ethicalreasoning.js`, `sel_tool_cultureexplorer.js`, `sel_tool_growthmindset.js`, `sel_tool_compassion.js`, `sel_tool_friendship.js`, `sel_tool_transitions.js`, `sel_tool_upstander.js`, `sel_tool_voicedetective.js`, `sel_tool_sociallab.js`, `sel_tool_peersupport.js`, `sel_tool_execfunction.js`, `sel_tool_digitalwellbeing.js`, `sel_tool_anxietytoolkit.js`, `sel_tool_behavioralactivation.js`, `sel_tool_bigfeelings.js`, `sel_tool_bodystory.js`, `sel_tool_careconstellations.js`, `sel_tool_careercompass.js`, `sel_tool_circlesofsupport.js`, `sel_tool_crewprotocols.js`, `sel_tool_dearman.js`, `sel_tool_disabilityvoices.js`, `sel_tool_ecomap.js`, `sel_tool_genogram.js`, `sel_tool_griefloss.js`, `sel_tool_healthyrelationships.js`, `sel_tool_identitysupport.js`, `sel_tool_landplace.js`, `sel_tool_maps.js`, `sel_tool_motivationalinterviewing.js`, `sel_tool_orientations.js`, `sel_tool_path.js`, `sel_tool_perma.js`, `sel_tool_quietquestions.js`, `sel_tool_sensoryregulation.js`, `sel_tool_sfbt.js`, `sel_tool_sleep.js`, `sel_tool_sourcesofstrength.js`, `sel_tool_stressbucket.js`, `sel_tool_substancepsychoed.js`, `sel_tool_thoughtrecord.js`, `sel_tool_tipp.js`, `sel_tool_traumapsychoed.js`, `sel_tool_valuescommittedaction.js`, `sel_tool_viastrengths.js`, `sel_tool_wheeloflife.js`, `sel_tool_windowoftolerance.js`
