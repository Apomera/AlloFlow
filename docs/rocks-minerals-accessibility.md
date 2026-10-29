# Rocks & Minerals accessibility review

Target: [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/). This review covers the Rocks & Minerals tool and its local learning activities. It records implementation and verification evidence; it is not a certification of the complete AlloFlow application.

## Improvements

- Search both specimen catalogues using names, textures, properties, uses, or chemical formulae. Search tolerates case, accents, and ordinary digits in place of subscripts. Combine rock-family filters with search; sort minerals by name, hardness, or density. A live result count, useful empty state, and reset action explain the outcome without moving focus while typing.
- Skip directly to the current activity. Opening a specimen or resuming an investigation moves keyboard focus to the destination. A back-to-specimens control returns to the selected tile, or the search field when filters exclude that specimen.
- Quiz shortcuts operate only while the quiz region itself has focus. Modified shortcuts and keystrokes on child controls are not intercepted. Answers have explicit chosen/correct labels and a persistent live feedback region. Next and completion actions restore focus to the new question or results heading. Switching activities preserves the round.
- Mineral test controls remain mounted and focusable while busy, expose their unavailable state, reject repeat activation, and announce their completed results through persistent live regions.
- Mystery activities restore focus after starting, revealing clues, and answering. Asynchronous responses cannot move focus into a discarded activity. Failed AI requests show an accessible error and offer locally authored field-note clues.
- Density calculations use a native form with Enter submission, associated error descriptions, invalid-state markup, explicit unread measurements, and guarded focus recovery. Recording a trial moves focus to its uniquely named notes disclosure. Measurement and calculation announcements avoid unnecessary duplication.
- Accessible names preserve visible specimen textures, mineral hardness badges, Workbench instrument descriptions, predictions, candidate status and evidence, and chart selection badges. The quiz's Next action takes its name from its visible content. When a Workbench test finishes, focus advances to the new observation choices only if the initiating control still holds focus. Weathering results and trial actions communicate updates, and clearing the log returns focus to the Log control.
- A labeled native selector exposes all six landscape rock-cycle transformations, including their explanations and examples, as an equivalent 44-pixel target for the diagram's thin arrows. This corrects a manual target-spacing finding that the automated rule missed.
- Controls without a larger existing minimum receive a 32-pixel minimum height. Existing larger targets remain larger. Focus indicators, reduced motion, forced colors, and contained keyboard scrolling remain supported.
- The specimen journal uses native disclosures, visible field labels, associated character limits, a stable bookmark toggle, and live saved-state feedback. Its saved-specimen filter has a full-size label target. Returning from the notebook focuses the selected specimen's journal heading and preserves search preferences.
- Focused quiz practice preserves original results and uses a separate validated answer trail. Starting, advancing, resuming, and completing practice move focus to the relevant heading; result feedback remains in a persistent live region. The original quiz and practice both ignore IME composition and modified shortcuts.
- Version 2 notebook previews show the incoming journal count and replacement scope. Older version 1 files explicitly preserve the current journal. Notes and questions are rendered as plain text, and the actual production codec is exercised by the tests.
- Specimen detail navigation follows the current filtered/sorted order. Named 44-pixel buttons show their destination, native disabled states mark endpoints, and navigation focuses the new specimen heading. Excluded selections retain their notes and have an explicit path to the first matching result.
- Notebook journal browsing uses associated native search/select controls, live result counts, responsive disclosure cards, decorative specimen drawings, and text labels for specimen kind and bookmark state. Reset returns focus to search. Filtering never removes records from readable or portable exports.
- Workbench property-guide badges grow with their captions, addressing the decorative-text clipping recorded in the previous review at doubled text size and increased spacing.

## Repeatable checks

From the repository root:

```powershell
node dev-tools/rocks_accessibility_qa.cjs --output=tmp/rocks-accessibility-audit
```

The runner uses installed Playwright Chromium, React, axe-core, and the actual compiled CSS in `app/static/css`. It does not load Tailwind from a CDN or inject replacement focus styling. It writes a report with source/CSS hashes, browser and axe versions, screenshots, and interaction results. `--only=flows`, `--only=matrix`, and `--quick` support targeted reruns; `--environments` adds forced-colors and reduced-motion checks to a quick run. Core rule violations (including target size), label findings that still omit visible words after symbol/punctuation normalization, workflow failures, overflow, browser errors, or source changes during a run fail the process. `--strict` additionally fails on all raw experimental label findings, including reviewed symbol/punctuation differences. The older `wcag_audit_rocks.cjs` remains available for the separate Rock Cycle tool.

