# ATC interactive lesson workbenches — October 5, 2026

The lesson library now opens five hands-on workbenches. Learners can change an example, see the calculation or diagram respond, read the explanation, and enter the related practice exercise. The work uses the existing ATC visual system and requires no new packages or image downloads.

## Visual and interaction changes

- Replaced the plain lesson list with illustrated cards, a question for each concept, and a clear entry action.
- Added topic navigation and a two-column desktop workspace, with the interactive example first on narrow screens.
- Added live measurements, native keyboard-accessible sliders, feedback, and a reset for each example.
- Kept the formula, reference, practice action, and optional explanation at a chosen reading level together beside the experiment.

| Lesson | What learners can explore |
| --- | --- |
| Separation | Adjust horizontal and vertical spacing, switch aircraft wake category, and compare both measurements with the classroom model's limits. |
| Arrival order | Change two aircraft's distances and groundspeeds; compare their estimates on a shared timeline, including a farther aircraft arriving first and exact ties. |
| Headings | Rotate current and instructed headings; see the shortest turn across north and its duration at the simulator's manual turn rate. |
| Readbacks | Compare controller and pilot messages, identify a matching readback or a changed callsign/runway, and receive specific corrective feedback. |
| Wind | Rotate the runway and wind source; inspect headwind, tailwind, crosswind, and calm conditions with a wind-from diagram. |

Example values stay local to the mounted tool and are retained when switching topics. Reset affects only the current topic. These experiments do not award XP, record practice completion, change aircraft, or overwrite a saved shift. Exercise launch stays disabled when a saved shift needs attention. Unsupported saved lesson names now recover to the lesson library instead of falling through to an unrelated view.

## Preview

- [Lesson library, desktop](after-index-1440.png)
- [Arrival workbench, desktop](after-sequencing-1440.png)
- [Separation workbench, 320px](after-separation-320.png)
- [Wind workbench, 390px](after-weather-390.png)
- [Readback feedback, 390px](after-readback-feedback-390.png)
- [High contrast](after-high-contrast-weather.png)
- [Forced colors with 200% CSS zoom](after-forced-colors-sequencing-200percent.png)
- Before: [lesson library](before-index-1440.png), [sequencing lesson](before-sequencing-1440.png)

## Verification

**266 unit tests across 22 files and 54 browser checks passed** on the final unchanged source: 15 lesson-workbench checks, 22 visual-design checks, and 17 practice-flow checks. The scoped Git whitespace check also passed.

The final source and desktop copy match, as do the ATC English namespaces and development catalog: **589 English keys**, including 77 new keys in this pass. Other translation namespaces were preserved.

The focused browser suite renders the canonical ATC component in a local React fixture using installed Chrome. It uses product buttons and native keyboard input for sliders. Coverage includes all five topics, numeric boundaries and ties, per-topic state/reset, readback feedback, lesson/practice routing, keyboard focus, unavailable optional AI, high contrast, forced colors, and narrow layouts. A real paused practice checkpoint was captured, restored in a fresh fixture, preserved through all five experiments, and successfully resumed using the product's resume control.

Every lesson control measured at least 44px high. No horizontal document overflow or serious/critical axe findings were detected in the tested lesson/library layouts at 1440px, 390px, and 320px, or in the tested contrast and zoom states. Screenshots were also reviewed visually. Mobile checks use desktop Chrome at mobile viewport widths; physical mobile devices, remote AI responses, and student learning outcomes were not evaluated.

Machine-readable evidence: [validation results](validation-results.json), [lesson browser results](browser-qa-results.json), [unit test log](unit-tests.txt), [mirror and localization checks](verification.json), [visual regression results](regressions/atc-visual-design-2026-10-04/20261005T151334417Z/browser-qa-results.json), and [practice-flow regression results](regressions/atc-practice-flow-2026-10-04/20261005T151334417Z/browser-qa-results.json). These dated regression results supersede the earlier flat regression files in this folder.

Final canonical source SHA-256: `04c957c418534eca9853c08255b82a0e4ff7b63218b99a0f50c4ab4e985b6389`.

To repeat verification from the repository root:

```sh
node reports/atc-lesson-workbench-2026-10-05/run-validation.cjs
```

The runner checks the unchanged source hash, the complete ATC unit suite, source/catalog parity, the focused lesson browser suite, and the existing visual-design and practice-flow browser suites. Tests run sequentially.

The regression runners accept `ATC_QA_RESULTS_PATH` and `ATC_QA_ARTIFACT_DIR`, allowing evidence to be written into fresh dated folders. If a run is interrupted, `--resume` reuses only completed suites for the same unchanged source, rechecks their recorded assertions, and reruns the unfinished suites. Windows blocked overwriting existing report and screenshot files during earlier attempts; the final results and regression screenshots are retained in the dated folders linked above.

Changes remain uncommitted. No commit, push, or deployment was performed.
