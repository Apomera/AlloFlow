# ATC Ops Lab investigation workspace — October 5, 2026

Ops Lab now makes the relationship between controls, modeled workload, and recorded evidence visible. Learners adjust one factor, inspect its contribution, record distinct setups, compare any two records, and explain the result. The workspace follows the ATC tool's existing navy and mint visual system and uses native controls and code-rendered charts.

## Visual and engagement changes

- Replaced the compact form with a controls workspace, a live score and workload scale, five contribution bars, an evidence log, and a comparison/explanation workspace.
- Added an observe–log–explain progress guide and specific next-step feedback.
- Used one shared 0–30 point scale for contribution bars. The dashed marker identifies each factor's maximum weight; numeric labels accompany every bar.
- Added a compact live score that stays visible beside controls on phone and tablet layouts, so learners can see changes while adjusting a slider.
- Added high-contrast controls within Ops Lab, explicit keyboard focus, narrow-screen layouts, and forced-color support. Controls measured at least 44px high in the tested layouts.

## Investigation behavior

Recent evidence appears as setup cards. The comparison selectors can choose any two recorded setups, including older records beyond the four displayed cards. The comparison shows both scores, the signed change from A to B, all five recorded settings, and which controls changed. It distinguishes a single-control investigation from comparisons that changed several controls, even when the contributions cancel and the total score is identical. Numeric differences remain visible when both records fall in the same workload band.

Each setup can be loaded into the live controls. Loading moves keyboard focus to the controls heading and does not alter the recorded comparison. Reset restores the five starting values while preserving the evidence and explanation. Identical normalized settings cannot be logged twice.

Clearing evidence and the explanation now provides Undo. Undo restores the records and explanation while retaining the current control values. Starting a new log dismisses Undo so that it cannot overwrite the new investigation. The undo snapshot is local to the mounted tool.

Records and explanations continue to use the existing saved tool data. Unsupported or incomplete records are excluded from comparison with a visible recovery message; valid records remain available with their original setup numbers. Stored scores and translated workload labels are recalculated from recorded inputs. Unsupported records stay in the underlying saved log until the learner chooses to clear it.

Completion requires two distinct recorded setups and a written explanation. Prompts provide scaffolding without an answer key. Exploring the model does not award XP, mark a practice exercise complete, alter aircraft, or overwrite a saved tower shift. A real practice checkpoint was captured, preserved through Ops Lab interactions, and resumed successfully with the product control.

## Model

The original classroom model and starting result are preserved: **54.3 / 100**, in the Training band. The index combines arrival frequency (30%), wind (25%), reduced-separation pressure (25%), descent multiplier (10%), and decision-window pressure (10%). Band boundaries remain 35, 55, 75, and 90 points. Calculations retain precision; displayed results use one decimal place.

Input normalization follows the actual slider bounds and steps. Recorded evidence must contain all five finite numeric values within those bounds and steps. The model remains a standalone teaching index and does not configure the tower shift or predict real-airport safety.

## Preview

- [Desktop investigation and comparison](runs/20261005T195806715Z/after-comparison-1440.png)
- [Phone comparison detail](runs/20261005T195806715Z/after-comparison-detail-390.png)
- [Live feedback while adjusting phone controls](runs/20261005T195806715Z/after-live-controls-320.png)
- [Older records selected and reloaded](runs/20261005T195806715Z/after-history-selection-1440.png)
- [High contrast](runs/20261005T195806715Z/after-high-contrast-390.png)
- [Forced colors with 200% CSS zoom](runs/20261005T195806715Z/after-forced-colors-200percent.png)
- Before: [desktop comparison](before-comparison-1440.png), [phone comparison](before-comparison-320.png).

## Verification

The complete ATC unit suite passed: **285 tests across 23 files**. All **52 browser checks** passed: 15 focused Ops Lab checks, 15 lesson-workbench regression checks, and 22 visual-design regression checks. The final source remained unchanged throughout validation, and no runtime errors were reported.

The focused browser suite renders the canonical component in a local React fixture using installed Chrome. Product buttons and native slider keyboard input drive the investigation. Coverage includes control contributions and endpoints, duplicate blocking, differences within one band, different setups with identical scores, older record selection and loading, clear/undo, restored data, malformed saved values, genuine saved-shift preservation, keyboard interaction, mobile/tablet live feedback, contrast, and zoom.

No horizontal document overflow or serious/critical axe findings were detected in the tested Ops Lab layouts at 1440px, 390px, and 320px. Sticky live feedback was checked while adjusting every factor at 320px, 390px, and 900px. Desktop, phone, high-contrast, and forced-color screenshots were reviewed visually. Mobile checks use desktop Chrome at mobile viewport widths; physical devices and student learning outcomes were not evaluated.

The canonical source and shipped desktop copy match. The ATC English namespaces and development catalog also match: **631 keys**, including **42 new keys in this pass**. Other translation namespaces were preserved. The scoped Git whitespace check passed.

Evidence: [complete validation results](validation/20261005T205753738Z/validation-results.json), [Ops browser results](runs/20261005T195806715Z/browser-qa-results.json), [unit test log](validation/20261005T200005435Z/unit-tests.txt), [lesson regression results](validation/20261005T200005435Z/atc-lesson-workbench-2026-10-05/browser-qa-results.json), [visual regression results](validation/20261005T205753738Z/atc-visual-design-2026-10-04/browser-qa-results.json), [source and localization parity](verification.json), and [baseline](baseline.json). The final visual run supersedes the interrupted run in the earlier validation directory; completed unit, Ops, and lesson results were reused only after checking their source hash and recorded assertions.

Final canonical source SHA-256: `dcfec232079bf26f28689883e9a570a57c59eef811da83c9d11d72da9ba7df71`.

Baseline source SHA-256: `04c957c418534eca9853c08255b82a0e4ff7b63218b99a0f50c4ab4e985b6389`.

To repeat validation from the repository root:

```sh
node reports/atc-ops-investigation-2026-10-05/run-validation.cjs
```

The runner checks the complete ATC unit suite, source/catalog parity, the focused Ops Lab browser suite, and the lesson-workbench and visual-design regression suites sequentially. Each run writes evidence into a fresh dated directory. An optional first argument reuses a completed Ops browser-result file only when its source hash and assertions match. An optional second argument recovers verified unit and completed browser results from an interrupted validation directory, with matching source/parity checks.

Changes remain uncommitted. No commit, push, or deployment was performed.
