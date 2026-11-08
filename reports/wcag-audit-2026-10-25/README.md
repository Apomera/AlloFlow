# AlloFlow WCAG remediation pass — October 25, 2026

This pass targeted the open items in the October 2 [VPAT](../../VPAT-2.5-WCAG-AlloFlow.md):
- the known dark-theme contrast exception in STEM tools (1.4.3);
- three criteria the VPAT listed as untested or needing an inventory (2.1.4, 2.5.7, 2.2.1);
- language and title metadata for the documents the app writes into print windows, previews and Drive (3.1.1, 3.1.2, 2.4.2);
- a fresh page sweep of the current tree.

The first-round repairs were committed in `a1384d4` (the 14:12 merge) and went into the deploy that started at 14:25; this report has not confirmed them on the live site. The round-2 repairs are in the local working tree, with public mirrors synced, and are uncommitted. All results are local. No assistive technology was used. Ratings stay **Pending determination**, and no WCAG 2.2 AA conformance is claimed.

## Round 4 (October 28): text on gradients and decorative layers

axe-core does not grade text that sits on a CSS gradient or under a `::before`/`::after` layer; it reports it as "needs review". Across the 149 STEM tools in light theme that was about 18,000 nodes, so the earlier "0" results covered only what axe could measure. Everything in this round is uncommitted.

**Method.** `harness/gradient/stem-gradient-sweep.cjs` extends the round-3 STEM sweep (real StemLab modal, AppStyles, Tailwind served as `text/css`). For each needs-review node it composites every background layer from the first opaque ancestor up, in CSS paint order: background colour, then each gradient layer bottom to top, then any pseudo-element that overlaps the text. It then grades the text against the worst resulting backdrop. Details:
- Gradient-clipped text (`background-clip: text`, `-webkit-text-fill-color`) is graded by its gradient stops.
- Dot-sized radial layers (starfields), SVG text, images and overlapping elements are left ungraded and counted, not passed.
- A planted self-test (`MUTATE=1`) checks it: three failures (white text fading onto a pale gradient, pale gradient text, a pale pseudo overlay) must be caught, and three controls (including a transparent glow over a navy gradient) must pass.

**Grader corrections during the round.** The first full run over-counted. It treated every stop of a multi-layer background as a possible backdrop, so a glow's transparent edge let white show through (Cephalopod Lab 1,394 → 7 once layers were composited in order). Starfield dots and gradient-filled headings were also over-counted until the rules above were added. Every reported number below comes from the corrected grader.

