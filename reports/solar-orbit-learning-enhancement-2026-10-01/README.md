# Solar System orbit learning enhancement — October 1, 2026

This pass makes the linked orbit diagrams and A/B evidence workflow easier to inspect after the [world detail enhancement](../solar-detail-enhancement-2026-10-01/README.md).

## Changes

- The two linked diagrams have named figure surfaces, a shared visual hierarchy, and aligned desktop layout. They stack on phones. Plot labels and controls receive more room while retaining the existing orbital geometry, zero-based speed axis, SVG descriptions, and marker IDs.
- The live rhythm reading has a distinct surface. The existing live text remains a leaf node, so playback continues to update the retained node. No additional animation loop, clock, downloaded asset, or WebGL resource is introduced.
- Learning buttons, the inspection slider, the explanation disclosure, and evidence controls have at least 44px height. The native explanation panel begins collapsed and supports its existing keyboard behavior.
- Evidence snapshots have a heading and next-step indicator, clear A/B cards, captured/empty states, and labeled captured time, speed, and distance. Missing values in older snapshots display “Not recorded.” The saved values stay fixed while the orbit advances.
- Prediction feedback has a readable theme surface and an accent for its outcome. Existing save/prediction gates, observation recording, clear/export callbacks, accessible names, table relationships, and journal data remain intact.

## Visual evidence

Baseline images use the local source immediately before this pass, with the real tool module and compiled app stylesheet in the repository harness. Reduced motion is enabled.

| View | Before | After |
| --- | --- | --- |
| Mercury diagrams, desktop dark | [Baseline](before-mercury-1060-dark-rhythm.png) | [Enhanced](after-mercury-1060-dark-rhythm.png) |
| Mercury diagrams, phone light | [Baseline](before-mercury-320-light-rhythm.png) | [Enhanced](after-mercury-320-light-rhythm.png) |
| Mercury evidence, desktop dark | [Baseline](before-mercury-1060-dark-evidence.png) | [Enhanced](after-mercury-1060-dark-evidence.png) |
| Mercury evidence, phone light | [Baseline](before-mercury-320-light-evidence.png) | [Enhanced](after-mercury-320-light-evidence.png) |

## Verification

All **100 focused unit checks** across eight files passed. They cover equal swept areas, orbit shape and stepping, direction arrows, next-step wedges, speed profiles, matching-distance inspection, canvas alternatives, live controls, and evidence contracts. The final canonical/desktop mirror check also passed after the phone spacing refinement. Evidence: [unit JSON](focused-unit-tests.json), [unit log](focused-unit-tests.log), and [final mirror JSON](final-mirror-unit-tests.json).

All **21 targeted Chromium browser cases** passed with one worker and retries disabled. The four new cases exercise phone/desktop layouts in both themes, 44px control sizing, native disclosure keyboard/focus behavior, accessible SVG descriptions, frozen snapshot definitions, save/prediction gates, the complete evidence workflow, observation recording exactly once, retained live text nodes, and absence of unintended exports. Existing cases verify world details, comparison/evidence tables, live diagram synchronization, matching distances, direction arrows, compact panel heights, and equal-time preview behavior. Evidence: [browser log](browser-tests.log) and [browser artifacts](browser-results/).

The final visual review passed all five layout/theme/world cases with no page overflow or runtime errors. Both diagrams retain their geometry and marker IDs. Native keyboard disclosure and matching-distance inspection passed; the completed evidence table and supported prediction were captured in each case.

| Width | Theme | World | Minimum control height | Minimum prose contrast | Feedback contrast | Smallest rendered SVG label |
| --- | --- | --- | --- | --- | --- | --- |
| 1060px | Dark | Mercury | 44px | 5.47:1 | 5.32:1 | 11.85px |
| 1060px | Light | Mercury | 44px | 5.20:1 | 5.45:1 | 11.85px |
| 736px | Dark | Earth | 44px | 5.47:1 | 5.32:1 | 11.85px |
| 320px | Light | Mercury | 44px | 5.20:1 | 5.45:1 | 10.40px |
| 320px | Dark | Halley's Comet | 44px | 5.47:1 | 5.32:1 | 10.40px |

Contrast measurements composite transparent backgrounds over their actual parent surfaces. SVG label sizes include the rendered viewBox transform. Measurements: [after-metrics.json](after-metrics.json). Visual run: [log](after-visual-qa.log). Completed examples: [desktop dark evidence](after-mercury-1060-dark-completed-evidence.png) and [phone light evidence](after-mercury-320-light-completed-evidence.png).

Source syntax, scoped whitespace checks, and canonical/desktop parity passed. Reader font overrides remain available. No commit was created.

Reproduce visual checks from the repository root:

```powershell
node reports/solar-orbit-learning-enhancement-2026-10-01/visual-qa.cjs
```

The saved baseline is historical evidence. All changes remain uncommitted.
