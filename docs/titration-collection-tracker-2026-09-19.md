# Titration saved-observation tracker — September 19, 2026

The guided **Bracket the color change** step now includes a two-card tracker for the saved colorless and pink observations. It gives students concrete feedback while they collect evidence, before the existing comparison plot becomes available.

## Feedback and navigation

Each saved observation shows its added volume, pH, and notebook number. A missing side has a dashed card and **Not saved yet** label. If both sides are saved but too far apart, the tracker displays the actual saved volume gap and asks for closer observations. The target remains two observations no more than 0.2 mL apart.

**Open observation #…** scrolls to and focuses that reading's note field in the notebook. Students can inspect or edit the note and use **Return to investigation** to resume. Navigation does not change the experiment volume or other saved values. It is scoped to the active bench instance.

Moving the live flask does not fill a tracker card. A separate message identifies an unsaved current reading. Only observations already credited to the current investigation appear, so pre-existing notebook rows cannot silently fill a missing side.

## Pair selection and continuity

The tracker and guided progress share one crossing-pair helper. Eligible pairs use the same setup and indicator, with the pink reading at a higher volume. The tracker selects the narrowest saved crossing; when a reviewed valid pair exists, it stays consistent with that pair. Before both sides exist, it uses the highest-volume colorless observation or lowest-volume pink observation. Incompatible observations are not assigned a gap.

The existing pH threshold and 0.2 mL completion tolerance are unchanged. The tracker reports recorded evidence; it does not infer an exact endpoint, fit a curve, or grade a student explanation.

The tracker is derived from the saved notebook and investigation. It updates after removal or undo, resumes after setup changes and component remounting, and adds no new persisted state. Existing report, notebook recovery, and 3D bench behavior remain covered by the regression checks.

## Accessibility and verification

**114 tests across six suites and 72 browser accessibility/layout scans passed, with no page errors.**

The cards stack on narrow screens. Distinct shapes, visible labels, notebook IDs, and numerical readings communicate their meaning without relying on color. Saved-evidence feedback uses a polite status region; ordinary live-volume changes do not rewrite it. Notebook links are native buttons with precise labels and keyboard focus handoffs.

Validation results and commands are in [the validation record](../reports/chemistry-refinement-2026-09-06/titration-collection-validation.json). Tests cover missing sides, wide gaps, matching setup/indicator, increasing volume, unchanged completion thresholds, reviewed-pair consistency, excluded/replaced evidence, note preservation, and input immutability.

The browser fixture uses actual saved readings and additions, verifies unsaved versus saved pink observations, narrows a wide gap, opens exact note fields, and checks note editing, paused setups, serialization, removal/undo, forced colors, and stable 3D viewer identity. It also reruns the existing guided workflow, report downloads, diagrams, and notebook recovery scenarios.

Desktop and phone layouts are scanned at 1200 and 320 pixels. Forced-color scans omit axe's contrast rule because of its limitation in that mode; applicable accessibility rules and layout/ARIA checks still run. This is scoped browser emulation, not a physical-device or classroom pilot.

Fifteen new English strings are registered. Other-language translations remain pending. No dependencies were added and no deployment was performed.

- [Wide-gap desktop preview](../reports/chemistry-refinement-2026-09-06/titration-collection-wide-1200.jpg)
- [Missing-observation phone preview](../reports/chemistry-refinement-2026-09-06/titration-collection-missing-320.jpg)

Browser rerun: node reports/chemistry-refinement-2026-09-06/titration-collection-browser.cjs
