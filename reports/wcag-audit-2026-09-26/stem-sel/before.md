# STEM Lab + SEL Hub — axe depth audit (WCAG 2.2 A/AA)

Generated 2026-09-26T05:26:14.014Z by `/tmp/claude-0/-home-user-AlloFlow/3efddaaf-b151-5c02-b4cf-dbf152bb6493/scratchpad/stemsel/summarize.cjs` from `out/*.json` (per-tool raw) — harness `probe.cjs`.

## Method

- Tool set = the modules the app actually fetches (`stemToolModules` / `selToolModules` in AlloFlowANTI.txt): 149 unique STEM (stem_tool_forge.js is listed twice) + 72 SEL tool files. `stem_lab/stem_tool_timeline.js` is on disk but NOT in the manifest, so it was not audited.
- Each tool rendered in Chromium through the REAL hub `renderTool` (stem_lab_module.js / sel_hub_module.js), with the manifest support modules loaded, React 18 UMD production, static Tailwind build of stem_lab + sel_hub, the STEM palette from app_styles_module.js, and a ctx whose `update`/`updateMulti` really set state (the repo probe passes no-ops).
- States walked (same as dev-tools/axe_a11y_depth.cjs): baseline → open every `<details>` → click each `[aria-expanded=false]` toggle one by one → click each `[role=tab]` (max 40) and re-open revealed `<details>`; axe after each. Violations are billed to the FIRST state that exposed them. Run in light and dark (dark = theme-dark host, OS `prefers-color-scheme: dark`).
- axe-core 4.12.1, all rules except page-level ones (region, bypass, landmark-one-main, page-has-heading-one) and AAA color-contrast-enhanced. "WCAG A/AA" below = rules tagged wcag2a/2aa/21a/21aa/22aa; best-practice-only rules are listed separately.
- Source lines are a heuristic grep (aria-label/id/placeholder/text/class/inline colour from the snippet): treat as the likely site, verify before editing.

## Totals

- Tool files audited: 220 (148 STEM, 72 SEL); excluded as not-a-tool (registers nothing): stem_lab/stem_tool_geometryworld_builder.js
- Harness-errored / did not fully render: 0
- Clean (no violations of any kind, no harness errors): 76
- Clean of WCAG A/AA (no contrast, no A/AA rule; best-practice findings allowed): 131 (118 STEM, 13 SEL)
- Tools that CRASHED on a walked state (real product bugs; audit resumed after remount): stem_tool_statslab.js, sel_tool_zones.js, sel_tool_coping.js, sel_tool_sleep.js
- Tools with ≥1 non-contrast WCAG A/AA violation: 7
- Tools with ≥1 color-contrast violation: 86

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
| heading-order | best-practice | best-practice | 80 | 48 |
| aria-allowed-role | best-practice | best-practice | 41 | 8 |
| landmark-main-is-top-level | best-practice | best-practice | 31 | 25 |
| landmark-no-duplicate-main | best-practice | best-practice | 31 | 25 |
| aria-required-parent | yes | wcag2a wcag131 | 21 | 1 |
| landmark-contentinfo-is-top-level | best-practice | best-practice | 3 | 2 |
| scrollable-region-focusable | yes | wcag2a wcag211 wcag213 | 2 | 1 |
| nested-interactive | yes | wcag2a wcag412 | 2 | 2 |
| aria-progressbar-name | yes | wcag2a wcag111 | 2 | 2 |
| empty-heading | best-practice | best-practice | 2 | 2 |
| aria-required-children | yes | wcag2a wcag131 | 1 | 1 |
| link-in-text-block | yes | wcag2a wcag141 | 1 | 1 |
| empty-table-header | best-practice | best-practice | 1 | 1 |

## Non-contrast WCAG A/AA violations, by rule then tool

### aria-required-parent — Certain ARIA roles must be contained by particular parents (critical; wcag2a, wcag131)

**stem_lab/stem_tool_playlab.js** (21)

- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:314` (via text "Hot streak")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Hot streak</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light] — src: `stem_lab/stem_tool_playlab.js:1799` (via style #b45309)
  - `<span role="cell" style="color: rgb(180, 83, 9); font-weight: 700; font-family: ui-monospace, monospace; text-align: right;">0</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:316` (via text "High-xG sequences")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">High-xG sequences</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light] — src: `stem_lab/stem_tool_playlab.js:1799` (via style #b45309)
  - `<span role="cell" style="color: rgb(180, 83, 9); font-weight: 700; font-family: ui-monospace, monospace; text-align: right;">—</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:317` (via text "Concepts run")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Concepts run</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light] — src: `stem_lab/stem_tool_playlab.js:1799` (via style #b45309)
  - `<span role="cell" style="color: rgb(180, 83, 9); font-weight: 700; font-family: ui-monospace, monospace; text-align: right;">0 / 13</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:318` (via text "Defensive shapes faced")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Defensive shapes faced</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light] — src: `stem_lab/stem_tool_playlab.js:1799` (via style #b45309)
  - `<span role="cell" style="color: rgb(180, 83, 9); font-weight: 700; font-family: ui-monospace, monospace; text-align: right;">0 / 4</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:319` (via text "Set-piece run")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Set-piece run</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:320` (via text "Set-piece types")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Set-piece types</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light] — src: `stem_lab/stem_tool_playlab.js:1799` (via style #b45309)
  - `<span role="cell" style="color: rgb(180, 83, 9); font-weight: 700; font-family: ui-monospace, monospace; text-align: right;">0 / 5</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:321` (via text "Custom high-xG")
  - `<span role="rowheader" style="color: var(--allo-stem-text-soft, #94a3b8);">Custom high-xG</span>`
  - Fix any of the following: Required ARIA parent role not present: row
- … 9 more in aggregate.json

### scrollable-region-focusable — Scrollable region must have keyboard access (serious; wcag2a, wcag211, wcag213)

**stem_lab/stem_tool_dna.js** (2)

- state: `tab "🧪Protein"` [light+dark] — src: `stem_lab/stem_tool_dna.js:5228` (via class "p-3 space-y-2 max-h-60 overflow-y-auto")
  - `<div class="p-3 space-y-2 max-h-60 overflow-y-auto">`
  - Fix any of the following: Element should have focusable content Element should be focusable
- state: `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:5624` (via class "p-3 grid grid-cols-4 gap-1 text-[0.6875rem] font-m")
  - `<div class="p-3 grid grid-cols-4 gap-1 text-[0.6875rem] font-mono max-h-60 overflow-y-auto">`
  - Fix any of the following: Element should have focusable content Element should be focusable

### nested-interactive — Interactive controls must not be nested (serious; wcag2a, wcag412)

**sel_hub/sel_tool_orientations.js** (1)

- state: `tab "🧭 Compass"` [light+dark] — src: not found (tag svg)
  - `<svg viewBox="0 0 600 440" width="100%" role="img" aria-label="Scatter of eight tra..." style="background: rgb(11, ...">`
  - Fix any of the following: Element has focusable descendants

**stem_lab/stem_tool_rocks.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_rocks.js:7009` (via aria-label "Igneous, metamorphic and sedimentary rock, with …)
  - `<svg viewBox="0 0 420 240" width="100%" role="img" aria-label="Igneous, metamorphic and sedimentary rock, with arrows both ways between every pair." style="display: block;">`
  - Fix any of the following: Element has focusable descendants

### aria-progressbar-name — ARIA progressbar nodes must have an accessible name (serious; wcag2a, wcag111)

**sel_hub/sel_tool_perma.js** (1)

- state: `tab "✏️ Self-check"` [light+dark] — src: `sel_hub/sel_tool_perma.js:157` (via style #1e293b)
  - `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="height: 6px; border-radius: 3px; background: rgb(30, 41, 59); overflow: hidden;"><div style="height: 100%; width: 0%; background: lin…`
  - Fix any of the following: aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty Element …

**sel_hub/sel_tool_restorativecircle.js** (1)

- state: `tab "🏅 Badges"` [light+dark] — src: `sel_hub/sel_tool_restorativecircle.js:2676` (via class "h-2 rounded-full transition-all")
  - `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" class="h-2 rounded-full transition-all bg-slate-400" style="width: 0%;"></div>`
  - Fix any of the following: aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty Element …

### aria-required-children — Certain ARIA roles must contain particular children (critical; wcag2a, wcag131)

**stem_lab/stem_tool_playlab.js** (1)

- state: `tab "Scout"` [light+dark] — src: `stem_lab/stem_tool_playlab.js:4158` (via aria-label "Session stats")
  - `<div role="table" aria-label="Session stats" style="margin-top: 10px; display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; font-size: 12px;">`
  - Fix any of the following: Element has children which are not allowed: [role=rowheader], [role=cell]

### link-in-text-block — Links must be distinguishable without relying on color (serious; wcag2a, wcag141)

**stem_lab/stem_tool_swimlab.js** (1)

- state: `baseline` [dark] — src: `stem_lab/stem_tool_swimlab.js:25` (via text "Red Cross")
  - `<a href="https://www.redcross.org/take-a-class/swimming" target="_blank" rel="noopener" style="color: rgb(186, 230, 253);">Red Cross</a>`
  - Fix any of the following: The link has insufficient color contrast of 1.93:1 with the surrounding text. (Minimum contrast is 3:1, link text: #bae6fd, surrounding text: #94a3b8) The link has no styling…

## Best-practice-only findings (not WCAG A/AA failures)

### heading-order — Heading levels should only increase by one (moderate; best-practice)

**sel_hub/sel_tool_coping.js** (2)

- state: `tab "🎭 Scenarios"` [light+dark] — src: `sel_hub/sel_tool_coping.js:9267` (via text "Test Anxiety")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 14px; font-weight: 700;">📚 Test Anxiety (Middle School)</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "🚨 Crisis"` [light+dark] — src: `sel_hub/sel_tool_coping.js:19777` (via text "Active Panic Attack")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 13px; font-weight: 700;">Active Panic Attack</h5>`
  - Fix any of the following: Heading order invalid

**sel_hub/sel_tool_howl.js** (9)

- state: `tab "🎯 HOWL Radar"` [light+dark] — src: `sel_hub/sel_tool_howl.js:5054` (via text "Active Engagement")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 13px; font-weight: 700;">Active Engagement</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "🧪 SMART Lab"` [light+dark] — src: `sel_hub/sel_tool_howl.js:14357` (via style #fbbf24|fontSize: 14)
  - `<h4 style="margin: 0px; color: rgb(251, 191, 36); font-size: 14px; font-weight: 800;">SMART Score: 0 / 5</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "📋 Rubric"` [light+dark] — src: `sel_hub/sel_tool_howl.js:5054` (via text "Active Engagement")
  - `<h4 style="margin: 0px; color: rgb(14, 165, 233); font-size: 16px; font-weight: 800;">Active Engagement</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌟 Exemplars"` [light+dark] — src: `sel_hub/sel_tool_howl.js:7554` (via text "Tomas")
  - `<h4 style="margin: 4px 0px; color: rgb(253, 230, 138); font-size: 14px; font-weight: 800;">Tomas</h4>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎓 Graduate"` [light+dark] — src: `sel_hub/sel_tool_howl.js:7831` (via text "Self-Knowledge")
  - `<h5 style="margin: 0px; color: rgb(253, 230, 138); font-size: 14px; font-weight: 800;">Self-Knowledge</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "⏱️ Run Protocol"` [light+dark] — src: `sel_hub/sel_tool_howl.js:4660` (via text "Council")
  - `<h5 style="margin: 0px; color: rgb(241, 245, 249); font-size: 14px; font-weight: 700;">Council</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "📚 Goals Library"` [light+dark] — src: `sel_hub/sel_tool_howl.js:7512` (via text ""By end of quarter, I will answer at lea")
  - `<h5 style="margin: 4px 0px; color: rgb(253, 230, 138); font-size: 13px; font-weight: 600; line-height: 1.5;">"By end of quarter, I will answer at least one question in class on 3 of 5 days."</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "⚖️ Climate Scenarios"` [light+dark] — src: `sel_hub/sel_tool_howl.js:15113` (via text "How to navigate any of these")
  - `<h5 style="margin: 0px 0px 6px; color: rgb(241, 245, 249); font-size: 13px; font-weight: 800;">How to navigate any of these</h5>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎭 Rituals"` [light+dark] — src: `sel_hub/sel_tool_howl.js:7638` (via text "Rose Thorn Bud")
  - `<h5 style="margin: 0px; color: rgb(253, 230, 138); font-size: 13px; font-weight: 700;">Rose Thorn Bud</h5>`
  - Fix any of the following: Heading order invalid

**sel_hub/sel_tool_restorativecircle.js** (1)

- state: `tab "🧠 Empathy"` [light+dark] — src: `sel_hub/sel_tool_restorativecircle.js:847` (via text "What they SAID")
  - `<h5 id="rc-empathy-personA-said-label" class="text-xs font-bold" style="color: rgb(59, 130, 246);">What they SAID</h5>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_algebracas.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_algebracas.js:2` (via text "Algebra CAS")
  - `<h3 style="font-size: 16px; font-weight: 700; margin: 0px;">🧮 Algebra CAS</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_anatomy.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_anatomy.js:2` (via text "Human Anatomy Explorer")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🫀 Human Anatomy Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_angles.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_angles.js:2` (via text "Angle Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📐 Angle Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_aquarium.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_aquarium.js:2212` (via text "Aquaculture")
  - `<h3 class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">🐠 Aquaculture &amp; Ocean Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_archstudio.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_archstudio.js:4883` (via id "arch-floor-visibility-heading")
  - `<h3 id="arch-floor-visibility-heading">Floor visibility</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_areamodel.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_areamodel.js:2` (via text "Area Model")
  - `<h3 class="text-lg font-bold text-amber-800">🟧 Area Model</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_arithmetic.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_arithmetic.js:728` (via text "Place-value model")
  - `<h3 class="text-sm font-black" style="color: rgb(37, 99, 235);">Place-value model</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_arithmetic.js:728` (via text "Place-value model")
  - `<h3 class="text-sm font-black" style="color: rgb(147, 197, 253);">Place-value model</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_beehive.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_beehive.js:28787` (via text "🐝 Beehive Colony Simulator")
  - `<h3 class="text-xl font-black tracking-tight sm:text-2xl text-slate-800">🐝 Beehive Colony Simulator</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_beehive.js:28787` (via text "🐝 Beehive Colony Simulator")
  - `<h3 class="text-xl font-black tracking-tight sm:text-2xl text-slate-100">🐝 Beehive Colony Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_birdlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_birdlab.js:1447` (via text "Common Eider")
  - `<h3 style="font-size: 1.25rem; font-weight: 900; color: rgb(30, 41, 59); line-height: 1.15; margin-bottom: 2px; text-shadow: rgba(255, 255, 255, 0.85) 0px 1px 0px;">Common Eider</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_brainatlas.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_brainatlas.js:37` (via text "Brain Atlas")
  - `<h3 class="brainatlas-topbar-title">🧠 Brain Atlas</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_calculus.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_calculus.js:2100` (via text "Calculus Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">∫ Calculus Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_cell.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_cell.js:1965` (via text "Cell Simulator")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🔬 Cell Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_chembalance.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_chembalance.js:2` (via text "Chemistry Lab")
  - `<h3 class="text-lg font-bold text-slate-800">⚗️ Chemistry Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_circuit.js** (2)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_circuit.js:2` (via text "Circuit Builder")
  - `<h3 class="text-lg font-bold text-white tracking-tight">🔌 Circuit Builder</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📘Reference"` [light+dark] — src: `stem_lab/stem_tool_circuit.js:6236` (via text "Circuit Reference Library")
  - `<h3 class="text-base font-black text-amber-900">⚡ Circuit Reference Library</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_coding.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_coding.js:2529` (via text "Welcome to the Coding Playground!")
  - `<h3 class="text-sm font-bold text-white mb-2">Welcome to the Coding Playground!</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_companionplanting.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_companionplanting.js:11708` (via text "🌱 Companion Planting Lab")
  - `<h3 class="text-lg font-bold text-white">🌱 Companion Planting Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_coordgrid.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_coordgrid.js:2` (via text "Coordinate Grid")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📍 Coordinate Grid</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_dataplot.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_dataplot.js:2` (via text "Data Plotter")
  - `<h3 class="text-lg font-bold text-slate-800">📊 Data Plotter</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_datastudio.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_datastudio.js:693` (via text "📊 Charts & Graphs")
  - `<h3 class="text-lg font-bold flex items-center gap-2">📊 Charts &amp; Graphs</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_decomposer.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_decomposer.js:1` (via text "Material Decomposer")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">⚗️ Material Decomposer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_dna.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_dna.js:2` (via text "DNA / Genetics Lab")
  - `<h3 class="dna-command-title">DNA / Genetics Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_echolocation.js** (7)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5316` (via text "hearing as imaging")
  - `<h3 style="color: rgb(99, 102, 241); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sonar Vision — hearing as imaging</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🔦3D Cave"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5317` (via text "map by sound")
  - `<h3 style="color: rgb(8, 145, 178); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">3D Cave — map by sound</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌊Sound Waves"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5318` (via text "wavelength meets target size")
  - `<h3 style="color: rgb(14, 165, 233); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sound Waves — wavelength meets target size</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🚨Doppler Effect"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5319` (via text "the moving-prey signature")
  - `<h3 style="color: rgb(234, 88, 12); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Doppler Effect — the moving-prey signature</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🦠Bat Biology"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5320` (via text "the auditory specialist")
  - `<h3 style="color: rgb(147, 51, 234); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Bat Biology — the auditory specialist</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌳Acoustic Ecology"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5321` (via text "a soundscape we can")
  - `<h3 style="color: rgb(22, 163, 74); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Acoustic Ecology — a soundscape we can’t hear</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎵Sweep Discovery"` [light+dark] — src: `stem_lab/stem_tool_echolocation.js:5322` (via text "Sweep Discovery — tune the chirp")
  - `<h3 style="color: rgb(34, 211, 238); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Sweep Discovery — tune the chirp</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_ecosystem.js** (3)

- state: `tab "🕸 Food web"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:2600` (via text "One meadow. More connections.")
  - `<h3>One meadow. More connections.</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:9298` (via text "Conservation Manager: Maine")
  - `<h3 style="margin: 0px; color: rgb(134, 239, 172); font-size: 22px;">Conservation Manager: Maine</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "❔ Inquiry"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:9653` (via class "text-sm font-black text-slate-800 dark:text-slate-")
  - `<h4 class="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">❔ Meadow predator-prey parameter lab</h4>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_epidemic.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_epidemic.js:12` (via text "Epidemic Modeling Lab")
  - `<h3 class="text-base font-bold text-slate-800">Epidemic Modeling Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_fisherlab.js** (1)

- state: `tab "🎮 3D Sim"` [light+dark] — src: `stem_lab/stem_tool_fisherlab.js:20993` (via id "fl-core-mission-title")
  - `<h3 id="fl-core-mission-title" style="margin: 0px 0px 4px; color: rgb(248, 250, 252); font-size: 16px;">Casco Bay Stewardship Run</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_fractions.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_fractions.js:2` (via text "Fraction Lab")
  - `<h3 class="text-lg font-bold text-rose-800">🍕 Fraction Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_galaxy.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_galaxy.js:41` (via id "galaxy-tool-title")
  - `<h3 id="galaxy-tool-title" class="text-xl font-black text-slate-900">`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_geo.js** (10)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_geo.js:2073` (via text "the visual atlas")
  - `<h3 style="color: rgb(15, 118, 110); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Find Country — the visual atlas</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏛️ Capitals"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2074` (via text "cultural anchors")
  - `<h3 style="color: rgb(126, 34, 206); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Capitals — govt seats + cultural anchors</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌍 Continents"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2075` (via text "or 5, depending who you ask")
  - `<h3 style="color: rgb(21, 128, 61); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Continents — 7 (or 5, depending who you ask)</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏔️ Landmarks"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2076` (via text "the visual mnemonics")
  - `<h3 style="color: rgb(180, 83, 9); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Landmarks — the visual mnemonics</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📏 Size Compare"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2077` (via text "fight Mercator distortion")
  - `<h3 style="color: rgb(14, 116, 144); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Size Compare — fight Mercator distortion</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🌐 Globe View"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2078` (via text "honest spherical geometry")
  - `<h3 style="color: rgb(29, 78, 216); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Globe View — honest spherical geometry</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🏆 Quiz Builder"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2079` (via text "graded geography practice")
  - `<h3 style="color: rgb(185, 28, 28); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Quiz Builder — graded geography practice</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "📍 Distance"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2080` (via text "great-circle math")
  - `<h3 style="color: rgb(194, 65, 12); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Distance — great-circle math</h3>`
  - Fix any of the following: Heading order invalid
- state: `tab "🎚️ Distance Sense"` [light+dark] — src: `stem_lab/stem_tool_geo.js:2081` (via text "calibrate your gut")
  - `<h3 style="color: rgb(14, 116, 144); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Distance Sense — calibrate your gut</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_geo.js:4404` (via text "📐 Geometry Prover")
  - `<h3 class="text-lg font-bold text-violet-800">📐 Geometry Prover</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_heatlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_heatlab.js:1937` (via text "🌡️ Heat & Thermodynamics Lab")
  - `<h3 class="text-lg font-black tracking-tight text-white">🌡️ Heat &amp; Thermodynamics Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_inequality.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_inequality.js:2` (via text "Inequality Grapher")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🎨 Inequality Grapher</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_kitchenlab.js** (1)

- state: `tab "🔬Browning Lab"` [light+dark] — src: `stem_lab/stem_tool_kitchenlab.js:7710` (via text "🔬 Maillard browning discovery")
  - `<h3 class="text-sm font-black text-orange-700">🔬 Maillard browning discovery</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_lifeskills.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_lifeskills.js:2` (via text "Life Skills Lab")
  - `<h3 class="text-base font-bold flex items-center gap-2">🧭 Life Skills Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_manipulatives.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_manipulatives.js:2` (via text "Math Manipulatives")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🧮 Math Manipulatives</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_moonmission.js:12` (via text "Apollo Moon Mission")
  - `<h3 class="text-lg font-black text-slate-800 flex items-center gap-2">🚀 Apollo Moon Mission</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_multtable.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_multtable.js:2` (via text "Multiplication Table")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">🔢 Multiplication Table</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_music.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_music.js:2` (via text "Music Synthesizer")
  - `<h3 class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">🎹 Music Synthesizer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_nuclearlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_nuclearlab.js:4461` (via text "☢️ Nuclear & Radiation Lab")
  - `<h3 class="text-lg font-black tracking-tight text-white">☢️ Nuclear &amp; Radiation Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_numberline.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_numberline.js:2` (via text "Number Line")
  - `<h3 class="text-lg font-bold text-blue-800">📏 Number Line</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_physics.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_physics.js:2` (via text "Physics Simulator")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">⚡ Physics Simulator</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_probability.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_probability.js:12` (via text "Probability Lab")
  - `<h3 class="text-lg font-bold" style="color: rgb(30, 41, 59);">🎲 Probability Lab</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_probability.js:12` (via text "Probability Lab")
  - `<h3 class="text-lg font-bold" style="color: rgb(224, 231, 255);">🎲 Probability Lab</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_rocks.js** (2)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_rocks.js:4680` (via text "Minerals Explorer")
  - `<h3 class="min-w-0 flex-1 text-lg font-bold text-slate-800 tracking-tight leading-tight">🪨 Rocks &amp; Minerals Explorer</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_rocks.js:12` (via text "Rock Cycle")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🪨 Rock Cycle</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_solarsystem.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_solarsystem.js:2` (via text "Solar System Explorer")
  - `<h3 class="text-lg font-bold text-slate-800">🌍 Solar System Explorer</h3>`
  - Fix any of the following: Heading order invalid
- state: `baseline` [dark] — src: `stem_lab/stem_tool_solarsystem.js:2` (via text "Solar System Explorer")
  - `<h3 class="text-lg font-bold text-slate-100">🌍 Solar System Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_unitconvert.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_unitconvert.js:358` (via text "Unit Converter")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📏 Unit Converter</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_volume.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_volume.js:2` (via text "3D Volume Explorer")
  - `<h3 class="mt-3 text-xl font-black tracking-tight sm:text-2xl">📦 3D Volume Explorer</h3>`
  - Fix any of the following: Heading order invalid

**stem_lab/stem_tool_wave.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_wave.js:2` (via text "Wave Simulator")
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🌊 Wave Simulator</h3>`
  - Fix any of the following: Heading order invalid

### aria-allowed-role — ARIA role should be appropriate for the element (minor; best-practice)

**sel_hub/sel_tool_conflicttheater.js** (8)

- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Missing Lunch Money" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232…`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Rumor That Got Out" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232,…`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_conflicttheater.js:68` (via style #334155|#1e293b|#e2e8f0)
  - `<button role="listitem" aria-label="Pick scenario: The Group Project Cut" style="text-align: left; padding: 12px; border-radius: 12px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(226, 232, …`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The P..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The Idea That Wasn't Hers" ...>`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The Screenshot That Got Sent" ...>`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The L..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element
- state: `baseline` [light+dark] — src: not found (tag button)
  - `<button role="listitem" aria-label="Pick scenario: The "..." style="text-align: left; pa...">`
  - Fix any of the following: ARIA role listitem is not allowed for given element

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `tab "✏️ Letter Builder"` [light+dark] — src: `sel_hub/sel_tool_selfadvocacy.js:3352` (via aria-label "Choose a letter template")
  - `<section class="no-print" role="radiogroup" aria-label="Choose a letter template">`
  - Fix any of the following: ARIA role radiogroup is not allowed for given element

**stem_lab/stem_tool_aquarium.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_aquarium.js:22310` (via id "aquarium-learning-path")
  - `<details id="aquarium-learning-path" role="region" aria-labelledby="aquarium-learning-path-title" class="mb-2 rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-3 shadow-sm" style="an…`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_gisstudio.js:6174` (via style #38bdf8|#102c3b|#bae6fd|fontSize: 11)
  - `<aside role="status" style="margin-top: 8px; padding: 10px; border-left: 4px solid rgb(56, 189, 248); border-radius: 8px; background: rgb(16, 44, 59); color: rgb(186, 230, 253); font-size: 11px; line-height: 1.45;">`
  - Fix any of the following: ARIA role status is not allowed for given element

**stem_lab/stem_tool_money.js** (2)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_money.js:2623` (via aria-label "Money Math studio")
  - `<details class="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden" data-moneymath-focus="true" role="region" aria-label="Money Math studio">`
  - Fix any of the following: ARIA role region is not allowed for given element
- state: `expand 1 <details>` [light+dark] — src: `stem_lab/stem_tool_money.js:2623` (via aria-label "Money Math studio")
  - `<details class="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden" data-moneymath-focus="true" role="region" aria-label="Money Math studio" open="">`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_numberline.js** (2)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_numberline.js:2018` (via aria-label "Number Line workspace")
  - `<details class="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden" data-numberline-focus="true" role="region" aria-label="Number Line workspace">`
  - Fix any of the following: ARIA role region is not allowed for given element
- state: `expand 2 <details>` [light+dark] — src: `stem_lab/stem_tool_numberline.js:2018` (via aria-label "Number Line workspace")
  - `<details class="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden" data-numberline-focus="true" role="region" aria-label="Number Line workspace" open="">`
  - Fix any of the following: ARIA role region is not allowed for given element

**stem_lab/stem_tool_playlab.js** (25)

- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs High Pr..." title="Tiki-Taka vs High Pr..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Mid-Blo..." title="Tiki-Taka vs Mid-Blo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Low Blo..." title="Tiki-Taka vs Low Blo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Tiki-Taka vs Offside..." title="Tiki-Taka vs Offside..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Hi..." title="Counter-Attack vs Hi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Mi..." title="Counter-Attack vs Mi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Lo..." title="Counter-Attack vs Lo..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Counter-Attack vs Of..." title="Counter-Attack vs Of..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Gegenpress (Counter-..." title="Gegenpress (Counter-..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — In-Swinger ..." title="Corner — In-Swinger ..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — Out-Swinger..." title="Corner — Out-Swinger..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- state: `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button role="cell" aria-label="Corner — Short vs Hi..." title="Corner — Short vs Hi..." data-pl-focusable="true" style="width: 38px; height:...">`
  - Fix any of the following: ARIA role cell is not allowed for given element
- … 13 more in aggregate.json

**stem_lab/stem_tool_solarsystem.js** (1)

- state: `baseline` [light+dark] — src: not found (tag section)
  - `<section data-solarsystem-wor...="Earth" role="figure" aria-label="Reference world spot..." class="solar-world-spotligh..." style="--spotlight-color: #...">`
  - Fix any of the following: ARIA role figure is not allowed for given element

### landmark-main-is-top-level — Main landmark should not be contained in another landmark (moderate; best-practice)

**sel_hub/sel_tool_practicejourneys.js** (1)

- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_practicejourneys.js:1960` (via aria-label "Practice Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Practice Journeys pilot">`
  - Fix any of the following: The main landmark is contained in another landmark.

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_selfadvocacy.js:4763` (via aria-label "Self-Advocacy Studio main content")
  - `<main id="selfadv-main-content" tabindex="-1" role="main" aria-label="Self-Advocacy Studio main content">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_alphafold.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_alphafold.js:38` (via class "af-launcher")
  - `<main class="af-launcher" data-alphafold-mission="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_aquaculture.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_aquaculture.js:24429` (via id "aq-topic-content")
  - `<main id="aq-topic-content" tabindex="-1" class="aq-topic-content" aria-labelledby="aq-topic-heading">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_autorepair.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(15, 23, 42); background: rgb(248, 250, 252); border-radius: 14px;">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(241, 245, 249); background: rgb(15, 23, 42); border-radius: 14px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_behaviorlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_behaviorlab.js:2` (via aria-label "Behavior Lab")
  - `<div class="behaviorlab-tool-shell behaviorlab-intro space-y-4" role="main" aria-label="Behavior Lab" data-behaviorlab-tool="intro">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_cellatlas.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_cellatlas.js:907` (via class "cal-shell")
  - `<main class="cal-shell" data-cell-atlas-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_consciousness.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(248,...">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(11, ...">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_fieldjourneys.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_fieldjourneys.js:1960` (via aria-label "Field Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Field Journeys pilot"><h1>The field station could not open</h1><p>The original Tree Life Lab engine did not load.</p><p>Your existing adventures and campaign saves have not been …`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_fireecology.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_fireecology.js:72` (via class "fireecology-tool-shell")
  - `<main class="fireecology-tool-shell" data-fireecology-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [light+dark] — src: not found (tag main)
  - `<main style="max-width: 1180px; margin: 0px auto;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_learning_lab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_learning_lab.js:21795` (via aria-label "Learning Lab main menu")
  - `<div role="main" aria-label="Learning Lab main menu" style="padding: 20px; max-width: 1000px; margin: 0px auto; color: rgb(241, 245, 249);">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_llm_literacy.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_llm_literacy.js:6379` (via aria-label "AI Literacy Lab main content")
  - `<main id="llm-literacy-main" aria-label="AI Literacy Lab main content">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_migration.js** (2)

- state: `baseline` [light] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-white" data-migration-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-slate-900" data-migration-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_moonmission.js:2596` (via class "max-w-5xl mx-auto px-1 space-y-3")
  - `<div class="max-w-5xl mx-auto px-1 space-y-3" role="main" data-moonmission-tool="true" aria-label="Apollo Moon Mission Simulator - Phase 1 of 10: Mission Briefing">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_openbim.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_openbim.js:1056` (via class "ob-shell")
  - `<main class="ob-shell">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_oratory.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_organismid.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(244, 247, 241); color: rgb(22, 32, 26); --oid-focus: #2f6b57; --oid-border: #bfc8b5; --oid-muted: #48544a;">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(15, 19, 14); color: rgb(230, 234, 223); --oid-focus: #fbbf24; --oid-border: #3b4530; --oid-muted: #aeb6a6;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_pets.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_pets.js:130` (via class "petslab-menu-shell")
  - `<main class="petslab-menu-shell" data-petslab-tool="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_singing.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab">`
  - Fix any of the following: The main landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_sourcebook.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_sourcebook.js:9962` (via class "min-w-0")
  - `<main class="min-w-0">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_spaceexplorer.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_spaceexplorer.js:3516` (via aria-label "Space Explorer mission select")
  - `<div class="se-shell space-y-3" role="main" data-spaceexplorer-ux="mission-select" aria-label="Space Explorer mission select">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_swimlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_swimlab.js:82` (via class "swimlab-menu-shell")
  - `<main class="swimlab-menu-shell" data-swimlab-readiness="true">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_trajectorycomputing.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_trajectorycomputing.js:2406` (via id "tc-main-content")
  - `<main id="tc-main-content" class="tc-paper" tabindex="-1">`
  - Fix any of the following: The main landmark is contained in another landmark.

**stem_lab/stem_tool_weathersystems.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_weathersystems.js:8448` (via class "min-w-0 space-y-4")
  - `<main class="min-w-0 space-y-4">`
  - Fix any of the following: The main landmark is contained in another landmark.

### landmark-no-duplicate-main — Document should not have more than one main landmark (moderate; best-practice)

**sel_hub/sel_tool_practicejourneys.js** (1)

- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_practicejourneys.js:1960` (via aria-label "Practice Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Practice Journeys pilot">`
  - Fix any of the following: Document has more than one main landmark

**sel_hub/sel_tool_selfadvocacy.js** (1)

- state: `baseline` [light+dark] — src: `sel_hub/sel_tool_selfadvocacy.js:4763` (via aria-label "Self-Advocacy Studio main content")
  - `<main id="selfadv-main-content" tabindex="-1" role="main" aria-label="Self-Advocacy Studio main content">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_alphafold.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_alphafold.js:38` (via class "af-launcher")
  - `<main class="af-launcher" data-alphafold-mission="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_aquaculture.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_aquaculture.js:24429` (via id "aq-topic-content")
  - `<main id="aq-topic-content" tabindex="-1" class="aq-topic-content" aria-labelledby="aq-topic-heading">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_autorepair.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(15, 23, 42); background: rgb(248, 250, 252); border-radius: 14px;">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: `stem_lab/stem_tool_autorepair.js:11791` (via aria-label "Auto Repair Shop main menu")
  - `<div role="main" aria-label="Auto Repair Shop main menu" data-ar-menu-dashboard="true" class="ar-menu-shell" style="color: rgb(241, 245, 249); background: rgb(15, 23, 42); border-radius: 14px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_behaviorlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_behaviorlab.js:2` (via aria-label "Behavior Lab")
  - `<div class="behaviorlab-tool-shell behaviorlab-intro space-y-4" role="main" aria-label="Behavior Lab" data-behaviorlab-tool="intro">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_cellatlas.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_cellatlas.js:907` (via class "cal-shell")
  - `<main class="cal-shell" data-cell-atlas-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_consciousness.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(248,...">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: `stem_lab/stem_tool_consciousness.js:2097` (via id "cns-main")
  - `<main id="cns-main" class="consciousness-lab" data-grade-profile="middle" data-reading-path="Grades 6-8" aria-label="Consciousness Theory..." style="background: rgb(11, ...">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_fieldjourneys.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_fieldjourneys.js:1960` (via aria-label "Field Journeys pilot")
  - `<main id="main" tabindex="-1" aria-label="Field Journeys pilot"><h1>The field station could not open</h1><p>The original Tree Life Lab engine did not load.</p><p>Your existing adventures and campaign saves have not been …`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_fireecology.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_fireecology.js:72` (via class "fireecology-tool-shell")
  - `<main class="fireecology-tool-shell" data-fireecology-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_gisstudio.js** (1)

- state: `baseline` [light+dark] — src: not found (tag main)
  - `<main style="max-width: 1180px; margin: 0px auto;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_learning_lab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_learning_lab.js:21795` (via aria-label "Learning Lab main menu")
  - `<div role="main" aria-label="Learning Lab main menu" style="padding: 20px; max-width: 1000px; margin: 0px auto; color: rgb(241, 245, 249);">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_llm_literacy.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_llm_literacy.js:6379` (via aria-label "AI Literacy Lab main content")
  - `<main id="llm-literacy-main" aria-label="AI Literacy Lab main content">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_migration.js** (2)

- state: `baseline` [light] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-white" data-migration-tool="true">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: not found (tag main)
  - `<main class="migration-tool-shell space-y-3 bg-slate-900" data-migration-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_moonmission.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_moonmission.js:2596` (via class "max-w-5xl mx-auto px-1 space-y-3")
  - `<div class="max-w-5xl mx-auto px-1 space-y-3" role="main" data-moonmission-tool="true" aria-label="Apollo Moon Mission Simulator - Phase 1 of 10: Mission Briefing">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_openbim.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_openbim.js:1056` (via class "ob-shell")
  - `<main class="ob-shell">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_oratory.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: `stem_lab/stem_tool_oratory.js:1426` (via aria-label "Oratory and Prosody Communication Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Oratory and Prosody Communication Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_organismid.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(244, 247, 241); color: rgb(22, 32, 26); --oid-focus: #2f6b57; --oid-border: #bfc8b5; --oid-muted: #48544a;">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: `stem_lab/stem_tool_organismid.js:2` (via aria-label "Taxonomy Explorer")
  - `<main class="organism-id-lab" aria-label="Taxonomy Explorer" style="background: rgb(15, 19, 14); color: rgb(230, 234, 223); --oid-focus: #fbbf24; --oid-border: #3b4530; --oid-muted: #aeb6a6;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_pets.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_pets.js:130` (via class "petslab-menu-shell")
  - `<main class="petslab-menu-shell" data-petslab-tool="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_singing.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab">`
  - Fix any of the following: Document has more than one main landmark
- state: `baseline` [dark] — src: `stem_lab/stem_tool_singing.js:2150` (via aria-label "Singing and Vocal Lab")
  - `<div class="space-y-4 max-w-4xl mx-auto pb-8" role="main" aria-label="Singing and Vocal Lab" style="background: rgb(15, 23, 42); border-radius: 12px; padding: 12px;">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_sourcebook.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_sourcebook.js:9962` (via class "min-w-0")
  - `<main class="min-w-0">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_spaceexplorer.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_spaceexplorer.js:3516` (via aria-label "Space Explorer mission select")
  - `<div class="se-shell space-y-3" role="main" data-spaceexplorer-ux="mission-select" aria-label="Space Explorer mission select">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_swimlab.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_swimlab.js:82` (via class "swimlab-menu-shell")
  - `<main class="swimlab-menu-shell" data-swimlab-readiness="true">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_trajectorycomputing.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_trajectorycomputing.js:2406` (via id "tc-main-content")
  - `<main id="tc-main-content" class="tc-paper" tabindex="-1">`
  - Fix any of the following: Document has more than one main landmark

**stem_lab/stem_tool_weathersystems.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_weathersystems.js:8448` (via class "min-w-0 space-y-4")
  - `<main class="min-w-0 space-y-4">`
  - Fix any of the following: Document has more than one main landmark

### landmark-contentinfo-is-top-level — Contentinfo landmark should not be contained in another landmark (moderate; best-practice)

**stem_lab/stem_tool_printingpress.js** (1)

- state: `baseline` [light+dark] — src: `stem_lab/stem_tool_printingpress.js:439` (via style #9c8a6e)
  - `<div role="contentinfo" style="margin-top: 18px; padding: 14px 14px 10px; border-radius: 8px; background: rgb(19, 16, 12); border: 1px dashed rgb(92, 70, 48); color: rgb(156, 138, 110); font-size: 11px; text-align: cente…`
  - Fix any of the following: The contentinfo landmark is contained in another landmark.

**stem_lab/stem_tool_renewables.js** (2)

- state: `baseline` [light] — src: `stem_lab/stem_tool_renewables.js:5008` (via aria-label "Source attribution")
  - `<div role="contentinfo" aria-label="Source attribution" style="margin-top: 18px; padding: 10px 14px; border-radius: 8px; background: rgb(236, 253, 245); border: 1px dashed rgb(75, 118, 105); color: rgb(63, 104, 95); font…`
  - Fix any of the following: The contentinfo landmark is contained in another landmark.
- state: `baseline` [dark] — src: `stem_lab/stem_tool_renewables.js:5008` (via aria-label "Source attribution")
  - `<div role="contentinfo" aria-label="Source attribution" style="margin-top: 18px; padding: 10px 14px; border-radius: 8px; background: rgb(13, 25, 22); border: 1px dashed rgb(47, 82, 71); color: rgb(136, 168, 158); font-si…`
  - Fix any of the following: The contentinfo landmark is contained in another landmark.

### empty-heading — Headings should not be empty (minor; best-practice)

**sel_hub/sel_tool_costbenefit.js** (1)

- state: `tab "🖨 Print view"` [light+dark] — src: not found (tag h1)
  - `<h1 style="margin: 0px; font-size: 22px; font-weight: 900;"></h1>`
  - Fix any of the following: Element does not have text that is visible to screen readers aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements tha…

**sel_hub/sel_tool_onepageprofile.js** (1)

- state: `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:439` (via style #0f172a|fontSize: 28)
  - `<h1 style="margin: 0px; font-size: 28px; font-weight: 900; color: rgb(15, 23, 42);"></h1>`
  - Fix any of the following: Element does not have text that is visible to screen readers aria-label attribute does not exist or is empty aria-labelledby attribute does not exist, references elements tha…

### empty-table-header — Table header text should not be empty (minor; best-practice)

**sel_hub/sel_tool_costbenefit.js** (1)

- state: `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_costbenefit.js:370` (via aria-label "Time frame")
  - `<th scope="col" aria-label="Time frame" style="width: 15%;"></th>`
  - Fix any of the following: Element does not have text that is visible to screen readers

## color-contrast (WCAG 1.4.3 AA), by tool

Grouped by fg/bg/ratio; one example element per group.

**stem_lab/stem_tool_optics.js** — 638 nodes

- #5eead4 on #878b95 = 2.3 (need 4.5:1) ×152 — first at `tab "🧮 Calculators"` [dark] — src: `stem_lab/stem_tool_optics.js:22611`
  - `<span id="opviz-t-vizShowSnell" style="font-weight: 800; font-size: 13px; color: rgb(94, 234, 212);">🌊 Snell's Law Refraction Visualizer</span>`
- #5eead4 on #769298 = 2.24 (need 4.5:1) ×152 — first at `tab "🧮 Calculators"` [dark] — src: `stem_lab/stem_tool_optics.js:22613`
  - `<button id="opviz-b-vizShowSnell" aria-labelledby="opviz-b-vizShowSnell opviz-t-vizShowSnell" aria-expanded="false" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 8px; bor…`
- #475569 on #878b95 = 2.22 (need 4.5:1) ×151 — first at `tab "🧮 Calculators"` [dark] — src: `stem_lab/stem_tool_optics.js:22618`
  - `<p style="font-size: 11px; color: var(--allo-stem-text-soft, #94a3b8); margin-top: 0px; margin-bottom: 8px; line-height: 1.5;">Drag the incidence angle + the refractive indices. Watch the ray bend, an…`
- #0f172a on #636875 = 3.2 (need 4.5:1) ×49 — first at `tab "🎨 Visual Lab"` [dark] — src: `stem_lab/stem_tool_optics.js:16926`
  - `<div style="font-size: 11px; color: var(--allo-stem-text, #cbd5e1); line-height: 1.5; margin-bottom: 4px;">Two converging lenses: objective forms a real inverted image at focal point; eyepiece magnifi…`
- #475569 on #636875 = 1.35 (need 4.5:1) ×27 — first at `tab "🎨 Visual Lab"` [dark] — src: `stem_lab/stem_tool_optics.js:11715`
  - `<span style="display: block; font-size: 10px; color: var(--allo-stem-text-soft, #94a3b8); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;">astronomy</span>`
- #7dd3fc on #ebf8fe = 1.53 (need 4.5:1) ×25 — first at `baseline` [dark] — src: `stem_lab/stem_tool_optics.js:565`
  - `<button id="op-tab-reflection" role="tab" aria-selected="false" tabindex="-1" data-op-focusable="true" data-op-tab-value="reflection" title="Mirrors + ray diagra..." style="padding: 8px 12px; b...">`
- #86efac on #636875 = 3.96 (need 4.5:1) ×24 — first at `tab "🎨 Visual Lab"` [dark] — src: `stem_lab/stem_tool_optics.js:16925`
  - `<span style="display: block; font-size: 14px; font-weight: 800; color: rgb(134, 239, 172); line-height: 1.2;">Refracting telescope</span>`
- #fdba74 on #636875 = 3.3 (need 4.5:1) ×24 — first at `tab "🔭 Instruments"` [dark] — src: `stem_lab/stem_tool_optics.js:17267`
  - `<span style="display: block; font-size: 14px; font-weight: 800; color: rgb(253, 186, 116); line-height: 1.2;">Build a pinhole camera</span>`
- #c4b5fd on #f6eefe = 1.63 (need 4.5:1) ×7 — first at `tab "🌈 Phenomena"` [dark] — src: not found (tag button)
  - `<button role="tab" aria-selected="false" tabindex="-1" data-op-focusable="true" data-op-tab-value="prism" title="Newton's spectromete..." style="padding: 7px 11px; b...">`
- #c7d2fe on #636875 = 3.73 (need 4.5:1) ×6 — first at `tab "🧪 Lab Kits"` [dark] — src: not found (tag button)
  - `<button type="button" data-op-focusable="true" data-op-deep-toggle="laserBasics" aria-expanded="false" style="display: flex; width...">`
- … 16 more colour pairs in aggregate.json

**stem_lab/stem_tool_economicslab.js** — 218 nodes

- #7dd3fc on #e2e8f0 = 1.35 (need 4.5:1) ×25 — first at `open 16 toggles` [dark] — src: `stem_lab/stem_tool_economicslab.js:2309`
  - `<button class="text-[0.6875rem] px-2 py-1 rounded-full bg-sky-100 text-sky-800 hover:bg-sky-200">Why do price ceilings cause shortages?</button>`
- #fcd34d on #f8fafc = 1.37 (need 4.5:1) ×22 — first at `baseline` [dark] — src: `stem_lab/stem_tool_economicslab.js:614`
  - `<span class="font-bold text-amber-600">Equilibrium: </span>`
- #86efac on #ffffff = 1.4 (need 4.5:1) ×19 — first at `open 16 toggles` [dark] — src: `stem_lab/stem_tool_economicslab.js:618`
  - `<span class="text-[0.6875rem] font-black" style="color: rgb(134, 239, 172);">Fiscal vs Monetary</span>`
- #c4b5fd on #ffffff = 1.84 (need 4.5:1) ×18 — first at `open 16 toggles` [dark] — src: `stem_lab/stem_tool_economicslab.js:617`
  - `<span class="text-[0.6875rem] font-black" style="color: rgb(196, 181, 253);">Fed Tools</span>`
- #7dd3fc on #f8fafc = 1.59 (need 4.5:1) ×17 — first at `baseline` [dark] — src: `stem_lab/stem_tool_economicslab.js:1864`
  - `<button type="button" aria-expanded="false" class="text-[0.6875rem] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 cursor-pointer font-bold">🧑‍🏫 Ask Tutor</button>`
- #86efac on #f8fafc = 1.34 (need 4.5:1) ×16 — first at `baseline` [dark] — src: `stem_lab/stem_tool_economicslab.js:1824`
  - `<span class="text-[0.6875rem] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">📚 AI-Powered Learning</span>`
- #fda4af on #f8fafc = 1.8 (need 4.5:1) ×15 — first at `baseline` [dark] — src: `stem_lab/stem_tool_economicslab.js:1854`
  - `<button type="button" aria-expanded="false" class="text-[0.6875rem] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-pointer font-bold">✍️ Quiz Me</button>`
- #c4b5fd on #e2e8f0 = 1.49 (need 4.5:1) ×15 — first at `open 16 toggles` [dark] — src: `stem_lab/stem_tool_economicslab.js:1753`
  - `<div class="p-1.5">School</div>`
- #fcd34d on #ffffff = 1.44 (need 4.5:1) ×13 — first at `open 16 toggles` [dark] — src: `stem_lab/stem_tool_economicslab.js:615`
  - `<span class="text-[0.6875rem] font-black" style="color: rgb(252, 211, 77);">GDP Formula</span>`
- #c4b5fd on #f8fafc = 1.76 (need 4.5:1) ×12 — first at `baseline` [dark] — src: `stem_lab/stem_tool_economicslab.js:367`
  - `<button type="button" aria-expanded="false" class="text-[0.6875rem] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 cursor-pointer">📖 Glossary (0)</button>`
- … 16 more colour pairs in aggregate.json

**stem_lab/stem_tool_fireecology.js** — 118 nodes

- #f59e0b on #e2e8f0 = 1.74 (need 4.5:1) ×12 — first at `baseline` [dark] — src: `stem_lab/stem_tool_fireecology.js:510`
  - `<div style="font-size: 13px; color: rgb(245, 158, 11); margin-bottom: 6px;">🔥 Cultural Burning / Fire-Stick Farming</div>`
- #fbbf24 on #ffffff = 1.66 (need 4.5:1) ×11 — first at `tab "🧩Cultural Mosaic"` [light+dark] — src: `stem_lab/stem_tool_fireecology.js:5923`
  - `<strong style="color: rgb(251, 191, 36);">For pairing with classroom work, consider these resources:</strong>`
- #f97316 on #ffffff = 2.8 (need 4.5:1) ×11 — first at `baseline` [dark] — src: `stem_lab/stem_tool_fireecology.js:2460`
  - `<strong style="color: rgb(249, 115, 22);">fire is not the enemy of healthy ecosystems — the absence of fire is.</strong>`
- #4ade80 on #ffffff = 1.74 (need 4.5:1) ×9 — first at `tab "🌲Fire Ecosystems"` [dark] — src: `stem_lab/stem_tool_fireecology.js:488`
  - `<strong style="color: rgb(74, 222, 128);">fire-dependent</strong>`
- #f97316 on #e2e8f0 = 2.27 (need 4.5:1) ×6 — first at `tab "🌲Fire Ecosystems"` [dark] — src: `stem_lab/stem_tool_fireecology.js:2655`
  - `<div style="font-size: 13px; color: rgb(249, 115, 22); margin-bottom: 4px;">🔄 Fire interval: 1–3 years</div>`
- #f16161 on #ffffff = 3.17 (need 4.5:1) ×6 — first at `tab "🎮Forest Simulator"` [dark] — src: `stem_lab/stem_tool_fireecology.js:204`
  - `<strong style="color: rgb(241, 97, 97);">total fire suppression</strong>`
- #22c55e on #ffffff = 2.27 (need 4.5:1) ×5 — first at `tab "🌺Smoke & Seeds"` [dark] — src: `stem_lab/stem_tool_fireecology.js:1333`
  - `<div style="font-weight: 700; color: rgb(34, 197, 94); font-size: 14px; margin-bottom: 2px;">Nitric Oxide (NO)</div>`
- #fca5a5 on #ffffff = 1.89 (need 4.5:1) ×5 — first at `tab "💧Watersheds"` [dark] — src: `stem_lab/stem_tool_fireecology.js:1375`
  - `<div style="padding: 8px; color: rgb(252, 165, 165); border-bottom: 1px solid var(--allo-stem-border, #1e293b);">10-100 tons/acre</div>`
- #f59e0b on #ffffff = 2.14 (need 4.5:1) ×4 — first at `baseline` [dark] — src: `stem_lab/stem_tool_fireecology.js:2243`
  - `<div style="font-weight: 700; color: rgb(245, 158, 11); font-size: 14px;">🏅 Badges (0 of 23)</div>`
- #0ea5e9 on #ffffff = 2.77 (need 4.5:1) ×3 — first at `tab "💧Watersheds"` [dark] — src: `stem_lab/stem_tool_fireecology.js:1363`
  - `<h3 style="margin: 0px 0px 8px; color: rgb(14, 165, 233); font-size: 16px;">Fire &amp; Water: How Burning Protects Watersheds</h3>`
- … 37 more colour pairs in aggregate.json

**sel_hub/sel_tool_coping.js** — 81 nodes

- #64748b on #1e293b = 3.07 (need 4.5:1) ×80 — first at `tab "🎓 Learn"` [light+dark] — src: `sel_hub/sel_tool_coping.js:14780`
  - `<p style="margin: 6px 0px 0px; color: rgb(100, 116, 139); font-size: 10px;">Linehan, 1993/2014; Wise Mind as a core dialectical construct in DBT and validated across DBT efficacy trials.</p>`
- #ffffff on #14b8a6 = 2.48 (need 4.5:1) ×1 — first at `tab "🚨 Crisis"` [light+dark] — src: `sel_hub/sel_tool_coping.js:16662`
  - `<button style="padding: 5px 10px; border-radius: 6px; border: none; background: rgb(20, 184, 166); color: rgb(255, 255, 255); font-size: 11px; font-weight: 700; cursor: pointer;">View</button>`

**stem_lab/stem_tool_ecosystem.js** — 65 nodes

- #475569 on #1e293b = 1.93 (need 4.5:1) ×21 — first at `tab "❓ Quiz"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:9883`
  - `<p class="text-[0.6875rem] text-slate-600 mt-1">Answer questions to track your progress</p>`
- #cbd5e1 on #ffffff = 1.48 (need 4.5:1) ×5 — first at `tab "🧪 Sandbox"` [dark] — src: not found (tag div)
  - `<div>Place fox</div>`
- #e2e8f0 on #d0dcdb = 1.14 (need 4.5:1) ×5 — first at `tab "🧪 Sandbox"` [dark] — src: not found (tag li)
  - `<li>Remove all foxes and watch rabbits plus the resource index</li>`
- #5eead4 on #d0dcdb = 1.05 (need 4.5:1) [tailwind dark: variant] ×3 — first at `tab "🧪 Sandbox"` [dark] — src: `stem_lab/stem_tool_ecosystem.js:8570`
  - `<span class="text-xs font-semibold text-teal-700 dark:text-teal-300">Entities Placed:</span>`
- #7e8ca2 on #ffffff = 3.4 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:2876`
  - `<strong class="eco-accent" style="--eco-acc-light: #556276; --eco-acc-dark: #7e8ca2;">Gray Wolf</strong>`
- #7e8ca2 on #eaedf0 = 2.9 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:488`
  - `<button aria-label="Open deep-dive for G..." class="eco-accent" style="width: 100%; padding...">`
- #e66516 on #ffffff = 3.36 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:2888`
  - `<strong class="eco-accent" style="--eco-acc-light: #92400e; --eco-acc-dark: #e66516;">American Beaver</strong>`
- #e66516 on #f1e6df = 2.74 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:488`
  - `<button aria-label="Open deep-dive for A..." class="eco-accent" style="width: 100%; padding...">`
- #cd7616 on #ffffff = 3.38 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:2900`
  - `<strong class="eco-accent" style="--eco-acc-light: #854d0e; --eco-acc-dark: #cd7616;">Moose</strong>`
- #cd7616 on #efe7df = 2.76 (need 4.5:1) ×1 — first at `tab "🌲 Conservation"` [light+dark] — src: `stem_lab/stem_tool_ecosystem.js:488`
  - `<button aria-label="Open deep-dive for Moose" class="eco-accent" ...>`
- … 25 more colour pairs in aggregate.json

**stem_lab/stem_tool_migration.js** — 65 nodes

- #0ea5e9 on #f0f9ff = 2.59 (need 4.5:1) ×21 — first at `tab "🪿V-Formation"` [light] — src: not found (tag div)
  - `<div class="text-lg font-black text-sky-500">94</div>`
- #0ea5e9 on #293548 = 4.46 (need 4.5:1) ×16 — first at `tab "🗺️Migration Routes"` [dark] — src: `stem_lab/stem_tool_migration.js:5419`
  - `<div class="text-[0.6875rem] font-bold text-sky-500 mb-0.5">Feb-Mar</div>`
- #0ea5e9 on #f8fafc = 2.64 (need 4.5:1) ×10 — first at `tab "🪿V-Formation"` [light] — src: `stem_lab/stem_tool_migration.js:589`
  - `<span class="font-bold min-w-[120px] text-sky-500">Bar-tailed Godwit</span>`
- #64748b on #f0f9ff = 4.46 (need 4.5:1) ×7 — first at `tab "🪿V-Formation"` [light] — src: `stem_lab/stem_tool_migration.js:3882`
  - `<div class="text-[0.6875rem] font-bold text-slate-500">kcal needed</div>`
- #0ea5e9 on #ffffff = 2.77 (need 4.5:1) ×2 — first at `tab "✈️Aerodynamics"` [light] — src: `stem_lab/stem_tool_migration.js:6359`
  - `<span class="text-sm font-bold min-w-[40px] text-right text-sky-500">5°</span>`
- #ef4444 on #f8fafc = 3.59 (need 4.5:1) ×2 — first at `tab "✈️Aerodynamics"` [light] — src: `stem_lab/stem_tool_migration.js:3931`
  - `<div class="text-sm font-black" style="color: rgb(239, 68, 68);">0.0537</div>`
- #22c55e on #f8fafc = 2.17 (need 4.5:1) ×2 — first at `tab "✈️Aerodynamics"` [light] — src: `stem_lab/stem_tool_migration.js:3931`
  - `<div class="text-sm font-black" style="color: rgb(34, 197, 94);">9.3</div>`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×2 — first at `tab "✈️Aerodynamics"` [dark] — src: `stem_lab/stem_tool_migration.js:3931`
  - `<div class="text-sm font-black" style="color: rgb(239, 68, 68);">0.0537</div>`
- #3b82f6 on #f8fafc = 3.51 (need 4.5:1) ×1 — first at `tab "✈️Aerodynamics"` [light] — src: `stem_lab/stem_tool_migration.js:3931`
  - `<div class="text-sm font-black" style="color: rgb(59, 130, 246);">0.500</div>`
- #3b82f6 on #1e293b = 3.97 (need 4.5:1) ×1 — first at `tab "✈️Aerodynamics"` [dark] — src: `stem_lab/stem_tool_migration.js:3931`
  - `<div class="text-sm font-black" style="color: rgb(59, 130, 246);">0.500</div>`
- … 1 more colour pairs in aggregate.json

**stem_lab/stem_tool_dna.js** — 63 nodes

- #f59e0b on #fef7eb = 2.01 (need 4.5:1) ×15 — first at `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:3166`
  - `<span class="font-bold" style="color: rgb(245, 158, 11);">AUA</span>`
- #ef4444 on #fef0f0 = 3.39 (need 4.5:1) ×10 — first at `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:3166`
  - `<span class="font-bold" style="color: rgb(239, 68, 68);">AAA</span>`
- #3b82f6 on #eff5fe = 3.35 (need 4.5:1) ×10 — first at `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:3166`
  - `<span class="font-bold" style="color: rgb(59, 130, 246);">AAC</span>`
- #a855f7 on #f8f1fe = 3.58 (need 4.5:1) ×4 — first at `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:3166`
  - `<span class="font-bold" style="color: rgb(168, 85, 247);">GAA</span>`
- #22c55e on #edfaf2 = 2.12 (need 4.5:1) ×1 — first at `tab "🎯Challenge"` [light+dark] — src: `stem_lab/stem_tool_dna.js:3166`
  - `<span class="font-bold" style="color: rgb(34, 197, 94);">AUG</span>`
- #c4b5fd on #ffffff = 1.84 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_dna.js:3883`
  - `<p class="dna-command-kicker">Molecular biology workbench</p>`
- #0f172a on #1e1d3f = 1.1 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_dna.js:4297`
  - `<h3 style="color: var(--allo-stem-text, #172033); font-size: 15px; font-weight: 900; margin: 2px 0px 0px; line-height: 1.2;">Build a DNA strand</h3>`
- #475569 on #1e1d3f = 2.12 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_dna.js:4297`
  - `<p style="margin: 3px 0px 0px; color: var(--allo-stem-text-soft, #475569); font-size: 10px; line-height: 1.45;">Pick a sequence - the complementary strand fills in via base pairing (A-T, G-C). Real DN…`
- #0f172a on #13223e = 1.12 (need 4.5:1) ×1 — first at `tab "🔀Replicate"` [dark] — src: `stem_lab/stem_tool_dna.js:361`
  - `<h3 style="color: var(--allo-stem-text, #172033); font-size: 15px; font-weight: 900; margin: 2px 0px 0px; line-height: 1.2;">DNA replication</h3>`
- #475569 on #13223e = 2.08 (need 4.5:1) ×1 — first at `tab "🔀Replicate"` [dark] — src: `stem_lab/stem_tool_dna.js:4298`
  - `<p style="margin: 3px 0px 0px; color: var(--allo-stem-text-soft, #475569); font-size: 10px; line-height: 1.45;">Helicase unwinds the helix; DNA polymerase reads each template strand and lays down its …`
- … 18 more colour pairs in aggregate.json

**sel_hub/sel_tool_restorativecircle.js** — 62 nodes

- #475569 on #0f172a = 2.35 (need 4.5:1) ×13 — first at `tab "📜 Scripts"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:1288`
  - `<p class="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">Pre-written scripts to guide each phase of your circle. Select a section below, then choose a script to follow.</p>`
- #f59e0b on #ffffff = 2.14 (need 4.5:1) ×12 — first at `tab "📜 Scripts"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:1345`
  - `<span class="text-xs text-amber-500">▼ Expand</span>`
- #d97706 on #ffffff = 3.18 (need 4.5:1) ×12 — first at `tab "🩹 Repair"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:1408`
  - `<p id="rc-harm-step-subtitle" class="text-xs text-amber-600 font-medium">Perspective of the person harmed</p>`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×9 — first at `tab "🩹 Repair"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:310`
  - `<textarea aria-labelledby="rc-harm-step-title" aria-describedby="rc-harm-step-subtitle rc-harm-step-guidance" placeholder="From my perspective, what happened was..." class="w-full text-sm p-3 border b…`
- #b45309 on #0f172a = 3.55 (need 4.5:1) ×2 — first at `tab "🎭 Rehearse"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:1646`
  - `<strong class="text-amber-700">Pick what you want to practice. </strong>`
- #ef4444 on #fef2f2 = 3.44 (need 4.5:1) ×2 — first at `tab "⚖️ Compare"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:2478`
  - `<div class="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">🚫 Punitive Approach</div>`
- #10b981 on #ecfdf5 = 2.4 (need 4.5:1) ×2 — first at `tab "⚖️ Compare"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:2484`
  - `<div class="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">💚 Restorative Approach</div>`
- #78350f on #262527 = 1.68 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_restorativecircle.js:2714`
  - `<div class="no-print" style="padding: 12px; borde...">`
- #64748b on #0f172a = 3.75 (need 4.5:1) ×1 — first at `tab "🤝 Agreements"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:2004`
  - `<p class="text-sm">No agreements yet. Select from suggestions above or write your own to get started!</p>`
- #3b82f6 on #ffffff = 3.67 (need 4.5:1) ×1 — first at `tab "🧠 Empathy"` [light] — src: `sel_hub/sel_tool_restorativecircle.js:847`
  - `<h5 id="rc-empathy-personA-said-label" class="text-xs font-bold" style="color: rgb(59, 130, 246);">What they SAID</h5>`
- … 6 more colour pairs in aggregate.json

**stem_lab/stem_tool_geologyexplorer.js** — 50 nodes

- #121b2e on #1a2436 = 1.1 (need 4.5:1) [dimmed: ancestor opacity 0.7] ×43 — first at `open 3 toggles` [dark] — src: `stem_lab/stem_tool_geologyexplorer.js:30`
  - `<span class="block truncate text-[10.5px] font-extrabold">🔒 Soil / Regolith</span>`
- #10b981 on #ffffff = 2.53 (need 4.5:1) ×5 — first at `open 3 toggles` [light] — src: not found (tag span)
  - `<span class="shrink-0 text-emerald-500">+130</span>`
- #7e8896 on #ffffff = 3.59 (need 4.5:1) [dimmed: ancestor opacity 0.7] ×1 — first at `open 3 toggles` [light] — src: `stem_lab/stem_tool_geologyexplorer.js:11630`
  - `<span class="block truncate text-[10px] text-slate-600">Mine to reveal field notes</span>`
- #6f7d91 on #1a2436 = 3.71 (need 4.5:1) [dimmed: ancestor opacity 0.7] ×1 — first at `open 3 toggles` [dark] — src: `stem_lab/stem_tool_geologyexplorer.js:11630`
  - `<span class="block truncate text-[10px] text-slate-400">Mine to reveal field notes</span>`

**sel_hub/sel_tool_mindfulness.js** — 46 nodes

- #444f63 on #151e31 = 2.01 (need 4.5:1) [dimmed: ancestor opacity 0.4] ×46 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_mindfulness.js:5619`
  - `<div style="font-size: 10px; font-weight: 600; color: rgb(148, 163, 184);">First Breath</div>`

**sel_hub/sel_tool_perspective.js** — 46 nodes

- #444f63 on #151e31 = 2.01 (need 4.5:1) [dimmed: ancestor opacity 0.4] ×46 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_perspective.js:1286`
  - `<div style="font-size: 10px; font-weight: 600; color: rgb(148, 163, 184);">Perspective Pioneer</div>`

**sel_hub/sel_tool_safety.js** — 45 nodes

- #525d71 on #0f172a = 2.68 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×36 — first at `tab "🏅 Badges"` [light+dark] — src: `sel_hub/sel_tool_safety.js:302`
  - `<div style="font-size: 12px; font-weight: 600; color: rgb(148, 163, 184); margin-top: 6px;">Safety Scholar</div>`
- #c26565 on #7f1d1d = 2.54 (need 4.5:1) ×6 — first at `tab "💚 My Circle"` [light+dark] — src: `sel_hub/sel_tool_safety.js:126`
  - `<div style="font-size: 11px; color: rgba(252, 165, 165, 0.533);">Free, confidential, 24/7 support</div>`
- #ffffff on #ef4444 = 3.76 (need 4.5:1) ×2 — first at `tab "💚 My Circle"` [light+dark] — src: `sel_hub/sel_tool_safety.js:1365`
  - `<button aria-label="I have seen these resources" style="margin-top: 10px; padding: 6px 14px; border-radius: 8px; border: none; background: rgb(239, 68, 68); color: rgb(255, 255, 255); font-size: 12px;…`
- #5c84b3 on #1e3a5f = 2.96 (need 4.5:1) ×1 — first at `tab "🔐 Digital"` [light+dark] — src: `sel_hub/sel_tool_safety.js:1238`
  - `<div style="font-size: 11px; color: rgba(147, 197, 253, 0.533);">Read all 8 cards and track what you already knew vs. what is new. 0/8 explored.</div>`

**sel_hub/sel_tool_cultureexplorer.js** — 45 nodes

- #808998 on #9fa2aa = 1.38 (need 4.5:1) [dimmed: ancestor opacity 0.6] ×32 — first at `tab "🏅 Badges"` [light] — src: `sel_hub/sel_tool_cultureexplorer.js:237`
  - `<div class="text-sm font-bold text-slate-300">World Traveler</div>`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×10 — first at `baseline` [light] — src: `sel_hub/sel_tool_cultureexplorer.js:1071`
  - `<input type="text" placeholder="e.g., Hmong, Somali diaspora, Deaf culture, Cajun... (don’t share personal info)" class="flex-1 text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring…`
- #f43f5e on #fff1f2 = 3.34 (need 4.5:1) ×1 — first at `tab "📅 Calendar"` [light] — src: `sel_hub/sel_tool_cultureexplorer.js:1461`
  - `<div class="text-xs text-rose-500 font-bold mt-0.5">This Month</div>`
- #cbd5e1 on #ffffff = 1.48 (need 4.5:1) ×1 — first at `tab "🏆 Quiz"` [light] — src: `sel_hub/sel_tool_cultureexplorer.js:1830`
  - `<p class="text-sm text-slate-300">Test your knowledge of world cultures! Answer 10 multiple-choice questions.</p>`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×1 — first at `tab "🏅 Badges"` [light] — src: not found (tag span)
  - `<span class="text-sm text-slate-600 ml-1">/ 16 badges earned</span>`

**sel_hub/sel_tool_community.js** — 43 nodes

- #4b566a on #0f172a = 2.41 (need 4.5:1) [dimmed: ancestor opacity 0.45] ×40 — first at `tab "🏅 Badges"` [light+dark] — src: `sel_hub/sel_tool_community.js:556`
  - `<div style="font-size: 10px; font-weight: 600; color: rgb(148, 163, 184); margin-top: 4px;">Identity Builder</div>`
- #ffffff on #06b6d4 = 2.42 (need 4.5:1) ×3 — first at `tab "🧩 Identity"` [light+dark] — src: `sel_hub/sel_tool_community.js:1209`
  - `<button style="padding: 8px 20px; border-radius: 8px; border: none; background: rgb(6, 182, 212); color: rgb(255, 255, 255); font-size: 12px; font-weight: 600; cursor: pointer;">Save My Superpower</bu…`

**sel_hub/sel_tool_emotions.js** — 42 nodes

- #444f63 on #151e31 = 2.01 (need 4.5:1) [dimmed: ancestor opacity 0.4] ×42 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_emotions.js:584`
  - `<div style="font-size: 10px; font-weight: 600; color: rgb(148, 163, 184);">Emotion Check</div>`

**sel_hub/sel_tool_social.js** — 42 nodes

- #444f63 on #151e31 = 2.01 (need 4.5:1) [dimmed: ancestor opacity 0.4] ×42 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_social.js:828`
  - `<div style="font-size: 10px; font-weight: 600; color: rgb(148, 163, 184);">Ice Breaker</div>`

**sel_hub/sel_tool_journal.js** — 42 nodes

- #525d71 on #0f172a = 2.68 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×21 — first at `tab "🏅 Badges"` [light+dark] — src: `sel_hub/sel_tool_journal.js:334`
  - `<div style="font-size: 12px; font-weight: 700; color: rgb(148, 163, 184); margin-bottom: 2px;">First Check-In</div>`
- #2b364a on #0f172a = 1.47 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×21 — first at `tab "🏅 Badges"` [light+dark] — src: `sel_hub/sel_tool_journal.js:334`
  - `<div style="font-size: 10px; color: rgb(71, 85, 105); line-height: 1.4;">Complete your first mood check-in</div>`

**sel_hub/sel_tool_ethicalreasoning.js** — 38 nodes

- #808998 on #9b9fa8 = 1.33 (need 4.5:1) [dimmed: ancestor opacity 0.6] ×26 — first at `tab "🏅 Badges"` [light] — src: `sel_hub/sel_tool_ethicalreasoning.js:622`
  - `<p class="font-bold text-sm text-slate-300">Ethics Scholar</p>`
- #059669 on #ffffff = 3.76 (need 4.5:1) ×5 — first at `tab "🎤 Debate"` [light] — src: not found (tag p)
  - `<p class="text-xs text-emerald-600 flex-1">✓ For: Young teens are vulnerable to cyberbullying, addiction, and ...</p>`
- #ef4444 on #ffffff = 3.76 (need 4.5:1) ×5 — first at `tab "🎤 Debate"` [light] — src: not found (tag p)
  - `<p class="text-xs text-red-500 flex-1">✗ Against: Social media teaches digital literacy and is how teens conne...</p>`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×2 — first at `tab "🏛️ Frameworks"` [light] — src: `sel_hub/sel_tool_ethicalreasoning.js:1162`
  - `<p class="text-sm text-slate-600 text-center mb-2">Ethical frameworks are different lenses for examining the same question. No single framework has all the answers.</p>`

**stem_lab/stem_tool_echolocation.js** — 30 nodes

- #818cf8 on #2a2e61 = 4.23 (need 4.5:1) ×6 — first at `tab "🌊Sound Waves"` [dark] — src: `stem_lab/stem_tool_echolocation.js:3362`
  - `<span class="text-[0.6875rem] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400">1910s</span>`
- #22c55e on #ffffff = 2.27 (need 4.5:1) ×2 — first at `tab "🌊Sound Waves"` [light] — src: `stem_lab/stem_tool_echolocation.js:3109`
  - `<span class="text-green-500">← Audible →</span>`
- #a855f7 on #ffffff = 3.95 (need 4.5:1) ×2 — first at `tab "🌊Sound Waves"` [light] — src: `stem_lab/stem_tool_echolocation.js:3136`
  - `<span class="text-purple-500">← Bat range →</span>`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×2 — first at `tab "🔦3D Cave"` [dark] — src: `stem_lab/stem_tool_echolocation.js:1763`
  - `<p>Loading 3D engine... (Three.js required)</p>`
- #a855f7 on #182234 = 4.02 (need 4.5:1) ×2 — first at `tab "🌊Sound Waves"` [dark] — src: `stem_lab/stem_tool_echolocation.js:3136`
  - `<span class="text-purple-500">← Bat range →</span>`
- #818cf8 on #f1f5f9 = 2.72 (need 4.5:1) ×1 — first at `tab "🚨Doppler Effect"` [light] — src: not found (tag div)
  - `<div class="text-xs font-black text-indigo-400">40.0 kHz</div>`
- #059669 on #ecfdf5 = 3.57 (need 4.5:1) ×1 — first at `tab "🚨Doppler Effect"` [light] — src: `stem_lab/stem_tool_echolocation.js:3950`
  - `<div class="mt-2 text-[0.6875rem] italic text-emerald-600">Over 500 plant species depend on bat pollination or seed dispersal, including mangoes, bananas, agave (tequila!), and durian. Without fruit b…`
- #6366f1 on #ffffff = 4.46 (need 4.5:1) ×1 — first at `tab "🦠Bat Biology"` [light] — src: `stem_lab/stem_tool_echolocation.js:4315`
  - `<span class="text-[0.6875rem] font-bold" style="color: rgb(99, 102, 241);">65 MYA</span>`
- #8b5cf6 on #ffffff = 4.23 (need 4.5:1) ×1 — first at `tab "🦠Bat Biology"` [light] — src: `stem_lab/stem_tool_echolocation.js:4316`
  - `<span class="text-[0.6875rem] font-bold" style="color: rgb(139, 92, 246);">55 MYA</span>`
- #c084fc on #ffffff = 2.64 (need 4.5:1) ×1 — first at `tab "🦠Bat Biology"` [light] — src: `stem_lab/stem_tool_echolocation.js:4318`
  - `<span class="text-[0.6875rem] font-bold" style="color: rgb(192, 132, 252);">50 MYA</span>`
- … 11 more colour pairs in aggregate.json

**stem_lab/stem_tool_music.js** — 30 nodes

- #c084fc on #ffffff = 2.64 (need 4.5:1) ×10 — first at `tab "🎵 stem.synth.scales"` [light] — src: `stem_lab/stem_tool_music.js:1071`
  - `<span class="text-[0.6875rem] text-purple-400">Root</span>`
- #f59e0b on #ffffff = 2.14 (need 4.5:1) ×3 — first at `tab "🌟 stem.synth.harmonypad"` [light] — src: `stem_lab/stem_tool_music.js:4370`
  - `<div class="text-[0.6875rem] text-amber-500">stem.synth.warm_chorus</div>`
- #a855f7 on #faf5ff = 3.68 (need 4.5:1) ×2 — first at `tab "🎵 stem.synth.scales"` [light] — src: `stem_lab/stem_tool_music.js:3439`
  - `<p class="text-[0.625rem] text-purple-500 italic mt-2 text-center">Tags between notes: <b>W</b> = whole step · <b>H</b> = half step · <b>A</b> = augmented 2nd</p>`
- #fde68a on #b45309 = 4.03 (need 4.5:1) ×1 — first at `tab "🌟 stem.synth.harmonypad"` [light+dark] — src: `stem_lab/stem_tool_music.js:4369`
  - `<div class="text-[0.6875rem] text-amber-200">stem.synth.pure_clean</div>`
- #a855f7 on #ffffff = 3.95 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:1985`
  - `<span class="text-[0.6875rem] font-bold text-purple-500 w-16 text-right pr-1 truncate">🎹 Melody</span>`
- #ef4444 on #ffffff = 3.76 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:1229`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(239, 68, 68);">Kick</span>`
- #f97316 on #ffffff = 2.8 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:1229`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(249, 115, 22);">Snare</span>`
- #eab308 on #ffffff = 1.91 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:61`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(234, 179, 8);">Clap</span>`
- #84cc16 on #ffffff = 1.97 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:3856`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(132, 204, 22);">Rim</span>`
- #22c55e on #ffffff = 2.27 (need 4.5:1) ×1 — first at `tab "🥁 stem.synth.beatpad"` [light] — src: `stem_lab/stem_tool_music.js:1906`
  - `<span class="text-[0.6875rem] font-bold w-16 text-right pr-1 truncate" style="color: rgb(34, 197, 94);">CH Hat</span>`
- … 8 more colour pairs in aggregate.json

**sel_hub/sel_tool_teamwork.js** — 30 nodes

- #525d71 on #0f172a = 2.68 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×30 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_teamwork.js:567`
  - `<div style="font-size: 12px; font-weight: 600; color: rgb(148, 163, 184); margin-top: 4px;">Team Player</div>`

**stem_lab/stem_tool_a11yauditor.js** — 28 nodes

- #99a0aa on #fcfdfe = 2.58 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×10 — first at `tab "🏅 Badges"` [light+dark] — src: `stem_lab/stem_tool_a11yauditor.js:64`
  - `<div class="text-[0.6875rem] font-bold text-slate-700 mt-1">First Audit</div>`
- #a3aab4 on #fcfdfe = 2.29 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×10 — first at `tab "🏅 Badges"` [light+dark] — src: `stem_lab/stem_tool_a11yauditor.js:64`
  - `<p class="text-[0.6875rem] text-slate-600 mt-0.5">Complete your first accessibility audit</p>`
- #3b82f6 on #eff6ff = 3.37 (need 4.5:1) ×4 — first at `tab "⚖️ Take Action"` [light+dark] — src: not found (tag span)
  - `<span class="font-black text-blue-500">1.</span>`
- #717b8c on #ffffff = 4.27 (need 4.5:1) ×2 — first at `tab "📖 Learn"` [light+dark] — src: `stem_lab/stem_tool_a11yauditor.js:942`
  - `<div class="text-base font-bold">Sample text</div>`
- #a855f7 on #ffffff = 3.95 (need 4.5:1) ×1 — first at `tab "♿ Knowbility"` [light+dark] — src: `stem_lab/stem_tool_a11yauditor.js:1044`
  - `<div class="text-[0.6875rem] text-purple-500 font-bold mt-2">🔗 knowbility.org/programs/accessu</div>`
- #14b8a6 on #ffffff = 2.48 (need 4.5:1) ×1 — first at `tab "♿ Knowbility"` [light+dark] — src: `stem_lab/stem_tool_a11yauditor.js:1044`
  - `<div class="text-[0.6875rem] text-teal-500 font-bold mt-2">🔗 knowbility.org/programs/air</div>`

**sel_hub/sel_tool_strengths.js** — 27 nodes

- #58627a on #1e233e = 2.52 (need 4.5:1) [dimmed: ancestor opacity 0.5] ×22 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_strengths.js:1035`
  - `<span style="font-weight: bold; color: rgb(148, 163, 184);">First Discovery</span>`
- #0f172a on #b45309 = 3.55 (need 4.5:1) ×3 — first at `tab "📖 Stories"` [light+dark] — src: `sel_hub/sel_tool_strengths.js:1720`
  - `<button aria-label="Go Discover" style="margin-top: 12px; padding: 8px 20px; border-radius: 8px; background: rgb(180, 83, 9); color: rgb(15, 23, 42); border: none; font-weight: bold; font-size: 12px; …`
- #6366f1 on #1a2244 = 3.46 (need 4.5:1) ×1 — first at `tab "💬 Affirm"` [light+dark] — src: `sel_hub/sel_tool_strengths.js:2402`
  - `<button aria-label="+ cat.label.split(" style="padding: 6px 14px; border-radius: 20px; background: rgba(99, 102, 241, 0.133); border: 2px solid rgb(99, 102, 241); color: rgb(99, 102, 241); font-size: …`
- #6366f1 on #121a32 = 3.85 (need 4.5:1) ×1 — first at `tab "💬 Affirm"` [light+dark] — src: `sel_hub/sel_tool_strengths.js:717`
  - `<p style="font-size: 18px; font-weight: bold; color: rgb(99, 102, 241); line-height: 1.6; max-width: 400px;">I am brave enough to do what's right, even when it's hard.</p>`

**stem_lab/stem_tool_graphcalc.js** — 24 nodes

- #cbd5e1 on #e2e8f0 = 1.2 (need 4.5:1) ×10 — first at `baseline` [dark] — src: `stem_lab/stem_tool_graphcalc.js:127`
  - `<span style="font-size: 10px; color: var(--gc-muted, #cbd5e1); font-weight: 700;">y1 =</span>`
- #c7d2fe on #cbd1f0 = 1.01 (need 4.5:1) ×10 — first at `baseline` [dark] — src: `stem_lab/stem_tool_graphcalc.js:462`
  - `<button aria-pressed="false" style="width: 100%; padding: 4px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; background: var(--gc-button-bg, #1e293b); color: var(--gc-button…`
- #c7d2fe on #c6cbf0 = 1.06 (need 4.5:1) ×2 — first at `baseline` [dark] — src: `stem_lab/stem_tool_graphcalc.js:846`
  - `<button style="flex: 1 0 45%; padding: 5px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; background: var(--gc-accent-soft, #312e81); color: var(--gc-accent, #c7d2fe); borde…`
- #c7d2fe on #e2e8f0 = 1.21 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_graphcalc.js:910`
  - `<div style="padding: 10px 12px; border-bottom: 1px solid var(--gc-border, #64748b); font-size: 11px; font-weight: bold; color: var(--gc-accent, #c7d2fe); letter-spacing: 1px;">📝 FUNCTIONS</div>`
- #fca5a5 on #e4d1d8 = 1.3 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_graphcalc.js:942`
  - `<button aria-label="Clear" style="flex: 1 0 45%; padding: 5px; border-radius: 6px; background: rgba(239, 68, 68, 0.14); color: var(--gc-danger, #fecaca); border: 1px solid rgba(239, 68, 68, 0.45); fon…`

**sel_hub/sel_tool_civicaction.js** — 24 nodes

- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×22 — first at `baseline` [light] — src: `sel_hub/sel_tool_civicaction.js:1141`
  - `<textarea id="cv-freewrite" placeholder="Write freely about what you are thinking and feeling. Nobody will see this unless you choose to share it." class="w-full text-sm p-3 border border-slate-400 ro…`
- #64748b on #0f172a = 3.75 (need 4.5:1) ×1 — first at `tab "📜 Rights & Dissent"` [light] — src: not found (tag div)
  - `<div class="text-xs text-slate-400 font-bold">0 / 21 explored</div>`
- #d97706 on #fffbeb = 3.07 (need 4.5:1) ×1 — first at `tab "🌅 Hope"` [light] — src: `sel_hub/sel_tool_civicaction.js:1003`
  - `<span class="text-xs font-bold text-amber-600 uppercase self-center">Badges:</span>`

**sel_hub/sel_tool_howl.js** — 23 nodes

- #16a34a on #1e293b = 4.43 (need 4.5:1) ×8 — first at `tab "📋 Rubric"` [light+dark] — src: `sel_hub/sel_tool_howl.js:6`
  - `<h4 style="margin: 0px; color: rgb(22, 163, 74); font-size: 16px; font-weight: 800;">Crew Membership</h4>`
- #a855f7 on #1e293b = 3.69 (need 4.5:1) ×8 — first at `tab "📋 Rubric"` [light+dark] — src: `sel_hub/sel_tool_howl.js:6`
  - `<h4 style="margin: 0px; color: rgb(168, 85, 247); font-size: 16px; font-weight: 800;">Habits of Mind</h4>`
- #64748b on #0f172a = 3.75 (need 4.5:1) ×2 — first at `tab "✏️ Weekly check-in"` [light+dark] — src: `sel_hub/sel_tool_howl.js:13136`
  - `<div style="font-size: 11px; color: rgb(100, 116, 139); font-style: italic; margin-bottom: 8px;">Pick a rubric level.</div>`
- #0f172a on #7c3aed = 3.13 (need 4.5:1) ×2 — first at `tab "⏱️ Run Protocol"` [light+dark] — src: `sel_hub/sel_tool_howl.js:14479`
  - `<button style="padding: 6px 14px; border-radius: 6px; border: none; background: rgb(124, 58, 237); color: rgb(15, 23, 42); font-size: 12px; font-weight: 700; cursor: pointer;">▶ Use this protocol</but…`
- #ef4444 on #482e3d = 3.21 (need 4.5:1) ×2 — first at `tab "🌡️ Climate Gauge"` [light+dark] — src: `sel_hub/sel_tool_howl.js:14575`
  - `<button style="padding: 4px 8px; border-radius: 8px; border: 1px solid rgb(239, 68, 68); background: rgba(239, 68, 68, 0.2); color: rgb(239, 68, 68); font-size: 11px; font-weight: 700; cursor: pointer…`
- #0ea5e9 on #1b425e = 3.81 (need 4.5:1) ×1 — first at `tab "🧪 SMART Lab"` [light+dark] — src: `sel_hub/sel_tool_howl.js:5054`
  - `<button style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgb(14, 165, 233); background: rgba(14, 165, 233, 0.2); color: rgb(14, 165, 233); font-size: 12px; font-weight: 700; cursor: poi…`

**stem_lab/stem_tool_climateExplorer.js** — 22 nodes

- #4ade80 on #e2e8f0 = 1.41 (need 4.5:1) ×3 — first at `baseline` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:2079`
  - `<span style="color: rgb(74, 222, 128); font-size: 11px; font-weight: 800;">✓ At or under Paris-aligned target</span>`
- #fbbf24 on #e2e8f0 = 1.35 (need 4.5:1) ×2 — first at `baseline` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:2095`
  - `<div style="position: absolute; top: -2px; left: 40%; transform: translateX(-50%); color: rgb(251, 191, 36); font-size: 8px; font-weight: 700; white-space: nowrap;">Global ~4.8 t</div>`
- #a5b4fc on #e2e8f0 = 1.61 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:2084`
  - `<span style="color: rgb(165, 180, 252); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">🌍 Your footprint vs benchmarks</span>`
- #93c5fd on #e2e8f0 = 1.46 (need 3:1) ×1 — first at `tab "⚠️Tipping Points"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:2872`
  - `<div style="color: rgb(147, 197, 253); font-size: 20px; font-weight: 900; font-family: monospace;">+1 m</div>`
- #60a5fa on #e2e8f0 = 2.06 (need 4.5:1) ×1 — first at `tab "⚠️Tipping Points"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:2819`
  - `<div style="color: rgb(96, 165, 250); font-size: 14px; font-weight: 800;">150M people displaced</div>`
- #fbbf24 on #ffffff = 1.66 (need 4.5:1) ×1 — first at `tab "🗺️Policy Pathways"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:94`
  - `<strong style="color: rgb(251, 191, 36);">Energy Grid</strong>`
- #fbbf24 on #fef6e2 = 1.54 (need 4.5:1) ×1 — first at `tab "🗺️Policy Pathways"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:13`
  - `<button aria-label="Deep-dive for Energy Grid" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.533); background: rgba(251, 191, 36, 0.133); color: rgb…`
- #0ea5e9 on #ffffff = 2.77 (need 4.5:1) ×1 — first at `tab "🗺️Policy Pathways"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:105`
  - `<strong style="color: rgb(14, 165, 233);">Transportation</strong>`
- #0ea5e9 on #dff3fc = 2.42 (need 4.5:1) ×1 — first at `tab "🗺️Policy Pathways"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:105`
  - `<button aria-label="Deep-dive for Transportation" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(14, 165, 233, 0.533); background: rgba(14, 165, 233, 0.133); color: …`
- #f9a8d4 on #ffffff = 1.81 (need 4.5:1) ×1 — first at `tab "🗺️Policy Pathways"` [dark] — src: `stem_lab/stem_tool_climateExplorer.js:116`
  - `<strong style="color: rgb(249, 168, 212);">Buildings</strong>`
- … 9 more colour pairs in aggregate.json

**stem_lab/stem_tool_anatomy.js** — 21 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×7 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:167`
  - `<span class="anatomy-system-count" aria-hidden="true">0/20</span>`
- #475569 on #0f172a = 2.35 (need 4.5:1) ×5 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:3118`
  - `<p class="text-xs text-slate-600">Bones support movement, protect organs, store minerals, and house blood-forming marrow. Counts depend on age and anatomical conventions.</p>`
- #475569 on #1a2234 = 2.09 (need 4.5:1) ×2 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_anatomy.js:1897`
  - `<span class="text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mr-1">🧠 Layers</span>`
- #4338ca on #1a2234 = 2 (need 4.5:1) ×2 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_anatomy.js:13720`
  - `<button type="button" data-anatomy-layer-isolate="true" aria-label="Show only Skeletal layer" title="Temporarily show only the Skeletal layer" class="px-2 py-1 rounded-lg text-[0.6875rem] font-bold te…`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×2 — first at `tab "🏠 Homeostasis"` [dark] — src: `stem_lab/stem_tool_anatomy.js:15981`
  - `<textarea aria-label="Homeostasis hypothesis" placeholder="Hypothesis: What does each variable help regulate? Why can we not compare range widths measured in different units?" class="w-full text-[0.75…`
- #0284c7 on #ffffff = 4.09 (need 4.5:1) ×1 — first at `tab "🔗 Connect"` [light+dark] — src: `stem_lab/stem_tool_anatomy.js:13627`
  - `<h3 style="color: rgb(2, 132, 199); font-size: 15px; font-weight: 900; margin: 0px; line-height: 1.2;">Cross-system connections</h3>`
- #1e293b on #0f172a = 1.22 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_anatomy.js:2`
  - `<h3 class="text-lg font-bold text-slate-800 tracking-tight">🫀 Human Anatomy Explorer</h3>`
- #cbd5e1 on #f8fafc = 1.41 (need 4.5:1) ×1 — first at `open 8 toggles` [dark] — src: `stem_lab/stem_tool_anatomy.js:6723`
  - `<p class="anatomy-recall-evidence" data-anatomy-recall-evidence="quads">No scored answers recorded yet. Confidence is your self-rating, not a mastery score.</p>`

**sel_hub/sel_tool_digitalwellbeing.js** — 21 nodes

- #f1f5f9 on #ffffff = 1.09 (need 4.5:1) ×6 — first at `open 1 toggles` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:4657`
  - `<textarea id="dw-rf-input" placeholder="Everyone at school seems to have more friends than I do..." rows="3" style="width: 100%; padding: 10px; border: 1px solid rgb(249, 168, 212); border-radius: 6px…`
- #f1f5f9 on #fafaf9 = 1.04 (need 4.5:1) ×6 — first at `tab "🔍What’s Real?"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:5458`
  - `<h3 style="margin: 0px 0px 8px; color: rgb(241, 245, 249); font-size: 15px;"><span aria-hidden="true" style="margin-right: 6px;">🎯</span>The 90-second lateral read</h3>`
- #cbd5e1 on #ffffff = 1.48 (need 4.5:1) ×2 — first at `tab "💚When You’re Struggling"` [light] — src: `sel_hub/sel_tool_digitalwellbeing.js:5754`
  - `<input placeholder="Ms. Rodriguez" value="" style="padding: 8px 10px; border: 1px solid rgb(203, 213, 225); border-radius: 6px; font-size: 14px; margin-top: 2px;">`
- #ffffff on #f87171 = 2.76 (need 4.5:1) ×1 — first at `tab "⚖️Toolkit"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:4898`
  - `<button style="padding: 8px 14px; background: rgb(248, 113, 113); color: rgb(255, 255, 255); border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">Start reset</button>`
- #ffffff on #f59e0b = 2.8 (need 4.5:1) ×1 — first at `tab "⚖️Toolkit"` [light+dark] — src: not found (tag div)
  - `<div style="position: absolute; ...">`
- #451a03 on #2e2410 = 1.01 (need 4.5:1) ×1 — first at `tab "🔍What’s Real?"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:5490`
  - `<p style="margin: 0px 0px 12px; font-size: 13px; color: rgb(69, 26, 3); line-height: 1.55;">Read the scenario. Tap every red flag you see. There may be more than one per scenario — and at least one op…`
- #0891b2 on #1e293b = 3.97 (need 4.5:1) ×1 — first at `tab "💚When You’re Struggling"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:510`
  - `<div style="font-weight: 700; font-size: 15px; color: rgb(8, 145, 178); margin-bottom: 2px;">Crisis Text Line</div>`
- #7c3aed on #1e293b = 2.56 (need 4.5:1) ×1 — first at `tab "💚When You’re Struggling"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:5635`
  - `<div style="font-weight: 700; font-size: 15px; color: rgb(124, 58, 237); margin-bottom: 2px;">CyberTipline (NCMEC)</div>`
- #0d9488 on #1e293b = 3.9 (need 4.5:1) ×1 — first at `tab "💚When You’re Struggling"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:514`
  - `<div style="font-weight: 700; font-size: 15px; color: rgb(13, 148, 136); margin-bottom: 2px;">StopBullying.gov</div>`
- #db2777 on #1e293b = 3.18 (need 4.5:1) ×1 — first at `tab "💚When You’re Struggling"` [light+dark] — src: `sel_hub/sel_tool_digitalwellbeing.js:4492`
  - `<div style="font-weight: 700; font-size: 15px; color: rgb(219, 39, 119); margin-bottom: 2px;">The Trevor Project (LGBTQ+ youth)</div>`

**sel_hub/sel_tool_upstander.js** — 19 nodes

- #76808f on #0f172a = 4.46 (need 4.5:1) [dimmed: ancestor opacity 0.55] ×7 — first at `tab "✍️My Pledge"` [light+dark] — src: `sel_hub/sel_tool_upstander.js:1079`
  - `<div style="font-weight: 700; font-size: 12px; color: rgb(203, 213, 225); line-height: 1.3; margin-bottom: 2px;">Pledge Sealed</div>`
- #586478 on #0f172a = 2.98 (need 4.5:1) [dimmed: ancestor opacity 0.55] ×7 — first at `tab "✍️My Pledge"` [light+dark] — src: `sel_hub/sel_tool_upstander.js:1079`
  - `<div style="font-size: 10px; color: rgb(148, 163, 184); line-height: 1.35;">Sealed your Upstander Pledge</div>`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×3 — first at `tab "✍️My Pledge"` [light] — src: `sel_hub/sel_tool_upstander.js:9159`
  - `<textarea id="us-wl-saw" placeholder="A short description of what happened..." rows="2" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid rgb(203, 213, 225); border-radius: 8px; fo…`
- #f1f5f9 on #ffffff = 1.09 (need 4.5:1) ×2 — first at `tab "✍️My Pledge"` [light] — src: `sel_hub/sel_tool_upstander.js:9121`
  - `<input type="text" placeholder="Ms. Rodriguez" value="" style="margin-top: 4px; padding: 8px 10px; font-size: 13px; border: 1px solid rgb(203, 213, 225); border-radius: 6px; font-family: inherit; font…`

**sel_hub/sel_tool_path.js** — 19 nodes

- #ffffff on #fbbf24 = 1.66 (need 4.5:1) ×2 — first at `tab "✏️ Work on it"` [light+dark] — src: `sel_hub/sel_tool_path.js:288`
  - `<button aria-label="Next stage" style="padding: 8px 14px; border-radius: 8px; border: none; background: rgb(251, 191, 36); color: rgb(255, 255, 255); cursor: pointer; font-weight: 800; font-size: 13px…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_path.js:338`
  - `<div style="margin: 0px 8px; padding: 8px; font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(not filled in)</div>`
- #64748b on #1e293b = 3.07 (need 4.5:1) ×1 — first at `tab "✏️ Work on it"` [light+dark] — src: `sel_hub/sel_tool_path.js:43`
  - `<button role="tab" aria-selected="false" style="padding: 6px 10px; border-radius: 6px; border: 1px solid rgb(51, 65, 85); background: rgb(30, 41, 59); color: rgb(100, 116, 139); cursor: pointer; font-…`
- #fef5de on #fbbf24 = 1.53 (need 4.5:1) [dimmed: ancestor opacity 0.85] ×1 — first at `tab "🖨 Print view"` [light+dark] — src: not found (tag span)
  - `<span style="font-size: 11px; font-weight: 700; opacity: 0.85;">Stage 1 ·</span>`
- #fef0da on #f59e0b = 1.91 (need 4.5:1) [dimmed: ancestor opacity 0.85] ×1 — first at `tab "🖨 Print view"` [light+dark] — src: not found (tag span)
  - `<span style="font-size: 11px; font-weight: 700; opacity: 0.85;">Stage 2 ·</span>`
- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_path.js:43`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Positive Possible</span>`
- #dbf2fc on #0ea5e9 = 2.39 (need 4.5:1) [dimmed: ancestor opacity 0.85] ×1 — first at `tab "🖨 Print view"` [light+dark] — src: not found (tag span)
  - `<span style="font-size: 11px; font-weight: 700; opacity: 0.85;">Stage 3 ·</span>`
- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: not found (tag span)
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Now</span>`
- #dcf1e4 on #16a34a = 2.78 (need 4.5:1) [dimmed: ancestor opacity 0.85] ×1 — first at `tab "🖨 Print view"` [light+dark] — src: not found (tag span)
  - `<span style="font-size: 11px; font-weight: 700; opacity: 0.85;">Stage 4 ·</span>`
- #ffffff on #16a34a = 3.29 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_path.js:47`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Enroll</span>`
- … 7 more colour pairs in aggregate.json

**stem_lab/stem_tool_playlab.js** — 18 nodes

- #a78bfa on #f6f3ff = 2.48 (need 4.5:1) ×5 — first at `baseline` [dark] — src: `stem_lab/stem_tool_playlab.js:233`
  - `<span style="color: rgb(167, 139, 250); font-style: italic;">🎙️ Show out</span>`
- #fbbf24 on #ffffff = 1.66 (need 4.5:1) ×5 — first at `baseline` [dark] — src: `stem_lab/stem_tool_playlab.js:66`
  - `<span style="color: rgb(251, 191, 36); font-weight: 700;">2.3</span>`
- #fbbf24 on #f8fafc = 1.59 (need 4.5:1) ×2 — first at `baseline` [dark] — src: `stem_lab/stem_tool_playlab.js:3649`
  - `<div style="font-weight: 700; color: rgb(251, 191, 36); margin-bottom: 2px;">Second</div>`
- #a5b4fc on #eff0fe = 1.76 (need 4.5:1) ×1 — first at `tab "Scout"` [light+dark] — src: not found (tag button)
  - `<button aria-label="Run a random scenari..." data-pl-focusable="true" title="Pick a random scenar..." style="padding: 6px 11px; b...">`
- #f59e0b on #fef3e2 = 1.95 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_playlab.js:1643`
  - `<span style="color: rgb(245, 158, 11); font-weight: 700; margin-right: 6px;">Workable:</span>`
- #10b981 on #d4f2e8 = 2.13 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_playlab.js:4860`
  - `<div style="font-weight: 700; color: rgb(16, 185, 129); margin-bottom: 2px;">🟢 Most open</div>`
- #16a34a on #e3f4e9 = 2.88 (need 4.5:1) ×1 — first at `tab "⚽ Soccer"` [dark] — src: `stem_lab/stem_tool_playlab.js:1630`
  - `<span style="color: rgb(22, 163, 74); font-weight: 700; margin-right: 6px;">Great match:</span>`
- #fbbf24 on #fff9e9 = 1.58 (need 4.5:1) ×1 — first at `tab "Scout"` [dark] — src: not found (tag button)
  - `<button aria-label="Print activity sheet..." data-pl-focusable="true" title="Open a printable act..." style="padding: 6px 11px; b...">`
- #fbbf24 on #fef5e7 = 1.54 (need 4.5:1) ×1 — first at `tab "Scout"` [dark] — src: not found (tag button)
  - `<button aria-label="Export the current p..." data-pl-focusable="true" title="Make a Topps-style t..." style="padding: 6px 11px; b...">`

**sel_hub/sel_tool_advocacy.js** — 17 nodes

- #64748b on #0f172a = 3.75 (need 4.5:1) ×13 — first at `tab "🛠 Accommodation Library"` [light+dark] — src: `sel_hub/sel_tool_advocacy.js:6623`
  - `<span style="font-size: 10px; color: rgb(100, 116, 139); margin-left: 8px; font-weight: 400;">· Time &amp; Pace</span>`
- #ffffff on #818cf8 = 2.98 (need 4.5:1) ×3 — first at `tab "📝 Scripts"` [light+dark] — src: `sel_hub/sel_tool_advocacy.js:13345`
  - `<button aria-label="Complete &amp; Next" style="padding: 10px 20px; border-radius: 10px; border: none; background: rgb(129, 140, 248); color: rgb(255, 255, 255); font-weight: 600; font-size: 13px; cur…`
- #818cf8 on #273153 = 4.26 (need 4.5:1) ×1 — first at `tab "💬 Phrases"` [light+dark] — src: `sel_hub/sel_tool_advocacy.js:1321`
  - `<button style="padding: 6px 12px; border-radius: 8px; border: none; background: rgba(99, 102, 241, 0.133); color: rgb(129, 140, 248); font-size: 11px; font-weight: 600; cursor: pointer; flex-shrink: 0…`

**stem_lab/stem_tool_brainatlas.js** — 14 nodes

- #c4b5fd on #ffffff = 1.84 (need 4.5:1) ×10 — first at `baseline` [dark] — src: `stem_lab/stem_tool_brainatlas.js:9692`
  - `<p class="brainatlas-topbar-eyebrow">STEM learning lab</p>`
- #86efac on #f8fafc = 1.34 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_brainatlas.js:10715`
  - `<button type="button" aria-pressed="false" data-brainatlas-quiz-toggle="true" class="brainatlas-quiz-button px-3 py-1.5 text-xs font-bold transition-all transition-colors bg-green-50 text-green-700 bo…`
- #c4b5fd on #f1f5f9 = 1.68 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_brainatlas.js:11038`
  - `<button type="button" class="brainatlas-zoom-readout" data-brainatlas-zoom-level="true" aria-label="Reset diagram zoom: 100%" title="Reset diagram zoom">100%</button>`
- #5eead4 on #ffffff = 1.47 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_brainatlas.js:12870`
  - `<p class="brainatlas-region-list-eyebrow">Explore the diagram</p>`
- #5eead4 on #f8fafc = 1.41 (need 4.5:1) ×1 — first at `open 4 toggles` [dark] — src: `stem_lab/stem_tool_brainatlas.js:9746`
  - `<p class="brainatlas-mission-kicker">Neural systems lab</p>`

**sel_hub/sel_tool_execfunction.js** — 13 nodes

- #0891b2 on #1e293b = 3.97 (need 4.5:1) ×4 — first at `tab "🚀Start"` [light+dark] — src: `sel_hub/sel_tool_execfunction.js:652`
  - `<div style="font-size: 11px; font-weight: 700; color: rgb(8, 145, 178); margin-bottom: 6px; text-transform: uppercase;">Try it now</div>`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×4 — first at `tab "📐Plan"` [light] — src: `sel_hub/sel_tool_execfunction.js:798`
  - `<input id="ef-plan-goal" type="text" placeholder="Submit science fair project" value="" style="width: 100%; border: 1px solid rgb(207, 250, 254); border-radius: 8px; padding: 10px; font-size: 13px; fo…`
- #ffffff on #0891b2 = 3.68 (need 4.5:1) ×3 — first at `tab "🚀Start"` [light+dark] — src: `sel_hub/sel_tool_execfunction.js:655`
  - `<button aria-label="Start 5-minute timer" style="padding: 12px 28px; background: rgb(8, 145, 178); color: rgb(255, 255, 255); border: none; border-radius: 10px; font-weight: 800; font-size: 14px; curs…`
- #0891b2 on #0c2e30 = 3.93 (need 4.5:1) ×1 — first at `tab "🚀Start"` [light+dark] — src: `sel_hub/sel_tool_execfunction.js:638`
  - `<div style="font-size: 10px; font-weight: 700; color: rgb(8, 145, 178); margin-bottom: 2px; text-transform: uppercase;">When this fits:</div>`
- #16a34a on #0b2e22 = 4.46 (need 4.5:1) ×1 — first at `tab "🚀Start"` [light+dark] — src: `sel_hub/sel_tool_execfunction.js:642`
  - `<div style="font-size: 10px; font-weight: 700; color: rgb(22, 163, 74); margin-bottom: 2px; text-transform: uppercase;">How to do it:</div>`

**stem_lab/stem_tool_cell.js** — 12 nodes

- #697d76 on #ffffff = 4.37 (need 4.5:1) ×11 — first at `baseline` [light+dark] — src: `stem_lab/stem_tool_cell.js:3092`
  - `<span data-cell-gallery-movement="true" class="mt-1 block text-[0.625rem] leading-snug text-slate-600">Pseudopods</span>`
- #687b73 on #edf7f1 = 4.1 (need 4.5:1) ×1 — first at `baseline` [light+dark] — src: `stem_lab/stem_tool_cell.js:826`
  - `<span data-cell-visibility-state="true">Visible</span>`

**sel_hub/sel_tool_windowoftolerance.js** — 12 nodes

- #ffffff on #ef4444 = 3.76 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:365`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(239, 68, 68); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Add…`
- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:365`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(14, 165, 233); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Ad…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨️ Print view"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:591`
  - `<div style="font-size: 11px; color: rgb(148, 163, 184); font-style: italic; padding-left: 10px;">(not filled in)</div>`
- #ffffff on #14b8a6 = 2.48 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:365`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(20, 184, 166); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Ad…`
- #ffffff on #fbbf24 = 1.66 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:365`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(251, 191, 36); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Ad…`
- #ffffff on #a78bfa = 2.72 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:365`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(167, 139, 250); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ A…`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "📍 Check in"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:497`
  - `<span style="display: block; font-size: 14px; font-weight: 900; color: rgb(239, 68, 68); margin-bottom: 3px;">High activation · Hyperarousal</span>`
- #ffffff on #0d9488 = 3.74 (need 4.5:1) ×1 — first at `tab "🖨️ Print view"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:624`
  - `<span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">In-the-window signs (regulated)</span>`
- #ffffff on #d97706 = 3.18 (need 4.5:1) ×1 — first at `tab "🖨️ Print view"` [light+dark] — src: `sel_hub/sel_tool_windowoftolerance.js:325`
  - `<span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Things that push me out of the window</span>`

**stem_lab/stem_tool_epidemic.js** — 11 nodes

- #059669 on #ecfdf5 = 3.57 (need 4.5:1) ×1 — first at `tab "🔬 Inquiry"` [light+dark] — src: `stem_lab/stem_tool_epidemic.js:4645`
  - `<div class="text-lg font-black mb-1" style="color: rgb(5, 150, 105);">🟢 Declining</div>`
- #c4b5fd on #ffffff = 1.84 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1072`
  - `<strong style="color: rgb(196, 181, 253);">School-age (5-17)</strong>`
- #c4b5fd on #f3e8fe = 1.56 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1314`
  - `<button aria-label="Open deep-dive for School-age (5-17)" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.533); background: rgba(168, 85, 247, 0.133);…`
- #7dd3fc on #ffffff = 1.66 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1085`
  - `<strong style="color: rgb(125, 211, 252);">Working-age (18-64)</strong>`
- #7dd3fc on #dff3fc = 1.45 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1314`
  - `<button aria-label="Open deep-dive for Working-age (18-64)" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(14, 165, 233, 0.533); background: rgba(14, 165, 233, 0.133…`
- #fca5a5 on #ffffff = 1.89 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1098`
  - `<strong style="color: rgb(252, 165, 165);">Elderly (65+)</strong>`
- #fca5a5 on #fae2e2 = 1.54 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1314`
  - `<button aria-label="Open deep-dive for Elderly (65+)" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220, 38, 38, 0.533); background: rgba(220, 38, 38, 0.133); color…`
- #86efac on #ffffff = 1.4 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1111`
  - `<strong style="color: rgb(134, 239, 172);">Healthcare workers</strong>`
- #86efac on #e0f3e7 = 1.21 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1314`
  - `<button aria-label="Open deep-dive for Healthcare workers" style="width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(22, 163, 74, 0.533); background: rgba(22, 163, 74, 0.133); …`
- #86efac on #d0e6d8 = 1.06 (need 4.5:1) ×1 — first at `tab "🏥 Outbreak Response"` [dark] — src: `stem_lab/stem_tool_epidemic.js:1231`
  - `<div style="font-weight: 800; font-size: 13px;">County PHO</div>`
- … 1 more colour pairs in aggregate.json

**sel_hub/sel_tool_circlesofsupport.js** — 10 nodes

- #dc2626 on #0f172a = 3.69 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_circlesofsupport.js:39`
  - `<div style="font-size: 14px; font-weight: 800; color: rgb(220, 38, 38); flex: 1 1 0%;">Intimacy (0)</div>`
- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_circlesofsupport.js:366`
  - `<button aria-label="Add to Friendship" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(245, 158, 11); color: rgb(255, 255, 255); font-weight: 700; font-siz…`
- #ffffff on #16a34a = 3.29 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_circlesofsupport.js:366`
  - `<button aria-label="Add to Participation" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(22, 163, 74); color: rgb(255, 255, 255); font-weight: 700; font-s…`
- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_circlesofsupport.js:366`
  - `<button aria-label="Add to Exchange (paid)" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(14, 165, 233); color: rgb(255, 255, 255); font-weight: 700; fon…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_circlesofsupport.js:467`
  - `<div style="padding: 0px 12px; font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(empty)</div>`

**sel_hub/sel_tool_sleep.js** — 10 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:717`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No diary entries yet.</div>`
- #3b82f6 on #1e293b = 3.97 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:394`
  - `<div style="font-size: 11px; color: rgb(59, 130, 246); font-weight: 700; margin-bottom: 6px;">✓ What helps</div>`
- #a16207 on #0f172a = 3.62 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:49`
  - `<span style="font-size: 15px; font-weight: 800; color: rgb(161, 98, 7);">Caffeine too late</span>`
- #a16207 on #1e293b = 2.97 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:394`
  - `<div style="font-size: 11px; color: rgb(161, 98, 7); font-weight: 700; margin-bottom: 6px;">✓ What helps</div>`
- #a855f7 on #1e293b = 3.69 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:394`
  - `<div style="font-size: 11px; color: rgb(168, 85, 247); font-weight: 700; margin-bottom: 6px;">✓ What helps</div>`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:394`
  - `<div style="font-size: 11px; color: rgb(239, 68, 68); font-weight: 700; margin-bottom: 6px;">✓ What helps</div>`
- #dc2626 on #0f172a = 3.69 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:98`
  - `<span style="font-size: 15px; font-weight: 800; color: rgb(220, 38, 38);">A medical / mental health condition</span>`
- #dc2626 on #1e293b = 3.02 (need 4.5:1) ×1 — first at `tab "🚧 Barriers"` [light+dark] — src: `sel_hub/sel_tool_sleep.js:394`
  - `<div style="font-size: 11px; color: rgb(220, 38, 38); font-weight: 700; margin-bottom: 6px;">✓ What helps</div>`
- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×1 — first at `tab "📓 Sleep diary" (CRASHED)` [light+dark] — src: `sel_hub/sel_tool_sleep.js:165`
  - `<button type="button" style="min-height: 44px; padding: 10px 20px; border-radius: 8px; cursor: pointer; border: 1px solid rgb(56, 189, 248); background: rgb(14, 165, 233); color: rgb(255, 255, 255); f…`

**sel_hub/sel_tool_maps.js** — 9 nodes

- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×2 — first at `tab "✏️ Work on it"` [light+dark] — src: `sel_hub/sel_tool_maps.js:280`
  - `<button aria-label="Next prompt" style="padding: 8px 14px; border-radius: 8px; border: none; background: rgb(14, 165, 233); color: rgb(255, 255, 255); cursor: pointer; font-weight: 800; font-size: 13p…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_maps.js:331`
  - `<div style="margin: 0px 8px; padding: 8px; font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(not filled in)</div>`
- #64748b on #1e293b = 3.07 (need 4.5:1) ×1 — first at `tab "✏️ Work on it"` [light+dark] — src: not found (tag button)
  - `<button style="padding: 6px 10px; b..." role="tab" aria-selected="false">`
- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_maps.js:5`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">My Dream</span>`
- #ffffff on #ec4899 = 3.52 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_maps.js:6`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Who I Am</span>`
- #ffffff on #16a34a = 3.29 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_maps.js:6`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">My Gifts</span>`
- #ffffff on #0891b2 = 3.68 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_maps.js:6`
  - `<span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">What I Need</span>`

**sel_hub/sel_tool_onepageprofile.js** — 8 nodes

- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:327`
  - `<button aria-label="Add item" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(245, 158, 11); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;"…`
- #ffffff on #10b981 = 2.53 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:327`
  - `<button aria-label="Add item" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(16, 185, 129); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;"…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:473`
  - `<div style="padding: 8px; font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(not filled in)</div>`
- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:236`
  - `<div style="font-size: 13px; color: rgb(99, 102, 241); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; margin-bottom: 10px;">🤝 How best to support me</div>`
- #ffffff on #6366f1 = 4.46 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_onepageprofile.js:327`
  - `<button aria-label="Add item" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(99, 102, 241); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;"…`

**stem_lab/stem_tool_dinolab.js** — 7 nodes

- #5eead4 on #e2e8f0 = 1.19 (need 4.5:1) ×4 — first at `baseline` [dark] — src: `stem_lab/stem_tool_dinolab.js:5109`
  - `<span style="text-transform: uppercase; letter-spacing: 0.06em; font-weight: 900; color: rgb(94, 234, 212);">Discover</span>`
- #5eead4 on #f8fafc = 1.41 (need 4.5:1) ×1 — first at `tab "🌎 Map"` [dark] — src: `stem_lab/stem_tool_dinolab.js:7210`
  - `<div style="font-size: 18px; font-weight: 900; color: rgb(94, 234, 212);">359</div>`
- #fde68a on #f8fafc = 1.19 (need 4.5:1) ×1 — first at `tab "🌎 Map"` [dark] — src: `stem_lab/stem_tool_dinolab.js:62`
  - `<div style="font-size: 14px; font-weight: 900; color: rgb(253, 230, 138);">North America</div>`
- #5eead4 on #e3f6f4 = 1.32 (need 4.5:1) ×1 — first at `tab "3D Field Station"` [dark] — src: `stem_lab/stem_tool_dinolab.js:6154`
  - `<span style="display: block; margin-top: 1px; font-size: 10.5px; color: rgb(94, 234, 212);">Current</span>`

**sel_hub/sel_tool_crewprotocols.js** — 7 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:752`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No protocols in plan yet.</div>`
- #a855f7 on #1e293b = 3.69 (need 4.5:1) ×1 — first at `tab "📚 Browse"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:568`
  - `<div style="font-size: 11px; color: rgb(168, 85, 247); font-weight: 700; margin-bottom: 4px;">Purpose</div>`
- #3b82f6 on #1e293b = 3.97 (need 4.5:1) ×1 — first at `tab "📚 Browse"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:568`
  - `<div style="font-size: 11px; color: rgb(59, 130, 246); font-weight: 700; margin-bottom: 4px;">Purpose</div>`
- #ec4899 on #1e293b = 4.14 (need 4.5:1) ×1 — first at `tab "📚 Browse"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:568`
  - `<div style="font-size: 11px; color: rgb(236, 72, 153); font-weight: 700; margin-bottom: 4px;">Purpose</div>`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "📚 Browse"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:568`
  - `<div style="font-size: 11px; color: rgb(239, 68, 68); font-weight: 700; margin-bottom: 4px;">Purpose</div>`
- #dc2626 on #0f172a = 3.69 (need 4.5:1) ×1 — first at `tab "📚 Browse"` [light+dark] — src: `sel_hub/sel_tool_crewprotocols.js:592`
  - `<button aria-label="Add to plan" aria-pressed="false" style="padding: 6px 14px; border-radius: 6px; border: 1px solid rgb(220, 38, 38); background: transparent; color: rgb(220, 38, 38); cursor: pointe…`

**sel_hub/sel_tool_zones.js** — 6 nodes

- #f87171 on #4a3746 = 3.94 (need 4.5:1) ×2 — first at `tab "📋 My Plans"` [light+dark] — src: `sel_hub/sel_tool_zones.js:93`
  - `<span style="padding: 2px 8px; border-radius: 4px; background: rgba(248, 113, 113, 0.2); color: rgb(248, 113, 113); font-size: 9px; font-weight: 800; text-transform: uppercase;">red → yellow</span>`
- #60a5fa on #2b4261 = 4.02 (need 4.5:1) ×2 — first at `tab "📋 My Plans"` [light+dark] — src: `sel_hub/sel_tool_zones.js:93`
  - `<span style="padding: 2px 8px; border-radius: 4px; background: rgba(96, 165, 250, 0.2); color: rgb(96, 165, 250); font-size: 9px; font-weight: 800; text-transform: uppercase;">blue → yellow</span>`
- #ffffff on #60a5fa = 2.54 (need 4.5:1) ×1 — first at `tab "📋 My Plans"` [light+dark] — src: `sel_hub/sel_tool_zones.js:33813`
  - `<button style="margin-top: 6px; padding: 5px 12px; border-radius: 6px; border: none; background: rgb(96, 165, 250); color: rgb(255, 255, 255); font-size: 11px; font-weight: 700; cursor: pointer;">Open…`
- #8b5cf6 on #1e293b = 3.45 (need 4.5:1) ×1 — first at `tab "🧰 My Toolbox"` [light+dark] — src: `sel_hub/sel_tool_zones.js:14446`
  - `<div style="font-size: 12px; font-weight: 700; color: rgb(139, 92, 246);">Body Scan</div>`

**sel_hub/sel_tool_conflict.js** — 6 nodes

- #ffffff on #10b981 = 2.53 (need 4.5:1) ×3 — first at `tab "🗣️ I-Statements"` [light+dark] — src: `sel_hub/sel_tool_conflict.js:1540`
  - `<button aria-label="Complete &amp; Next" style="padding: 10px 20px; border-radius: 10px; border: none; background: rgb(16, 185, 129); color: rgb(255, 255, 255); font-weight: 600; font-size: 13px; curs…`
- #ef4444 on #211b2c = 4.43 (need 4.5:1) ×2 — first at `tab "🗣️ I-Statements"` [light+dark] — src: `sel_hub/sel_tool_conflict.js:1511`
  - `<p style="font-size: 10px; color: rgb(239, 68, 68); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-weight: 700;">"You" statement</p>`
- #ffffff on #6366f1 = 4.46 (need 4.5:1) ×1 — first at `tab "🗣️ I-Statements"` [light+dark] — src: `sel_hub/sel_tool_conflict.js:1540`
  - `<button aria-label="Complete &amp; Next" style="padding: 10px 20px; border-radius: 10px; border: none; background: rgb(99, 102, 241); color: rgb(255, 255, 255); font-weight: 600; font-size: 13px; curs…`

**sel_hub/sel_tool_growthmindset.js** — 6 nodes

- #ffffff on #059669 = 3.76 (need 4.5:1) ×2 — first at `tab "🌟Yet Stories"` [light+dark] — src: `sel_hub/sel_tool_growthmindset.js:1059`
  - `<button style="padding: 8px 16px; background: rgb(5, 150, 105); border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; color: rgb(255, 255, 255);">Next Story →</button>`
- #059669 on #0e3326 = 3.66 (need 4.5:1) ×2 — first at `tab "🏫Educator Lens"` [light+dark] — src: `sel_hub/sel_tool_growthmindset.js:1483`
  - `<div style="font-size: 10px; font-weight: 700; color: rgb(5, 150, 105); text-transform: uppercase; margin-bottom: 4px;">Growth mindset reframe</div>`
- #059669 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "🌟Yet Stories"` [light+dark] — src: `sel_hub/sel_tool_growthmindset.js:549`
  - `<div style="font-size: 11px; color: rgb(5, 150, 105); font-weight: 600;">Media</div>`
- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×1 — first at `tab "🗺️My Growth Map"` [light] — src: `sel_hub/sel_tool_growthmindset.js:1078`
  - `<input id="gm-new-goal" type="text" placeholder="e.g. write a persuasive essay" value="" style="width: 100%; border: 2px solid rgb(167, 243, 208); border-radius: 10px; padding: 10px 12px; font-size: 1…`

**sel_hub/sel_tool_behavioralactivation.js** — 6 nodes

- #ffffff on #22c55e = 2.27 (need 4.5:1) ×1 — first at `tab "➕ Plan"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:426`
  - `<button aria-label="Add activity" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(34, 197, 94); color: rgb(255, 255, 255); font-weight: 700; font-size: 12p…`
- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×1 — first at `tab "➕ Plan"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:426`
  - `<button aria-label="Add activity" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(245, 158, 11); color: rgb(255, 255, 255); font-weight: 700; font-size: 12…`
- #ffffff on #3b82f6 = 3.67 (need 4.5:1) ×1 — first at `tab "➕ Plan"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:426`
  - `<button aria-label="Add activity" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(59, 130, 246); color: rgb(255, 255, 255); font-weight: 700; font-size: 12…`
- #ffffff on #a855f7 = 3.95 (need 4.5:1) ×1 — first at `tab "➕ Plan"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:426`
  - `<button aria-label="Add activity" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(168, 85, 247); color: rgb(255, 255, 255); font-weight: 700; font-size: 12…`
- #ffffff on #16a34a = 3.29 (need 4.5:1) ×1 — first at `tab "➕ Plan"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:426`
  - `<button aria-label="Add activity" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(22, 163, 74); color: rgb(255, 255, 255); font-weight: 700; font-size: 12p…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_behavioralactivation.js:158`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_bigfeelings.js** — 6 nodes

- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×2 — first at `tab "📓 Hassle log"` [light+dark] — src: `sel_hub/sel_tool_bigfeelings.js:534`
  - `<button aria-label="Log this incident" style="padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer; background: rgb(14, 165, 233); color: rgb(255, 255, 255); font-weight: 700; font-siz…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_bigfeelings.js:842`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No hassle log entries yet.</div>`
- #ffffff on #f59e0b = 2.14 (need 4.5:1) ×1 — first at `tab "⚡ My triggers"` [light+dark] — src: `sel_hub/sel_tool_bigfeelings.js:490`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(245, 158, 11); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Ad…`
- #ffffff on #ef4444 = 3.76 (need 4.5:1) ×1 — first at `tab "⚡ My triggers"` [light+dark] — src: `sel_hub/sel_tool_bigfeelings.js:490`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(239, 68, 68); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Add…`

**sel_hub/sel_tool_careercompass.js** — 6 nodes

- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×3 — first at `tab "✏️ Self-check"` [light+dark] — src: `sel_hub/sel_tool_careercompass.js:5`
  - `<span style="font-size: 11px; color: rgb(99, 102, 241); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Conventional · Organizers</span>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_careercompass.js:703`
  - `<div style="padding: 14px; font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">Self-check not complete yet.</div>`
- #ef4444 on #1a233f = 4.11 (need 4.5:1) ×1 — first at `tab "✏️ Self-check"` [light+dark] — src: `sel_hub/sel_tool_careercompass.js:55`
  - `<span style="color: rgb(239, 68, 68); font-weight: 700;">Don't like</span>`

**sel_hub/sel_tool_transitions.js** — 5 nodes

- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×2 — first at `tab "⚓My Anchors"` [light] — src: `sel_hub/sel_tool_transitions.js:459`
  - `<input aria-label="Add an anchor" type="text" placeholder="What stays constant when everything changes..." value="" style="flex: 1 1 0%; border: 2px solid rgb(186, 230, 253); border-radius: 10px; padd…`
- #0284c7 on #1e293b = 3.57 (need 4.5:1) ×1 — first at `tab "📈The Change Curve"` [light+dark] — src: `sel_hub/sel_tool_transitions.js:364`
  - `<button aria-label="Mark this as where I am on the Change Curve" style="padding: 10px 24px; border-radius: 20px; cursor: pointer; font-weight: 700; font-size: 13px; background: rgb(30, 41, 59); color:…`
- #0284c7 on #0c2840 = 3.68 (need 4.5:1) ×1 — first at `tab "📖Change Stories"` [light+dark] — src: `sel_hub/sel_tool_transitions.js:72`
  - `<div style="display: inline-flex; align-items: center; gap: 4px; background: rgb(12, 40, 64); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; color: rgb(2, 132, 199); margin…`
- #ffffff on #0284c7 = 4.09 (need 4.5:1) ×1 — first at `tab "📖Change Stories"` [light+dark] — src: `sel_hub/sel_tool_transitions.js:422`
  - `<button aria-label="Next story" style="padding: 8px 16px; background: rgb(2, 132, 199); border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; color: rgb(255, 255, 255)…`

**sel_hub/sel_tool_ecomap.js** — 5 nodes

- #64748b on #0f172a = 3.75 (need 4.5:1) ×2 — first at `tab "✏️ List / Edit"` [light+dark] — src: `sel_hub/sel_tool_ecomap.js:454`
  - `<div style="font-size: 11px; color: rgb(100, 116, 139); font-style: italic; padding-left: 30px;">(nothing in this system yet)</div>`
- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×2 — first at `tab "✏️ List / Edit"` [light+dark] — src: `sel_hub/sel_tool_ecomap.js:50`
  - `<div style="font-size: 13px; font-weight: 800; color: rgb(99, 102, 241); flex: 1 1 0%;">Services / Helpers</div>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_ecomap.js:101`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_sourcesofstrength.js** — 5 nodes

- #ec4899 on #1e293b = 4.14 (need 4.5:1) ×1 — first at `tab "🌱 Build a source"` [light+dark] — src: `sel_hub/sel_tool_sourcesofstrength.js:325`
  - `<strong style="color: rgb(236, 72, 153);">How to build this: </strong>`
- #a855f7 on #1e293b = 3.69 (need 4.5:1) ×1 — first at `tab "🌱 Build a source"` [light+dark] — src: `sel_hub/sel_tool_sourcesofstrength.js:325`
  - `<strong style="color: rgb(168, 85, 247);">How to build this: </strong>`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "🌱 Build a source"` [light+dark] — src: `sel_hub/sel_tool_sourcesofstrength.js:325`
  - `<strong style="color: rgb(239, 68, 68);">How to build this: </strong>`
- #94a3b8 on #f8fafc = 2.45 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sourcesofstrength.js:383`
  - `<span style="font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(not rated)</span>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sourcesofstrength.js:106`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_stressbucket.js** — 5 nodes

- #ffffff on #fb7185 = 2.69 (need 4.5:1) ×2 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_stressbucket.js:713`
  - `<button aria-label="Add stressor" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(251, 113, 133); color: rgb(255, 255, 255); font-weight: 700; font-size: 1…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_stressbucket.js:602`
  - `<div style="font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(none added)</div>`
- #ffffff on #ef4444 = 3.76 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_stressbucket.js:786`
  - `<button aria-label="Add overflow sign" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(239, 68, 68); color: rgb(255, 255, 255); font-weight: 700; font-size…`

**sel_hub/sel_tool_griefloss.js** — 4 nodes

- #6366f1 on #1a2244 = 3.46 (need 4.5:1) ×2 — first at `tab "🌊 The four tasks"` [light+dark] — src: `sel_hub/sel_tool_griefloss.js:56`
  - `<span style="font-size: 10px; color: rgb(99, 102, 241); font-weight: 800;">Task 1</span>`
- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×1 — first at `tab "🌊 The four tasks"` [light+dark] — src: `sel_hub/sel_tool_griefloss.js:479`
  - `<div style="font-size: 11px; color: rgb(99, 102, 241); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Reflection prompts</div>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_griefloss.js:11`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">Worden's Tasks of Mourning …`

**sel_hub/sel_tool_perma.js** — 4 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_perma.js:557`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">Self-check not complete yet.</div>`
- #a855f7 on #1e293b = 3.69 (need 4.5:1) ×1 — first at `tab "✏️ Self-check"` [light+dark] — src: `sel_hub/sel_tool_perma.js:333`
  - `<button aria-label="Set this rating" style="padding: 4px 8px; border-radius: 4px; border: 1px solid rgb(168, 85, 247); background: transparent; color: rgb(168, 85, 247); cursor: pointer; font-size: 11…`
- #ef4444 on #1e293b = 3.88 (need 4.5:1) ×1 — first at `tab "✏️ Self-check"` [light+dark] — src: `sel_hub/sel_tool_perma.js:333`
  - `<button aria-label="Set this rating" style="padding: 4px 8px; border-radius: 4px; border: 1px solid rgb(239, 68, 68); background: transparent; color: rgb(239, 68, 68); cursor: pointer; font-size: 11px…`

**sel_hub/sel_tool_sfbt.js** — 4 nodes

- #64748b on #0f172a = 3.75 (need 4.5:1) ×2 — first at `tab "📊 Scaling"` [light+dark] — src: `sel_hub/sel_tool_sfbt.js:262`
  - `<span>0 = worst it has ever been</span>`
- #ffffff on #3b82f6 = 3.67 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sfbt.js:169`
  - `<div style="background: rgb(59, 130, 246); color: rgb(255, 255, 255); padding: 6px 12px; border-radius: 4px; margin-bottom: 6px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-sp…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sfbt.js:75`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**stem_lab/stem_tool_dataplot.js** — 3 nodes

- #8b5cf6 on #ffffff = 4.23 (need 4.5:1) ×2 — first at `tab "🛠️ Data tools"` [light+dark] — src: `stem_lab/stem_tool_dataplot.js:1582`
  - `<div class="text-[0.6875rem] text-violet-500 mb-2">Generate 20 points with a target correlation strength:</div>`
- #6366f1 on #ffffff = 4.46 (need 4.5:1) ×1 — first at `tab "🛠️ Data tools"` [light+dark] — src: `stem_lab/stem_tool_dataplot.js:1623`
  - `<span class="text-[0.625rem] text-indigo-500">Recipes use the current column shape.</span>`

**stem_lab/stem_tool_lifeskills.js** — 3 nodes

- #a855f7 on #faf5ff = 3.68 (need 4.5:1) ×1 — first at `tab "💰 Budget"` [light+dark] — src: `stem_lab/stem_tool_lifeskills.js:2456`
  - `<p class="text-[11px] font-bold text-purple-500 uppercase">Wants</p>`
- #059669 on #ecfdf5 = 3.57 (need 4.5:1) ×1 — first at `tab "💰 Budget"` [light+dark] — src: `stem_lab/stem_tool_lifeskills.js:7075`
  - `<div class="text-base font-black" style="color: rgb(5, 150, 105);">🟢 Balanced budget</div>`
- #dc2626 on #fef2f2 = 4.41 (need 4.5:1) ×1 — first at `tab "💳 Credit"` [light+dark] — src: not found (tag p)
  - `<p class="text-lg font-bold text-red-600">$4,349</p>`

**sel_hub/sel_tool_decisions.js** — 3 nodes

- #78350f on #262527 = 1.68 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_decisions.js:2695`
  - `<div class="no-print" style="padding: 12px; borde...">`
- #ffffff on #6366f1 = 4.46 (need 4.5:1) ×1 — first at `tab "⚖️ Ethical Dilemmas"` [light+dark] — src: `sel_hub/sel_tool_decisions.js:1842`
  - `<button aria-label="AI analysis" style="padding: 10px 20px; border-radius: 10px; border: none; background: rgb(99, 102, 241); color: rgb(255, 255, 255); font-weight: 600; font-size: 13px; cursor: poin…`

**sel_hub/sel_tool_careconstellations.js** — 3 nodes

- #64748b on #0f172a = 3.75 (need 4.5:1) ×2 — first at `tab "+ Add a connection"` [light+dark] — src: `sel_hub/sel_tool_careconstellations.js:492`
  - `<span>Newer / distant</span>`
- #a855f7 on #1e1d3f = 4.07 (need 4.5:1) ×1 — first at `tab "📜 About: Care of Self"` [light+dark] — src: `sel_hub/sel_tool_careconstellations.js:637`
  - `<strong style="color: rgb(168, 85, 247);">🧭 More philosophical orientations: </strong>`

**sel_hub/sel_tool_costbenefit.js** — 3 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_costbenefit.js:409`
  - `<div style="font-size: 11px; color: rgb(148, 163, 184); font-style: italic;">(none)</div>`
- #dc2626 on #0f172a = 3.69 (need 4.5:1) ×1 — first at `tab "✏️ Edit"` [light+dark] — src: `sel_hub/sel_tool_costbenefit.js:42`
  - `<div style="font-size: 13px; color: rgb(220, 38, 38); font-weight: 800; margin-bottom: 6px;">🚩 Long-term CONS</div>`

**stem_lab/stem_tool_beehive.js** — 2 nodes

- #edf5e9 on #ffffff = 1.11 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_beehive.js:28755`
  - `<textarea id="beehive-thermo-hypothesis" placeholder="Hypothesis: At 40°C outside, how many fanning bees keep the brood area near 34–36°C?" class="w-full text-[0.75rem] border border-slate-300 rounded…`
- #4f46e5 on #10182a = 2.81 (need 4.5:1) ×1 — first at `expand 7 <details>` [dark] — src: `stem_lab/stem_tool_beehive.js:27526`
  - `<div class="text-[0.625rem] font-black uppercase tracking-[0.14em] text-indigo-600">Next revision</div>`

**sel_hub/sel_tool_goals.js** — 2 nodes

- #6366f1 on #121930 = 3.89 (need 4.5:1) ×1 — first at `tab "🌟 Vision"` [light+dark] — src: `sel_hub/sel_tool_goals.js:2460`
  - `<span style="font-size: 13px; font-weight: bold; color: rgb(99, 102, 241);">This Month</span>`
- #a855f7 on #141930 = 4.38 (need 4.5:1) ×1 — first at `tab "🌟 Vision"` [light+dark] — src: `sel_hub/sel_tool_goals.js:2461`
  - `<span style="font-size: 13px; font-weight: bold; color: rgb(168, 85, 247);">This Year</span>`

**sel_hub/sel_tool_compassion.js** — 2 nodes

- #e2e8f0 on #ffffff = 1.23 (need 4.5:1) ×1 — first at `tab "🗣️Inner Friend"` [light] — src: not found (tag textarea)
  - `<textarea aria-label="Write what your inne..." placeholder="Speak to yourself th..." style="width: 100%; border:...">`
- #7c3aed on #2e1b4d = 2.67 (need 4.5:1) ×1 — first at `tab "✉️Kind Letter"` [light+dark] — src: `sel_hub/sel_tool_compassion.js:412`
  - `<div style="font-size: 13px; color: rgb(124, 58, 237); font-style: italic; margin-bottom: 8px;">Dear Me,</div>`

**sel_hub/sel_tool_bodystory.js** — 2 nodes

- #ffffff on #ef4444 = 3.76 (need 4.5:1) ×1 — first at `tab "📺 Media diet"` [light+dark] — src: `sel_hub/sel_tool_bodystory.js:361`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(239, 68, 68); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Add…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_bodystory.js:124`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_genogram.js** — 2 nodes

- #64748b on #0f172a = 3.75 (need 4.5:1) ×1 — first at `tab "👥 People"` [light+dark] — src: `sel_hub/sel_tool_genogram.js:436`
  - `<div style="font-size: 11px; color: rgb(100, 116, 139); font-style: italic; padding-left: 14px;">(no one added yet)</div>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_genogram.js:58`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_sensoryregulation.js** — 2 nodes

- #ffffff on #6366f1 = 4.46 (need 4.5:1) ×1 — first at `tab "📝 Accommodations"` [light+dark] — src: `sel_hub/sel_tool_sensoryregulation.js:283`
  - `<button aria-label="Add" style="padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; background: rgb(99, 102, 241); color: rgb(255, 255, 255); font-weight: 700; font-size: 12px;">+ Ad…`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_sensoryregulation.js:135`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_thoughtrecord.js** — 2 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_thoughtrecord.js:466`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No records yet.</div>`

**sel_hub/sel_tool_valuescommittedaction.js** — 2 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_valuescommittedaction.js:559`
  - `<div style="font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No top values picked yet.</div>`

**sel_hub/sel_tool_viastrengths.js** — 2 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×2 — first at `tab "ðŸ–¨ Print view"` [light+dark] — src: `sel_hub/sel_tool_viastrengths.js:484`
  - `<div style="padding: 14px; font-size: 12px; color: rgb(148, 163, 184); font-style: italic;">No signature strengths selected yet.</div>`

**sel_hub/sel_tool_wheeloflife.js** — 2 nodes

- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×1 — first at `tab "✏️ Rate"` [light+dark] — src: `sel_hub/sel_tool_wheeloflife.js:41`
  - `<div style="font-size: 14px; font-weight: 800; color: rgb(99, 102, 241);">Work and school</div>`
- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print view"` [light+dark] — src: `sel_hub/sel_tool_wheeloflife.js:75`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**stem_lab/stem_tool_titration.js** — 1 nodes

- #0e7490 on #0f172a = 3.33 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_titration.js:649`
  - `<button type="button" aria-label="Back" class="text-xs font-bold transition-colors titr-back" style="color: rgb(14, 116, 144);">← Back</button>`

**stem_lab/stem_tool_openbim.js** — 1 nodes

- #5eead4 on #ffffff = 1.47 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_openbim.js:770`
  - `<p style="margin: 0px 0px 4px; color: rgb(94, 234, 212); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;">Open architecture pathway</p>`

**stem_lab/stem_tool_physics.js** — 1 nodes

- #475569 on #0f172a = 2.35 (need 4.5:1) ×1 — first at `baseline` [dark] — src: `stem_lab/stem_tool_physics.js:2754`
  - `<p id="physics-gravity-presets-help" class="mb-2 text-xs text-slate-600">Changes gravity only. Launch angle, velocity, mass, and air drag stay as you set them.</p>`

**stem_lab/stem_tool_magnetism.js** — 1 nodes

- #bef264 on #f8fafc = 1.24 (need 4.5:1) ×1 — first at `tab "🔩MaterialsMatter chapter0/3"` [light+dark] — src: `stem_lab/stem_tool_magnetism.js:532`
  - `<span class="mag-domain-material-badge">Compare</span>`

**stem_lab/stem_tool_throwlab.js** — 1 nodes

- #059669 on #ecfdf5 = 3.57 (need 4.5:1) ×1 — first at `expand 6 <details>` [light+dark] — src: `stem_lab/stem_tool_throwlab.js:6687`
  - `<div class="text-sm font-black" style="color: rgb(5, 150, 105);">🎯 Optimal trajectory</div>`

**stem_lab/stem_tool_singing.js** — 1 nodes

- #475569 on #1e293b = 1.93 (need 4.5:1) ×1 — first at `tab "🌊 Vibrato Lab"` [dark] — src: `stem_lab/stem_tool_singing.js:3339`
  - `<div class="text-lg font-bold tracking-tight" style="color: var(--allo-stem-text-soft, #94a3b8);">No Signal</div>`

**stem_lab/stem_tool_particlelab3d.js** — 1 nodes

- #64748b on #060b1d = 4.11 (need 4.5:1) ×1 — first at `open 2 toggles` [light+dark] — src: `stem_lab/stem_tool_particlelab3d.js:1801`
  - `<div class="mt-1 font-mono text-[10px] text-slate-500">SPACE run • R reset • T trace • V vectors • E energy • M membrane • G gravity • C showcase • L follow • F fullscreen • H hide UI • ? keys</div>`

**sel_hub/sel_tool_somaticreset.js** — 1 nodes

- #64748b on #ccfbf1 = 4.22 (need 4.5:1) ×1 — first at `baseline` [light] — src: `sel_hub/sel_tool_somaticreset.js:39`
  - `<span style="display: block; margin-top: 3px; color: rgb(100, 116, 139); font-size: 11px; line-height: 1.35;">a general reset or no specific area</span>`

**sel_hub/sel_tool_dearman.js** — 1 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_dearman.js:134`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">`

**sel_hub/sel_tool_healthyrelationships.js** — 1 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_healthyrelationships.js:765`
  - `<div style="font-size: 10.5px; color: rgb(148, 163, 184);">not rated</div>`

**sel_hub/sel_tool_landplace.js** — 1 nodes

- #ffffff on #0ea5e9 = 2.77 (need 4.5:1) ×1 — first at `tab "📓 Reflection journal"` [light+dark] — src: `sel_hub/sel_tool_landplace.js:503`
  - `<button aria-label="Save journal entry" style="padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; background: rgb(14, 165, 233); color: rgb(255, 255, 255); font-weight: 700; font-si…`

**sel_hub/sel_tool_motivationalinterviewing.js** — 1 nodes

- #94a3b8 on #ffffff = 2.56 (need 4.5:1) ×1 — first at `tab "🖨 Print"` [light+dark] — src: `sel_hub/sel_tool_motivationalinterviewing.js:601`
  - `<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgb(203, 213, 225); font-size: 9px; color: rgb(148, 163, 184); text-align: center; line-height: 1.5;">Motivational Interviewing f…`

**sel_hub/sel_tool_substancepsychoed.js** — 1 nodes

- #dc2626 on #0f172a = 3.69 (need 4.5:1) ×1 — first at `tab "📚 By substance"` [light+dark] — src: `sel_hub/sel_tool_substancepsychoed.js:67`
  - `<span style="font-size: 16px; font-weight: 800; color: rgb(220, 38, 38);">Opioids (pills, fentanyl)</span>`

**sel_hub/sel_tool_traumapsychoed.js** — 1 nodes

- #6366f1 on #0f172a = 3.99 (need 4.5:1) ×1 — first at `tab "🛡️ SAMHSA 6"` [light+dark] — src: `sel_hub/sel_tool_traumapsychoed.js:76`
  - `<span style="font-size: 14px; font-weight: 800; color: rgb(99, 102, 241);">Cultural, Historical &amp; Gender Issues</span>`

## Harness errors / render problems (separate from violations)

- **stem_lab/stem_tool_statslab.js** (audited; warnings):
  - [statsLab:click tab 2] console: [StemLab] Error rendering statsLab TypeError: t is not a function
    at _renderData (<anonymous>:2610:300)
    at Object.render (<anonymous>:1996:30)
    at Object.renderTool (<anonymous>:2768:33)
  
  - light: statsLab crashed after tab "📋 Data"
- **sel_hub/sel_tool_zones.js** (audited; warnings):
  - [zones:click toggles] console: Error: Minified React error #300; visit https://reactjs.org/docs/error-decoder.html?invariant=300 for the full message or use the non-minified dev environment for full errors and additional helpful wa
  - light: zones crashed after toggle "View badges (0 of 16)"
- **sel_hub/sel_tool_coping.js** (audited; warnings):
  - [coping:click toggles] console: Error: Minified React error #300; visit https://reactjs.org/docs/error-decoder.html?invariant=300 for the full message or use the non-minified dev environment for full errors and additional helpful wa
  - light: coping crashed after toggle "0/19 badges earned"
- **sel_hub/sel_tool_sleep.js** (audited; warnings):
  - [sleep:click tab 3] console: [SelHub] Error rendering sleep TypeError: Cannot read properties of undefined (reading 'length')
    at renderDiary (<anonymous>:479:29)
    at Object.render (<anonymous>:731:41)
    at Object.renderT
  - light: sleep crashed after tab "📓 Sleep diary"

## Clean tools

`stem_tool_artstudio.js`, `stem_tool_wheelandfire.js`, `stem_tool_applab.js`, `stem_tool_forge.js`, `stem_tool_ratios.js`, `stem_tool_areaperimeter.js`, `stem_tool_timeschedule.js`, `stem_tool_citylab.js`, `stem_tool_arccity.js`, `stem_tool_funcgrapher.js`, `stem_tool_geosandbox.js`, `stem_tool_printlab.js`, `stem_tool_watercycle.js`, `stem_tool_platetectonics.js`, `stem_tool_dissection.js`, `stem_tool_cyberdefense.js`, `stem_tool_logiclab.js`, `stem_tool_punnett.js`, `stem_tool_semiconductor.js`, `stem_tool_gamestudio.js`, `stem_tool_molecule.js`, `stem_tool_universe.js`, `stem_tool_treelab.js`, `stem_tool_machinelab.js`, `stem_tool_stewardship.js`, `stem_tool_spacecolony.js`, `stem_tool_spacestation.js`, `stem_tool_coasterlab.js`, `stem_tool_worldbuilder.js`, `stem_tool_flightsim.js`, `stem_tool_atctower.js`, `stem_tool_echotrainer.js`, `stem_tool_butterfly.js`, `stem_tool_geometryworld.js`, `stem_tool_freeforms.js`, `stem_tool_roadready.js`, `stem_tool_firstresponse.js`, `stem_tool_bikelab.js`, `stem_tool_evolab.js`, `stem_tool_weldlab.js`, `stem_tool_nutritionlab.js`, `stem_tool_bakingscience.js`, `stem_tool_allobotsage.js`, `stem_tool_skatelab.js`, `stem_tool_statslab.js`, `stem_tool_typingpractice.js`, `stem_tool_assessmentliteracy.js`, `stem_tool_cephalopodlab.js`, `stem_tool_astronomy.js`, `stem_tool_bridgelab.js`, `stem_tool_microbiology.js`, `stem_tool_raptorhunt.js`, `stem_tool_schoolbehaviortoolkit.js`, `stem_tool_parentinglab.js`, `stem_tool_lawnavigator.js`, `stem_tool_eligibility.js`, `stem_tool_papertrail.js`, `stem_tool_lumen.js`, `stem_tool_cellular.js`, `stem_tool_accesslens.js`, `stem_tool_datalab.js`, `stem_tool_simshelf.js`, `stem_tool_circuitshelf.js`, `stem_tool_moleculeshelf.js`, `stem_tool_zoomgallery.js`, `stem_tool_scaleexplorer.js`, `sel_tool_crisiscompanion.js`, `sel_tool_friendship.js`, `sel_tool_voicedetective.js`, `sel_tool_sociallab.js`, `sel_tool_peersupport.js`, `sel_tool_anxietytoolkit.js`, `sel_tool_disabilityvoices.js`, `sel_tool_identitysupport.js`, `sel_tool_quietquestions.js`, `sel_tool_tipp.js`
