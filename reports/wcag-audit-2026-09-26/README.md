# AlloFlow WCAG enhancement pass — September 26, 2026

This pass looked for defects the earlier September audits could not see. It swept
every product HTML page with axe, walked the loaded app in three themes and at 320px, and ran
a runtime Label-in-Name check. It also used source-wide AST scans for defect classes that
axe does not report reliably. Every confirmed defect below is fixed in source. Regenerated
modules and public mirrors match their sources. The [VPAT](../../VPAT-2.5-WCAG-AlloFlow.md) is updated. It
stays an interim self-assessment: ratings remain qualified and no full WCAG 2.2 AA
conformance is claimed.

## Summary of repairs

| ID / criteria | Defect found | Repair |
|---|---|---|
| SEP26-01 / 2.5.3, 4.1.2 | 104 buttons, links and summaries rendered their own visible text but carried a generic `aria-label={t('common.*')}` that replaced it. The runtime check found 27 in the loaded teacher sidebar alone. For example, "Generate Glossary" was named "Generate", "Analyze Source Material" was named "Search", and "Interview Mode" was named "History". Some names were wrong, not merely generic: a "Dismiss Error" button was named "Generate", a dashboard "Back" button was named "Check Answer", "Confirm & Exit" was named "Close", and "Play Again" was named "Start game". | Removed the overriding label so the visible text is the accessible name (104, via [fix-generic-aria-labels.cjs](fix-generic-aria-labels.cjs)). Three responsive cases hide their visible text at small widths, so they got a correct label instead: dashboard Back, Teach Live / Live session code, and the student Join Class panel. The persona button showed "Select Interviewee" but was named "Ask question"; its name now uses the visible label. |
| SEP26-02 / 4.1.2, 1.3.1 | 99 `div`/`span`/`p` elements carried `aria-label` or `aria-labelledby` without a role. ARIA 1.2 prohibits naming generic elements, and assistive technology may ignore the name. Examples: ✓/✗ answer marks, status dots, quiz badges, toolbar groups, and the Launch Pad settings bar (axe `aria-prohibited-attr`). | Added the role the content implies: 83 `group`, 13 `img` (symbols, dots, blank response areas), 3 `log` (live activity logs) ([fix-prohibited-labels.cjs](fix-prohibited-labels.cjs)). One more used `React.createElement` directly and was fixed the same way. |
| SEP26-03 / 2.1.1 | Saved STEM and SEL station cards in History opened only on mouse click. The only keyboard-reachable control on the card was Delete. | The station name and summary are now a real button. Pointer behavior is unchanged. |
| SEP26-04 / 1.4.3 | Dark theme remaps text to light colors but left translucent-white ("glass") surfaces light. The Teacher Grading Dashboard title measured 1.41:1. | `app_styles` now darkens `bg-white/50`–`/95` surfaces in dark theme, as it already did for `bg-white`. |
| SEP26-05 / 1.4.3 | Educator Evaluation onboarding badge: a more specific `span` rule overrode the badge colors. Results: 1.15:1 (light), gray-blue on blue (dark), and white on amber (high contrast). | The option-text rule now excludes badges in all three themes. |
| SEP26-06 / 1.4.3 | Standalone pages: Access Lens primary button (4.09:1); privacy notes on Circuit, Molecule and Sim shelves (3.46:1); Timeline Studio credit (3.75:1); Walkthrough Copilot district tier (opacity, 4.36:1); app loader timer (3.75:1); website library and calculator text (2.34–2.56:1); Life Skills Capstone step labels (1.26:1, unstyled native button background). | Colors raised to ≥4.5:1 (measured with [contrast helper values](pages-after.json)); opacity replaced by a dashed border; step buttons given a transparent background. |
| SEP26-07 / 1.3.1 | Five Life Skills labs (kitchen, laundry, repair, safety, transit) put buttons directly inside `role="list"`. | Each button is wrapped in a `role="listitem"`. |
| SEP26-08 / 1.4.1 | Five teacher manuals had in-text links in table cells and definition lists, with no underline and 1.47:1 against body text. | `tool-manual.css` underlines `.manual-block` links. |
| SEP26-09 / 1.4.10 | At 320px, content spilled horizontally: long code paths in the teacher guide (460px), website footers (341–345px), the whiteboard template picker (355px) and the admin submissions layout (376px). | Code wraps; footers wrap; the template control shrinks; the admin layout stacks below 720px. The guide was regenerated with its builder (see limits). |
| SEP26-10 / 2.1.1, 4.1.2, 2.5.8, 1.3.1 | Admin submission list rows were click-only `div`s. IT Coach disclosure summaries were 22.5px tall. The veraPDF validator file input had no label. | Rows are buttons with `aria-current`, and the detail pane is a named, focusable scroll region. Summaries have padding (≥24px). The file input has a visible label. |
| SEP26-11 / 2.4.1 | The app's first skip link had no text while UI strings were loading or unavailable (axe `link-name` on the compiled shell served without the string CDN). | Added an English fallback, as the second skip link already had. The offline `AppStyles` fallback's focus-visible rule now also covers `summary` and `[tabindex]` widgets, matching the real module. |
| SEP26-12 / 1.4.3 | Tool views opened from Learning/Educator Tools: Reading Library language count (4.25–4.46:1); Page Designer muted/soft text in light theme (2.45–2.56:1, 27 uses); PoetTree teal (#0d9488) as white-text background and as text (3.74:1, 12 uses including exports); StoryForge style descriptions under `opacity-75` (3.75–4.0:1); Video Studio empty gallery (2.56:1); Symbol Studio mode toggle (4.39:1); Unit Path counter (2.56:1); Quick Start card subtitles (4.25:1); Analysis "Fix Grammar Errors" button (amber-600 on white, 3.19:1). | Darker tokens: slate-600 / #475569 / #526073, teal-700 (#0f766e), #4b5563, amber-800; opacity removed. "1 languages" also now reads "1 language". |
| SEP26-13 / 1.3.1, 4.1.2 | Document Hub ribbon: the Collapse toggle sat inside `role="tablist"`. Nine navigation buttons pointed `aria-controls` at a pane that is not rendered while closed. Open Groove Studio: note and rest button sets were `role="list"` without list items, and the editable staff `svg role="img"` hid its focusable notes. Unit Path's scrolling canvas could not be reached by keyboard. | The tablist wraps only the tabs. `aria-controls` is set only while the pane exists. The note/rest sets and the staff are `role="group"`. The canvas is a named, focusable region. |

## STEM Lab and SEL Hub tools

Every tool the app loads was rendered through the real `StemLab`/`SelHub.renderTool` host (`stemToolModules` and `selToolModules` in ANTI): 148 STEM and 72 SEL. The host's state updates were live, so clicking a control really changes the view. The walk opened every `<details>`, toggle and tab, and ran axe after each state, in light and dark themes. The harness is in [stem-sel/](stem-sel/) ([probe](stem-sel/probe.cjs), [runner](stem-sel/runner.cjs)). The repository's own depth probes were not used: their state updates are no-ops, they seed tool state incorrectly, they cover STEM only, and they use a theme class the app never sets (see Limits).

| Measure (all 220 tools) | Before | After |
|---|---|---|
| Non-contrast WCAG A/AA nodes (aria-required-parent/children, scrollable-region-focusable, nested-interactive, aria-progressbar-name, link-in-text-block) | 29 in 7 tools | 0 |
| Tools that crashed on a walked state | 4 | 0 |
| Light-theme color-contrast nodes | 1,084 | 2 (the student-chosen colors in the Digital Accessibility Lab contrast preview, intentional) |
| Dark-theme color-contrast nodes | 982 in 73 tools | 119 in 10 STEM tools |
| Tools clean of all WCAG A/AA findings | 131 | 199 |

Evidence: [before](stem-sel/before.md), [after (light)](stem-sel/after.md), [dark before](stem-sel/dark-before.md) and [dark after](stem-sel/dark-after.md). Also see the [changed files](stem-sel/changed_list.json). The light "after" summary predates the removal of an experimental host rule; the dark numbers above were re-measured after its removal.

Repairs:

- **Crashes.** SEL Zones and Coping badge views returned early before a hook (React #300). The Sleep diary crashed for every learner with an empty diary because a brace was misplaced. The Statistics Lab Data tab called a `t()` that a local variable had shadowed.
- **Semantics.**
  - Play Lab's stats table has rows.
  - DNA reference lists are focusable, named regions.
  - Rocks and Orientations diagrams use `role="group"`, so their focusable points are exposed.
  - PERMA and Restorative Circle progress bars are named; the Restorative Circle one also exposes its value.
  - The Swim Lab link is underlined.
- **Contrast.**
  - 27 SEL print-view footers were 2.56:1.
  - Fills behind white text moved to the 700 shade in 23 SEL tools (for example sky-500, 2.77:1).
  - Accent text on dark shells moved to the 300/400 shades.
  - Locked or unearned items were dimmed with `opacity: 0.4` in 14 SEL tools and Geology Explorer. They now keep full-opacity text and show the locked state with a dashed border and greyscale icon.
  - Light-surface accents in 14 STEM tools were darkened.
  - The shared SEL safety card was fixed.
  - Ecosystem's light palette now applies under `.theme-light`, the class the app actually sets.
- **Tests.** Five golden snapshot digests that encoded the old markup were updated.

An experimental host rule reset the STEM palette inside the white dark-theme card. It was reverted after it produced 1,236 dark-mode failures in tools that paint their own dark surfaces.

## Verification

- **Standalone pages:** 285 product HTML pages × 2 widths (1280 and 320) = 570 states, via [run-pages.cjs](run-pages.cjs) with all non-local origins blocked. [Before](pages-before.json): 93 states with findings on 50 pages (147 axe violation nodes, 8 overflowing states). [After](pages-after.json): 13 states on 7 pages. They are the documented false positives, the compiled `app/` shell awaiting its release rebuild, and an internal benchmark report under `runs/`.
- **Loaded app:** development preview of the current App.jsx and local modules, via [lib-preview.cjs](lib-preview.cjs). [Light](app-walk.json), [dark](app-walk-dark.json), [high-contrast](app-walk-contrast.json) and [320px](app-walk-320.json) walks. Each opens every header launcher by keyboard and audits the result. Every dialog opened (Learning Tools, Educator Tools, Teach Live, Start & setup) is labelled and modal. Each moves focus inside, closes on Escape and returns focus to its launcher.
- **Label in Name:** [before](label-in-name-before.json): 27 mismatches in the loaded, fully expanded sidebar and launcher dialogs. [After](label-in-name-after.json): 1. That one is Plan Full Pack; its name is its visible label, and the checker flags it only because the card's visible description is not part of the name.
- **Tool views:** every entry in Learning Tools (22) and Educator Tools (29) was opened in a fresh session and audited. Across the passes, 10 views had violations. A first pass, before the harness restarted between entries, found Reading Library, Document Hub and Page Designer; those were fixed before the second pass and pass in it. The second pass found seven more: [learning](app-tools-learning-before.json) and [educator](app-tools-educator-before.json). All 10 pass on retest ([learning](app-tools-learning-retest.json), [educator](app-tools-educator-retest.json), plus the second pass for Reading Library). The runner is [run-app-tools.cjs](run-app-tools.cjs).
- **Regression gate:** [`dev-tools/check_label_semantics.cjs`](../../dev-tools/check_label_semantics.cjs) with `tests/label_semantics_gate.test.js` fails on either defect class. It has a `--selftest`. It was mutation-verified: re-adding one generic label and removing one role turned it red, and it was green again after a restore confirmed byte-for-byte.
- **Module integrity:** [check-module-drift.cjs](check-module-drift.cjs) checks each rebuilt module after normalizing away this pass's edits. Four committed modules were not reproducible from their sources: `view_info_modal`, `view_export_preview`, `module_scope_extras`, and `test_prep_hub`, whose builder runs a review gate that fails in this environment. Rebuilding them would have silently changed unrelated code. They were patched from their committed build with [fix-prohibited-labels-compiled.cjs](fix-prohibited-labels-compiled.cjs) and a one-line label removal. Every changed root module equals its `desktop/web-app/public` mirror.

## Remaining findings and limits

- **False positives, not product defects:** the Apps Script `Portal.html` files are server-side include fragments; the page title and `lang` come from `Index.html` and `setTitle`. The `deployment/github-pages-root` result is Chromium's own error page, shown after the blocked redirect.
- The compiled `app/` shell still carries the old skip-link markup until the next release build. The fix is in ANTI and App.jsx.
- Rebuilding the teacher guide for its CSS also published chapter text that was already committed in `docs/teacher-guide` but not yet generated (Adventure Mode chapter and the manual). Rebuilding `story_forge` and `note_taking_templates` likewise picked up two committed source-side contrast improvements.
- Dark theme still has 119 contrast nodes in 10 STEM tools. The largest are Ecosystem (51), Anatomy (31) and Play Lab (17). Causes include light-mode Tailwind classes on the tool's own dark panels, and the dark STEM palette variable on Anatomy's white panels. Fixing these needs per-tool dark-surface work. Other places where the same patterns probably occur, in states the walk did not reach, are listed in the stem-sel summaries.
- Three SEL tools (Civic Action, Ethical Reasoning, Restorative Circle) inject a page-wide `.text-slate-400` override. It was worked around, not removed. The SEL Hub crash-fallback button, in `sel_hub_module.js`, still uses white on sky-500.
- The repository's depth probes (`dev-tools/axe_a11y_depth.cjs`, `axe_tool_depth.cjs`) have defects:
  - They pass no-op state updates.
  - They seed `toolData[id] = {}`.
  - They cover STEM only.
  - The snippet regex is `/s+/`.
  - The Tailwind sweep build omits `sel_hub`.
  - The header claim that "contrast is closed tree-wide" no longer holds.
  They were left unchanged. The harness here fixes each problem.
- Not covered: screen readers (NVDA, VoiceOver), browser-native 200%/400% zoom, other browsers, authenticated and live workflows, AI-generated output and exports. Axe incomplete (needs-review) results are not counted as passes.