The state matrix includes every Rocks & Minerals activity and representative feedback, completion, saved-work, and error states. It evaluates normal desktop presentation, 320-pixel reflow, doubled HTML text, and WCAG text-spacing overrides. Keyboard workflows cover navigation, skip links, search and sorting, opened specimens, quiz, Mystery, workbench, density, field cases, weathering, and notebook import.

The audit explicitly requests WCAG 2.0 A/AA, 2.1 A/AA, and 2.2 AA tags, and enables `label-content-name-mismatch` and `target-size`, which are disabled by default in the installed axe version. Raw findings are retained. The experimental label rule requires review where decorative symbols or supplementary descriptions are involved; punctuation, capitalization, and symbolic icons are not equivalent to missing human-language labels. See [W3C Label in Name guidance](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html). Small targets are assessed with their associated labels, spacing, and equivalent controls using [W3C Target Size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

New behavioral regressions are covered by `tests/rocks_catalogue.test.js`, `tests/rocks_keyboard_feedback.test.js`, and `tests/rocks_density_accessibility.test.js`, alongside the existing Rocks and Rock Cycle suites.

Run the focused Rocks/Rock Cycle test collection in PowerShell using file globs and a nonempty-selection guard:

```powershell
$rockTestFiles = @(rg --files tests --glob 'rocks_*.test.js' --glob 'rock_cycle_*.test.js')
if (!$rockTestFiles.Count) { throw 'No Rocks/Rock Cycle test files selected.' }
$rockTestTemp = Join-Path (Get-Location) 'tmp/rocks-test-temp'
New-Item -ItemType Directory -Force -Path $rockTestTemp | Out-Null
$env:TEMP = $rockTestTemp
$env:TMP = $rockTestTemp
node node_modules/vitest/vitest.mjs run @rockTestFiles --maxWorkers=1 --pool=threads --hookTimeout=60000
```

## Latest navigation and journal improvements — 2026-10-29

The current pass passed all 1,003 tests across 42 Rocks/Rock Cycle files, including new filtered-navigation and journal-browsing regressions. All 16 new translation keys are registered; both registries contain 3,119 Rocks keys and the tool source/deployment files match.

The test total combines four nonoverlapping batches and an isolated rerun of a canvas-persistence file that initially exceeded its five-second limit. The rerun passed without changing its assertions or timeout. Focused feature checks use default isolation; batches 2–4 reused the environment within each batch after unusually slow environment initialization. Earlier interrupted runs and the timeout are documented in the evidence rather than counted as passes.

Browser verification passed all 20 workflows and 99 layout checks across 25 distinct affected states. The layout runs cover 320-pixel reflow, desktop presentation, doubled HTML text, increased text spacing, forced colors, and reduced motion; the new states were each checked in all six variants. Additional environment checks exercise all 11 activities in forced colors/reduced motion and keyboard scrolling. There were zero core axe violations, unresolved visible-label mismatches, horizontal overflows, clipped elements, or browser errors. All seven Workbench guide captions now fit when the guide is expanded under enlargement/spacing overrides.

Two earlier environment runs hit harness-initialization timeouts while tests were running concurrently. The final sequential run passed all 22 environment snapshots with the original eight-second timeout and unchanged assertions; both earlier reports remain available.

The 477 raw experimental label-node findings across these reports remain recorded; all retain the meaningful visible wording after symbol/punctuation/case normalization. These counts include repeated elements and are not distinct defects. Source SHA256: `c4256bc813be81e3a5bcd4f736fbb2fb7701fdb817c3b8afd6826ded73e8a02a`. [Navigation and journal evidence](rocks-minerals-navigation-evidence.json) records the reports, visual review, runtime, and remaining tool-level validation boundaries.

## Earlier study improvements — 2026-10-29

The specimen journal, notebook migration, comparison handoffs, and focused practice passed 983 unique tests across 41 Rocks/Rock Cycle files, combining the full run with a targeted rerun after updating an obsolete translation-site count. The final 41-test practice/translation rerun also passed after darkening the practice answer boundaries. All 44 new translation keys are registered; both registries contain 3,103 Rocks keys and the source/deployment files match.

The complete browser run covered 38 states in 152 layout checks and all 18 workflows, with zero core axe violations, unmatched meaningful label strings, horizontal overflow, or browser errors. All seven new states were additionally checked in forced colors and reduced motion. After the answer-border refinement, the three affected practice states passed another 18 checks covering all six presentation variants; the practice workflow and boundary-contrast measurement also passed on the final source. Default answer boundaries measure 5.02:1 against their white interior and 4.84:1 against the surrounding panel. The darker boundaries improve recognition of individual choices; the earlier style was not treated as a conclusively established violation. See [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

The tool SHA256 for that pass was `fa5004efae2919a938d8c109dc94a69fcac20630981ca7ac526fec6f045b43a5`. [Study improvement evidence](rocks-minerals-study-evidence.json) records each report's source hash and the narrowly scoped final change. Full-run evidence is in `tmp/rocks-enhancement-5/final-full/report.json`; final practice checks are in `final-practice/report.json` and `final-contrast/report.json` within the same directory. The 442 experimental label-rule flags in that full run all normalize to visible-word containment and remain recorded for review. That pass still recorded decorative Workbench badge-text clipping under enlargement/spacing overrides; the current navigation/journal pass addresses it. The journal and practice panels had no recorded clipping.

## Earlier accessibility pass — 2026-10-29

The final implementation passed 924 tests across all 39 Rocks and Rock Cycle test files (`tmp/rocks-enhancement-4/verified-tests.json`). A subsequent comparison translation regression passed with all 11 comparison tests, bringing the unique checked total to 925. JavaScript syntax, source/deployment byte equality, translation-registry equality, and whitespace checks also passed. Both registries contain 3,059 Rocks keys; all 27 keys introduced in this pass are registered. The comparison cleavage row now uses the existing translated `brk_kind_*` family.

The verified tool SHA256 is `72786b32927a53cce6bc31bf8c8b92125f6174b63ba741c03c2b6ecfc7df208a`. Browser reports record the stylesheet hash separately, so results can be tied to the actual presentation used in the review.

The final browser run (`tmp/rocks-enhancement-4/final-72786-full/report.json`) completed 124 layout checks: 31 representative states across four presentation variants. All 14 functional workflows passed, including keyboard selection of all six landscape transformations. Additional checks covered keyboard scrolling of the density instruments, plot, and table, plus reduced motion and forced colors across all 11 activities. There were no core axe violations, horizontal overflow, browser errors, or source changes during the run. Chromium was 148.0.7778.96 and axe-core was 4.12.1.

The experimental Label in Name rule still produced 380 repeated node findings across the matrix and workflows. Every retained finding contains the visible meaningful words and numbers in order after permitted symbol, punctuation, and case normalization; none remains unmatched. The raw findings are preserved rather than reported as an unqualified “zero axe findings.” Manual review also identified the small SVG arrow targets fixed by the equivalent transformation selector, and seven decorative Workbench icon badges that clip at doubled text size while their complete instrument labels remain visible outside the badges. See [the durable review evidence](rocks-minerals-accessibility-evidence.json) for classifications and representative examples.

## Scope and remaining validation

| Area | Evidence and boundary |
| --- | --- |
| Names, roles, labels, relationships | Automated DOM checks and interaction tests; visible-label mismatches are also reviewed manually. |
| Keyboard and focus order | Real-browser activation, focus restoration, shortcut isolation, and contained scrolling checks. |
| Results and errors | Persistent live regions, host-announcement calls, native form behavior, and associated error descriptions are verified programmatically. |
| Contrast | Settled DOM contrast via axe; existing tests cover specific SVG labels and diagnostic graphics. Meaningful graphics still require visual review. |
| Reflow and readability | 320-pixel layouts, doubled HTML text, and text-spacing overrides. The doubled-text simulation is not a substitute for testing every browser zoom or assistive display configuration. |
| Pointer targets | Explicit axe target-size rule, target measurements, and review of legitimate spacing/equivalent-control exceptions. |
| Motion and high contrast | Reduced-motion and forced-colors behavior are retained and checked in the browser workflow. |
| Complete application and assistive technology | The harness does not exercise the surrounding application, authentication, external AI service, or loaded third-party 3D viewer. A real screen-reader and speech-control pass in the deployed host remains necessary before claiming full WCAG conformance. |

An axe pass alone does not establish WCAG conformance. The recorded checks should be used together with actual assistive-technology testing and a review of the complete deployed user journey.