| Theme | Before (corrected grader) | After |
|---|---|---|
| Light | 1,623 nodes in 78 tools | 7: A11y Auditor's specimen, Solar System's decorative watermark, 5 in Bird Lab (not edited; another session is working in that file) |
| Dark, OS dark | 1,046 nodes in 64 tools | 2: the specimen and the watermark |
| Dark, OS light | not measured before | 2: the same two |
| High contrast | 334 nodes in 62 tools | 0 (Geography's 2 map-popup nodes were fixed after the final run and re-measured at 0) |

The watermark is an `aria-hidden` decorative copy of the planet name at 10% opacity: incidental text under WCAG 1.4.3. Field Journeys (no standard tool shell) and two helper files are not measured, as in earlier rounds. Results: `stem-gradient-sweep-before.json` and `stem-gradient-sweep-after.json`.

**Causes and fixes (92 tool files, all four copies synced).**
- **Light theme:** text used the host's theme variables or `-400` inks inside panels a tool paints dark in every theme, which gave dark text on dark. Those panels now set fixed light inks, or set the variables on themselves (Fisher Lab 403 → 0).
- **Dark theme:** slate-400 and similar inks on dark gradients measured 3–4.4:1. They are now one step lighter.
- **High contrast:** the host forces text to `#ffff00`, while pale gradient panels stayed pale. Per-tool rules now turn those panels black.
- **Overlays:** glow and grid layers under text were dimmed (Cyber Defense 214 → 0).
- **Hero bands:** about 25 tools used a mode accent for 15 px headings on a tint of the same accent. They now use a darker shade of the accent.

**Host fixes.**
- `stem_lab_module.js`: the tutorial card's Skip and Back buttons were `#a5b4fc` on indigo (about 3.2:1 light, 4.2:1 dark with the sheen). They are now `#fff` in light theme and `#e0e7ff` in dark.
- `app_styles`: the October 25 high-contrast rule that strips inline gradients from buttons now also covers Tailwind `bg-gradient-*` classes.
- Bug found by the sweep: tools that call `addToast({title, message, type})` (Anatomy, and Assessment Literacy in 20 places) crashed the host's screen-reader announcement (`msg.replace is not a function`), so the toast and its live-region message were lost. The host wrapper now flattens object messages to text.

**Tests.**
- 59 render-golden digests changed. Each was updated from vitest's own output, and only for tools this round edited. Every other entry was kept byte for byte, and spot checks match the lane-reported digests. All 17 snapshot-backed test files pass.
- `stem_high_contrast_scope` gains a group for the 15 hand-written blocks: every selector must stay inside `.theme-contrast [data-stem-tool-shell="<id>"]`. It was mutation-checked (an unscoped rule fails).
- Cephalopod Lab's whole-source fingerprint tests rebuild older versions through a chain of inverse edits. The four ink changes are recorded as a new link (`tests/fixtures/cephalopod-2026-10-28-contrast.json`, undone first in `cephalopod_post_merge_reference.cjs`). All 132 Cephalopod test files pass, and a broken fixture makes the fingerprint test fail.
- The campaign pilot's generated Water Cycle bridge was regenerated with its own `build.cjs`. Its historical baseline is unchanged.

## Round 3 (October 25–26, overnight)

This round closes the items round 2 left open. Everything in it is uncommitted.

### Contrast (1.4.3)

| Area | Theme | Before | After |
|---|---|---|---|
| STEM, 149 tools | app light | 92 nodes, 15 tools | 0 (A11y Auditor's deliberate specimen excepted) |
| STEM | app dark | 4 | 1 (the specimen); Solar System's 3 fixed |
| STEM | high contrast | 1,716 nodes, 49 tools | 0 in all 49. The last 7 (Geo, Bird Lab, Bridge Lab, Magnetism, and the residuals in Brain Atlas, Dino Lab and Kitchen Lab) were re-measured October 27 in all four combinations: 0 everywhere. |
| SEL, 72 tools | light / dark (OS light) / dark (OS dark) | 203 / 207 / 198 | 0 / 0 / 0 |
| SEL | high contrast | 140 | 0 |

**STEM light.** The hub's light `stem-contrast-fix` darkens `text-slate-400` and some `-400` accents everywhere, including on panels tools paint dark in every theme. The affected sites now use `-300` inks, which that rule doesn't touch and which pass on dark. Galaxy's mode tabs and Migration's Back button now set their ink explicitly, because the hub's shell rules overrode the tools' own header CSS. Throw Lab's state box became a hub-remappable panel, which also fixed its 3 high-contrast nodes. Galaxy and Throw Lab render goldens were re-pinned by hand (no `-u`); the only render change is the edited classes.

**SEL Hub.** A harness mounts the real SEL Hub modal (`C:\tmp\vpat_1025\sel\`). It grades text on gradients against every stop, because axe skips gradients and 200 of the 203 light nodes were of that kind. It also expands inner scroll panes so content below their fold is graded. Fixes are in 55 SEL tools:
- failing gradient stops stepped one shade darker;
- section-header titles and active tabs;
- Digital Wellbeing and Upstander pastel cards now follow the tools' own dark and high-contrast remaps;
- print-view headers black in high contrast.

SEL tools always render on a dark shell, so light and dark measured alike; the STEM dark-card problem doesn't occur there.

**High-contrast buttons (host, `app_styles`).** The high-contrast button rule set a black background colour, but inline gradient backgrounds still painted over it, so buttons showed green text on a gradient. A new rule, `.theme-contrast button[style*="gradient"] { background-image: none !important; }`, clears it (SEL high contrast 62 → 0). It is in the source, the module and the public copy; theme suites pass 179/179.

**STEM high contrast.** Almost every node was `#ffff00` shell ink inherited onto panels that a tool paints light through its own CSS or inline styles; the hub's remap only catches Tailwind `bg-white`/`-50` panels. Per-tool `.theme-contrast` blocks, as for Anatomy, are the fix.

Each fixed tool now injects one style block. Every rule is scoped to `.theme-contrast [data-stem-tool-shell="<toolId>"]`, so it cannot reach light or dark theme or another tool. A generator builds the block from the tool's runtime stylesheets and inline style literals:
- light panels → black background;
- dark inks → `#ffff00`;
- mid-tone chips keep black ink;
- links in flipped panels → yellow.

Elements without text (swatches, bars) and media keep their own colours; borders are untouched so colour-coded chips stay distinguishable.

Result across 45 tools: high contrast **1,686 → 5** (App Lab 781 → 0, Dissection 307 → 0, Evo Lab 184 → 0, Trajectory Computing 95 → 0, Water Cycle 77 → 0, DNA 54 → 0, and the rest), with light and both dark combinations unchanged at 0. Re-measuring after the AppStyles gradient rule landed matched the earlier baseline, so these reductions are from the per-tool blocks.

Last batch (October 27), against the October 25 high-contrast baseline: Geo 5 → 0, Bird Lab 19 → 0, Bridge Lab 2 → 0, Magnetism 1 → 0, Brain Atlas 4 → 0, Dino Lab 4 → 0, Kitchen Lab 3 → 0. All 28 runs (7 tools × high contrast, light, dark/OS light, dark/OS dark) loaded the real hub and tool shell with Tailwind applied, walked 6–19 states each, and reported no crash or page error; results are in `C:\tmp\vpat_1025\host\out_batch7\`. STEM high contrast is therefore **1,716 → 0 in 49 tools**. axe's "incomplete" (needs-review) items, mostly text over gradients and images, still need a manual check. One run hung for 26 hours in the first attempt; the re-run caps each run at 5 minutes and none timed out.

`tests/stem_high_contrast_scope.test.js` checks each block's scope and guards; it fails 45/45 on the backups. Rendering all 46 tool ids from the backups and from the live files gives identical SSR output, so no golden digest changed.

### Other open items closed

| Criteria | Repair | Test |
|---|---|---|
| 2.1.4 | Main-app `?` Help Mode shortcut: a "Single-key shortcuts" switch in the Text settings dialog (`role="switch"`, described, stored per device as `allo_single_key_shortcuts`, on by default). With it off, `?` does nothing; the toolbar Help Mode button and Escape still work. | `single_key_shortcut_setting` (7) |
| 2.2.1 | Flight Sim Geography Sprint: Timer On / Relaxed (3×) / Off before and during a sprint. With it off there is no countdown or time-up, the jet holds near each unanswered stop, and the display reads "No time limit". Answers are now accepted while paused. | `flightsim_sprint_timer_adjustable` (6/7 fail before) |
| 2.5.7 | Geometry Prover: clicking a vertex selects it; Previous/Next point buttons and ← ↑ ↓ → nudge buttons move it one grid step, with an announced "Selected: B" status. | `geo_prover_vertex_move_single_pointer` (4/4 fail before) |
| 2.5.7 | New tap-inclusive instruction keys, replacing drag-only wording at the call sites (existing keys were not reworded): Venn, concept-map node select, cloze, Word Sounds chips. | `drag_tap_wording_i18n_keys` (11) |
| 3.1.x / i18n | Play Lab, Ecosystem and visual-panel prompts added in round 2 moved onto keys. | same |

**Translations.** 41 new keys were registered in `ui_strings.js` by direct line insertion with hash checks (no re-serialisation) and hand-translated into all 63 language packs with `insert_pack_keys.cjs`. Format round-trips were verified, and all 41 are blessed in `dev-tools/i18n/lang_source_baseline.json`. Native review is advisable for Maay Maay, Acholi, Karen, Chin (Falam, Hakha), Marshallese and Hmong. Six values equal the English as true cognates (for example "Label" in Dutch). The now-unused `stem.flightsim.sprint_timed_hint` was removed from `ui_strings`.

### Round-3 notes
- **Already failing before round 3:**
  - `check_anti_comment_budget` (+2,790 bytes; this pass added one comment-free line to ANTI).
  - The `check_lang_staleness` watermark (none of the drifted keys are new).
  - The `inequality` and `bridgeLab` goldens (other sessions' edits).
  - Two Flight Sim free-flight quiz tests.
- **Load timeouts:** they passed on re-run with longer timeouts.

## Round 2 (evening)

### All-tools STEM dark sweep (1.4.3)

The first-round contrast walks called `renderTool` directly, as the September sweep did. In the real app, tools render inside the StemLab modal, whose `stem-theme-overrides` and `stem-tool-shell-contrast` styles were then missing. The round-2 harness ([harness/stem-sweep.cjs](harness/stem-sweep.cjs)):
- mounts the real modal with the real `AppStyles`, inside the app's `theme-*` root;
- serves a Tailwind sheet built from the app config over every STEM tool, and checks that a known utility resolves;
- loads each tool's manifest support modules;
- walks each of the 149 `stemToolModules` tools through baseline, details, up to 25 toggles and up to 20 tabs.

Forge could not be measured, because the harness reads a sample `registerTool` in its template text.

| Sweep | Theme | Failing nodes | Tools affected |
|---|---|---|---|
| Committed host (`2e0388b`) | app dark | 1,500 | 53 |
| Working tree after round 2 | app dark | 4 | 2 |
| Working tree after round 2 | app light | 92 | 15 |

Per-tool numbers are in [stem-all-tools-sweep.json](stem-all-tools-sweep.json).

**Root cause and repair (OCT25-08).** In dark theme the hub paints each tool on a light card (`[data-stem-tool-surface]`). The hub's dark remaps (for example `.bg-white` → `#1e293b`, `.text-slate-700` → `#f1f5f9`) and its shell inherit-ink rules still reached inside that card. Tools authored for a light surface got light text on their own light panels; Bird Lab, Wheel and Fire, DNA and Sourcebook account for most of the 1,500.

`stem_lab/stem_lab_module.js` now scopes both rule sets with `:not([data-stem-tool-surface]:not([data-stem-dark-remap]) *)`, matching what `app_styles` already did for its own dark rules. Tools that paint their own dark panels opt back in with `darkRemap: true` in `registerTool`; the host sets `data-stem-dark-remap` on their card. Anatomy, Physics, Wave and Solar System are opted in.

Candidates were swept before they were applied:
- Scoping only the overrides: 1,500 → 97, with 4 regressions.
- Also scoping the shell rules: 45.
- Adding the opt-in: tuned tools back to their base counts.

Brain Atlas's sources footer, which renders past its dark section onto the card, and Evo Lab's marker labels (black or white ink chosen by marker luminance, always at least 4.58:1) were fixed locally. The 4 nodes left are the A11y Auditor's deliberate specimen and 3 existing Solar System nodes; that file is held by other in-progress work. `tests/stem_dark_card_scope.test.js` checks the selector scope, the opt-in attribute, the opted-in tools and mirror parity. It fails 3 of 4 on the committed host; the fourth checks tool files, so it passes on both.

**Light theme (open).** 92 existing nodes in 15 tools. About 70 come from the hub's light `stem-contrast-fix` rule, which recolours `text-slate-400` (and amber, rose and cyan-400) to darker inks whatever the background. That fixes them on white but fails them on panels a tool paints dark even in light theme: DNA, Particle Lab 3D, Free Forms, Print Lab, Time Schedule, Circuit and the shelves. Galaxy and Migration have slate-800 text on dark tiles. A fix needs either a per-tool opt-out of that rule (for example a `darkSubstrate` flag on the card) or per-site ink changes. High-contrast theme still has existing failures, for example Evo Lab's 184 nodes.

### Other round-2 repairs

| ID / criteria | Repair | Test (fail-before / pass-after) |
|---|---|---|
| OCT25-09 / 2.1.4 | Shortcuts scoped to the tool's focus, with modifier combinations ignored, in LLM Literacy, Typing Practice, Space Colony, Behavior Lab, Bike Lab, Cell, Geometry World, Aquaculture, Echo Trainer, Road Ready (driving and 4 drills), Music (piano, beat pad, drum pads) and Echolocation. Calculus Shift+digit views now use physical keys, so on AZERTY typing a number no longer switches views and loses the digit. | `stem_character_key_shortcuts_focus_scope_round2` (15/15 fail before); `calculus_view_shortcut_scope` (2/2) |
| OCT25-10 / 2.1.4, 2.1.1 | Main app, `AlloFlowANTI.txt`. Fluency mode's Space toggle had been taking Space from focused buttons and text fields; it now fires only with focus in the fluency dialog and not on a control. The chunk reader leaves Space to focused controls and ignores modifier combinations. | `fluency_space_shortcut_scope` (via `ANTI_CANDIDATE`) |
| OCT25-11 / 2.2.1 | Escape Room (Puzzle Challenge) settings have a Time limit On/Off control, using existing translated strings. With the limit off, the clock is hidden; the engine already skipped the countdown. Guided Mode's Undo and "Go back" notices no longer vanish after 10 s and 12 s; they stay until dismissed or replaced. | `escape_room_time_limit`, `guided_notices_untimed` |
| OCT25-12 / 2.5.7 | Tap or click alternatives to dragging: cloze word bank (pick a word, tap a blank), Venn tokens (tap a zone), Word Sounds Elkonin boxes, Symbol Studio (move buttons for cells and pages), seating chart (arrow buttons and click-to-place), visual-panel labels (move button and click-to-place), Play Lab players, Ecosystem move tool. Drag still works in each. | `drag_alt_257_*`, `symbol_studio_dragging_alternatives_2_5_7`, `seating_chart_dragging_alternatives_2_5_7`, `visual_panel_dragging_alternatives_2_5_7`, `stem_dragging_alternatives_2_5_7_b` |
| OCT25-13 / 3.1.1, 3.1.2 | `lang` added to the remaining 7 generated-document shells: host handlers, teacher codename roster and progress report, Gemini Bridge, Bird Lab, Free Forms, Weld Lab. Printed Gemini Bridge messages tag the translated block with its BCP 47 code and RTL direction. The last 3 scanner hits are AI prompt text. | `generated_document_language` (30 tests) |

### Round-2 test notes

- **Fixed or updated:**
  - The old shortcut-pinning tests now press keys inside the tool.
  - The visual-panel button-count ratchet went from 49 to 53; every new button still has `type="button"`.
  - One Play Lab long-tail golden digest was re-pinned by hand. Its only change is the canvas label, which now mentions tapping.
- **Already failing before round 2:**
  - 6 STEM render goldens: aquarium, decomposer, ecosystem, llmLiteracy, migration, spaceColony.
  - 21 Weld Lab region-hash files: they also fail on the pre-edit file.
  - `host_handlers_wave3_extraction`: another session's handler.
  - `teacher_guide_build` drift.
  - Escape Room `review_runtime`: the committed ANTI lacks its dependency string.
- **`live_organizer_snapback`:** asserts that ANTI, `desktop/web-app/src/AlloFlowANTI.txt` and `App.jsx` are identical. It stays red until the next `build.js --mode=prod` regenerates the copies, as the deploy's Step 3 does. That build will also include another session's in-progress ANTI edit (`_alloTrustedPageBase`).
- **Not yet translated:**
  - New Play Lab, Ecosystem and visual-panel prompts are English-only.
  - Instruction strings that mention only dragging (`concept_map.overlay.venn_instructions`, `simplified.cloze_instructions`, `word_sounds.chip_drag_or_listen`) need rewording and re-translation.
- **Comment budget:** `check_anti_comment_budget` is over by 2,710 bytes, none of it from this pass.

## Summary of repairs (round 1)

| ID / criteria | Defect | Repair |
|---|---|---|
| OCT25-01 / 1.4.3 | Dark-theme text contrast in the September 26 exception list. Re-measured, it covered 324 unique nodes in 8 STEM tools: Ecosystem 136, Wave 129, Anatomy 25, Play Lab 17, Echolocation 8, Titration 4, Music 3, A11y Auditor 2. Geology Explorer, Beehive and Physics measured 0 before any edit; their September findings were already fixed. | Local fixes per tool (details below). After: 1 node. That node is the contrast checker's deliberate, student-adjustable "fails AA normal text" specimen, shown next to its ❌ result. |
| OCT25-02 / 1.4.3 | Ecosystem had 500 Tailwind `dark:` utilities. These follow the OS colour scheme, but the host paints the tool on a white card. Users with OS dark mode got light text on light tints in every app theme. | Removed every `dark:` utility with a scripted exact-token strip ([harness/contrast-a-strip_dark.cjs](harness/contrast-a-strip_dark.cjs)). Gave `.theme-dark` the dark-ink `--eco-*` values. Moved the LIVE/MODEL badge pulse from the text to an `aria-hidden` dot. Fixed the remaining hard-coded light inks. |
| OCT25-03 / 3.1.1 | 36 generated-document shells (`<html>` followed by `<head>` in code) had no `lang`; a 37th scanner hit is A11y Auditor lesson content. They include print windows (safety plan, worksheets, flow chart, memory palace, seating chart, live-session QR), the preview iframe, and Drive documents. A screen reader guesses the language of those pages. | Added `lang` (from the app's `document.documentElement.lang`, which follows the UI language) and `dir="rtl"` where it applies. 26 shells in 20 files; 10 shells in 7 files are still open (see Remaining). |
| OCT25-04 / 3.1.2 | Communications Studio's printed and Drive family letters put the translation (Somali, Arabic, Dari, Pashto, and others) inside an English page with no language marking. | The translation is wrapped in `lang` with a BCP 47 tag for all 19 offered languages, plus `dir="rtl"` for Arabic, Dari and Pashto. |
| OCT25-05 / 2.1.4 | Seven math tools listened for single-letter shortcuts on `window` with no modifier check: Area Model, Coordinate Grid, Fractions, Volume, Multiplication Table, Number Line, Inequality. Speech-input users could trigger them from anywhere in the app, and Ctrl+C fired "c". | The shortcuts work only while focus is inside the tool, and Ctrl/Alt/Meta combinations are ignored. This is 2.1.4 option (c). |
| OCT25-06 / 2.5.7 | Angle Explorer's second ray and the Plate Tectonics epicenter explorer could only be moved by dragging. | Angle Explorer has a range input for the second angle. Plate Tectonics selects a point on press, then a click on empty map moves it there and announces the new readings. |
| OCT25-07 / 2.2.1 | Coaster Lab "Ride & Solve" questions had a fixed countdown that could not be turned off. | A header control sets the timer on, relaxed (3× time) or off. It persists, and when off, the bar is hidden and the value text reads "No time limit". |

### Contrast repairs by tool

All counts are unique axe `color-contrast` nodes over every walked state. Each harness:
- renders through the real `StemLab.renderTool` / StemLab modal inside the app's `theme-*` root;
- mounts the real `AppStyles`;
- serves Tailwind built from the app's config as `text/css`, and asserts that a known utility resolves before trusting a run;
- uses `ctx.update` that really sets state.

States walked: baseline, every `<details>`, each `aria-expanded=false` toggle, and each tab. Measured in app dark with OS dark, app dark with OS light, light, and, for Lanes B and C, high contrast.

| Tool | Dark (app dark + OS dark), before → after | Light | Changes |
|---|---|---|---|
| Ecosystem | 136 → 0 | 8 → 0 | OCT25-02 |
| Wave | 129 → 0 | 10 → 0 | Heading on the white surface; 35 `-900` accent inks → `-700`; slate-400 → slate-300 on always-dark panels so the host's light rule no longer darkens them |
| Anatomy | 25 → 0 | 0 → 0 (high contrast 228 → 0) | Mode-card hint no longer uses the host's dark `--allo-stem-text-soft` on the white surface; 33 Imaging Lab / Procedure Studio inks; 6 hidden 1:1 amber notices. A generated `.theme-contrast` block in Anatomy's own stylesheet moves its high-contrast design (white panels, black ink) to the host's black/yellow scheme, because the host forces yellow text, which gave yellow on white. |
| Play Lab | 17 → 0 | 0 → 0 | Scout matrix headers follow the panel palette |
| Echolocation | 8 → 0 | 0 → 0 | Loading text and year pills; high-contrast key chips and cards (4 → 0) |
| Titration | 4 → 0 | 155 → 0 | Back link; Safety Info; text on amber/emerald buttons. The tool's dark lab substrate was painted only in dark and high-contrast themes, so its light-on-dark design sat on white in light theme; it now applies in every theme. |
| Music | 3 → 0 | 0 → 0 | Beat-pad row labels use the 400 shade of the same hue |
| A11y Auditor | 2 → 1 (intentional specimen) | 2 → 1 | Specimen sizes now match their "Large heading" / "Sample text" labels |
| Geology Explorer, Beehive, Physics | 0 (no edit needed) | 0 | — |

For every tool, light and high-contrast results are unchanged or better after the edits. Titration, Wave and Anatomy measure 0 in all four theme combinations. Lane B's probe also scores axe "incomplete" nodes (gradients, and same-colour text at 1:1). That exposed hidden black-on-black failures, now fixed, which plain counts miss.

### Evidence and tests

- **Page sweep.** [pages-1025.json](pages-1025.json) records axe-core 4.12.1 under Chromium 148.0.7778.96 at 1280 and 320 CSS px, on the same 285 product pages as September 26 ([harness/run-pages.cjs](harness/run-pages.cjs)). Of 570 states, 0 had horizontal overflow and 0 had colour-contrast or other A/AA violations, apart from 8 states on 4 pages that are harness artifacts:
  - two Apps Script `Portal.html` include fragments, which `Index.html` (`lang="en"`, server `setTitle`) wraps at runtime;
  - the GitHub Pages redirect stub, which has `lang` and `<title>` but redirects off-origin at 0 s.

  An earlier run of this sweep served 404s for every page (a Windows path-prefix bug in the harness). The harness now checks that it can serve `about.html` before it records anything.
- **Generated-document language.** `tests/generated_document_language.test.js` (23 tests) checks behaviour for Communications Studio (page language, fallback, attribute escaping, translation `lang`/`dir` for all 19 languages). It also checks the absence of a `lang`-less shell in every fixed source, module and public copy. Mutation-checked: it fails on the pre-fix modules (6 of 9) and on pre-fix Fractions, and passes on the fixed files. The scanner is [harness/scan-html-lang.cjs](harness/scan-html-lang.cjs).
- **2.1.4, 2.5.7, 2.2.1.** Three new tests: `tests/stem_character_key_shortcuts_focus_scope.test.js`, `tests/stem_dragging_alternatives_2_5_7.test.js` and `tests/coaster_ride_timer_adjustable.test.js`. Each fails on the pre-fix copy and passes after. Two older tests pinned the global behaviour by pressing the shortcut on `document.body`; they now press it inside the tool. The full inventory, with every timer, drag and shortcut site and its verdict, is in [keys-drag-timing-inventory.md](keys-drag-timing-inventory.md).
- **Suites for the edited files.** Communications Studio 86/86; Memory Aid 75/75; touched view modules 399; tools with fixed print shells 5102 passed in a combined run.
  - Geometry World and Forge failures in that run were hook timeouts under machine load, plus one test stub that had no `documentElement`, now guarded. They pass alone (242/242).
  - Lane suites: Ecosystem/Geology 33/33 targeted; Titration/Wave 560/563 (3 i18n-coverage failures that predate this pass); Anatomy/Physics pass in isolation; Play Lab/Echolocation/Music/A11y Auditor 161/161.
- **Earlier live candidates.** F21 (Concept Sort focus to BODY) and F22 (Skip reading controls) have uncommitted local fixes, made by other sessions before this pass, in `games_source.jsx` and `view_simplified_source.jsx`. Their compiled modules contain the fixes. `tests/concept_sort_deck_layout.test.js` asserts focus after a move, check and retry, and `tests/reader_display_menu.test.js` asserts the skip-link target (25/25). No live or AT retest was done.
- **1.3.5 inventory.** The product's email/tel inputs collect other people's addresses (student roster, staff, guardians, evaluation directory), not the user's own, so 1.3.5 does not apply to them. The password fields hold API or Drive tokens, not account passwords.

## Remaining (not fixed in this pass)

**Host-level contrast** (status after round 2: item 1 is fixed as OCT25-08 with a different design, card-scoped remaps plus a `darkRemap` opt-in instead of a palette reset, which the sweep showed regresses Play Lab. Item 2 is moot: after the Ecosystem strip no STEM or SEL tool uses `dark:` utilities, and only two ANTI sites remain. Items 3 and 4 are still open.) Three lanes independently traced most of the tool-level contrast debt to two host rules that contradict each other:

1. `stem_lab_module.js` `stem-theme-overrides` darkens `.bg-white` and remaps `text-slate-700/800/900` inside the white `[data-stem-tool-surface]` card. `app_styles_module.js` deliberately excludes that card (`:not([data-stem-tool-surface] *)`) and leaves the dark `--allo-stem-*` palette active inside it.
   - **Fix:** scope the StemLab overrides with the same `:not(...)`, and reset `--allo-stem-*` to light values on the card.
   - **After that fix:** re-probe Play Lab, whose active-header amber is chosen by theme, and Ecosystem's Conservation panels.
   - This cause also produces axe-"incomplete" (gradient) failures in Ecosystem: about 10 nodes, 2.2–2.4:1.
2. `desktop/web-app/tailwind.config.js` has no `darkMode`, so every tool's `dark:` utilities follow the OS, not the app theme. Setting `darkMode: 'class'` (keyed to `.theme-dark`) needs a full re-sweep first.
3. `stem-contrast-fix` (light) recolours slate-400/500, cyan-400, amber-400 and rose-400 to dark inks whatever the background, which fails on dark panels. Wave and Titration work around it locally.
4. The host's blanket high-contrast `#ffff00` on `p, span, div` overrides palettes a tool designed for high contrast. Anatomy now conforms to it locally.

These files were being edited by other sessions during this pass and were not changed. Until the host is fixed, the other STEM and SEL tools need re-measuring in all four theme combinations with these harnesses; the September numbers did not include Titration's light-theme or Anatomy's high-contrast failures.

**3.1.1 shells not yet fixed** (files held by other sessions' uncommitted work): `doc_pipeline_source.jsx` (3), `teacher_source.jsx` (2), `host_handlers_source.jsx` (1), `view_gemini_bridge_source.jsx` (1), and one each in Bird Lab, Free Forms and Weld Lab. The A11y Auditor's `<html>` sample without `lang` is lesson content for students to diagnose and is not a defect.

**2.1.4 open.**
- `AlloFlowANTI.txt` ~32997: Space toggles fluency recording on `window`, with no guard and `preventDefault` on every Space. This is the most severe.
- `?` help (~21241).
- Space shortcuts in the chunk reader and tour.
- The Music piano's global key listener.
- Echolocation.
- STEM tools left by the edit cap: LLM Literacy, Typing Practice, Space Colony, Behavior Lab, Bike Lab, Cell, Geometry World, Aquaculture, Echo Trainer, Road Ready.

Raptor Hunt passes under option (c): its listener is on the focusable canvas.

**2.5.7 open.**
- Word Sounds Elkonin boxes.
- Cloze word bank.
- Venn tokens.
- Symbol Studio reorder.
- Seating chart.
- Visual panel labels.
- Play Lab player drag.
- Ecosystem move tool.

Essential exceptions: letter tracing and freehand drawing.

**2.2.1 open.**
- Escape Room: `timerEnabled` is hard-coded on.
- Flight Sim Geography Sprint: the file is held by another session.
- Guided-mode Undo notices that vanish after 10–12 s.
- Teacher live escape room: unclear.

Proposed fixes for each are in the inventory.
