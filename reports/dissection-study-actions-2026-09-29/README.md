# Dissection Lab interactive study guide

September 29, 2026

The selected-structure card now offers three numbered study actions:

1. **Inspect specimen** frames a visible structure and moves keyboard focus to the interactive specimen.
2. **Write observation** moves directly to that structure's evidence note. Its cue changes when a draft is already present.
3. **Check reference** opens the structure's reference and focuses its disclosure. A button at the end returns directly to the observation for revision.

These actions keep inspecting, writing, and comparing within reach. The introductory guidance is shorter. The action cards use readable text, generous spacing, numbered markers, and visible keyboard focus. Their grid follows the width available inside the selected-structure card.

Previously viewed hidden anatomy offers **Return to specimen** with a recovery cue. It does not frame hidden anatomy or add progress. The new shortcuts stay unavailable during assessments and timed practicals. Notes, confidence, identification records, scores, and preparation progress are preserved by navigation.

## Visual review

| Layout | Previous selection card | Updated selection card | Study actions |
| --- | --- | --- | --- |
| Phone, 320 pixels | [Before](before-selection-phone.png) | [After](after-selection-phone.png) | [Guide](guide-phone.png) |
| Tablet | [Before](before-selection-tablet.png) | [After](after-selection-tablet.png) | [Guide](guide-tablet.png) |
| Narrow embedded lab, larger text and high contrast | [Before](before-selection-embedded-large.png) | [After](after-selection-embedded-large.png) | [Guide](guide-embedded-large.png) |
| Desktop | [Before](before-selection-desktop.png) | [After](after-selection-desktop.png) | [Guide](guide-desktop.png) |
| Forced colors | [Before](before-selection-forced-colors.png) | [After](after-selection-forced-colors.png) | [Guide](guide-forced-colors.png) |

[Keyboard focus](focus-phone.png)

Screenshots temporarily place the floating status bar in normal document flow so it does not overlap the captured component. This adjustment applies only during capture.

## Verification

All 22 Chromium scenarios passed across the full run and a focused rerun: nine study-action scenarios, five notebook layouts, two existing evidence-review scenarios, and six responsive-workspace layouts. The full run passed 21 scenarios. Its final narrow embedded-workspace scenario exceeded the browser-context teardown timeout; that scenario passed when rerun on its own.

The study-action scenarios exercise inspection framing, keyboard focus, reference opening, returning to a note, retaining a new draft, changing the selected structure, hidden-anatomy recovery, and assessment restrictions. All five guide layouts passed automated accessibility checks. Layout measurements check readable type, control height, and overflow.

All 109 focused regression checks passed. The renderer copies are identical and pass JavaScript syntax and scoped whitespace checks. Final results are recorded in [verification.json](verification.json), [browser-results.json](browser-results.json), [browser-rerun.json](browser-rerun.json), and [unit-results.json](unit-results.json). The five original layouts are recorded in [baseline-results.json](baseline-results.json).

Changes remain uncommitted.
