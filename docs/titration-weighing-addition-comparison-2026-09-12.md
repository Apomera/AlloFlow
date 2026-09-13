# Weighing addition comparison - September 12, 2026

Weighing practice now has an optional **Compare addition outcomes** view beside the spatula controls. Compact buttons remain the default. Opening the comparison changes only the presentation; pressing a **+** button applies one portion through the existing weighing transition.

## What learners see

Each card shows the sample mass after one addition, starting from the same current sample. At **0.4970 g**, the choices predict **0.5970 g**, **0.5070 g**, and **0.4980 g**. The first two would be above the activity band; the smallest portion would land inside it. Forecasts are independent, not cumulative.

Both **0.4980 g** and **0.5020 g** count as inside the band. An exact **0.5000 g** result gets an explicit target message. Text identifies each outcome, with a green accent for an in-band result. These are predictions from the fixed-portion practice model; the introduction explains that real scoops vary.

The comparison permits adding and recording an actual mass outside the target band. It enforces the existing **2.0000 g** model limit separately for each portion. At **1.9900 g**, the coarse portion is unavailable, the medium portion reaches the limit exactly, and the smallest portion remains available.

When the boat is missing, the tare has not been set, or the shield is closed, a shared setup message replaces the forecasts. An unavailable operation never appears to have added material. Returning a loaded boat restores forecasts from its retained sample, independently of the balance's negative off-pan tare reading.

## Interaction and accessibility

The native comparison toggle supports Space and Enter and reports its pressed state. Its controlled group stays mounted. Buttons keep their addition labels and are associated with their visible outcome or setup explanation through aria-describedby. Toggling preserves focus, mass, and saved records. Applying an addition refreshes all forecasts from the new current mass; an earlier saved record remains visibly stale until recorded again.

The preference stays while weighing practice is mounted and returns to compact mode when the learner leaves and reopens that equipment. Recorded progress persists through that navigation. Restart follows the existing exercise reset behavior.

Cards fit side by side when space allows and stack at a 320 px viewport. Controls keep a minimum 44 px height. Scroll spacing keeps them clear of the sticky balance readout. The feature adds no animation, external asset, network request, or saved-state field.

## Verification

The focused run passed **85 tests in 8 suites**, including **8 new comparison tests**. Tests cover independent predictions, exact target values, inclusive boundaries, overshoot recording, procedure gates, per-portion capacity limits, malformed saved state, immutability, and agreement with actual transitions across 408 action/state combinations. Existing target, balance breakdown, weighing, transfer, preparation progress, equipment tab, and focus coverage passed.

The new browser harness passed **28 scoped accessibility/layout scans** at 1200 px and 320 px, with no page errors or horizontal overflow. It uses actual setup, tare, addition, and recording controls, including keyboard operation. Its report and screenshots are stored beside [the harness](../reports/chemistry-refinement-2026-09-06/titration-weighing-additions-browser.cjs).

The existing target-guide browser regression also passed 28 scans, for **56 combined scans** (54 with automated color-contrast checks and 2 forced-color structural scans). Desktop, phone, and phone forced-color comparison screenshots were visually reviewed. See [the combined validation summary](../reports/chemistry-refinement-2026-09-06/titration-weighing-additions-validation.json).

Normal-mode automated scans include color contrast. Two forced-color scans omit that one rule and use visual review for the rendered colors: axe has a [documented forced-color contrast issue](https://github.com/dequelabs/axe-core/issues/3978), where its calculation mixes authored and forced colors. The first failed scan is retained in titration-weighing-additions-first-browser-results.json. The remaining accessibility rules and overflow checks still run in forced colors. Browser colors are applied at paint time, as described by [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors).

Source syntax, source/public-copy parity, and English fallback/catalog matching were checked. There are **11 new English strings**; other-language translations remain pending. Changes are local and have not been deployed.
