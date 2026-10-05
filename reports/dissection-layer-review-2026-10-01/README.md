# Dissection Lab: layer review and recovery guidance

## What changed

- A visible **Layer review** now connects **What you did**, **What changed**, and **Try next** in Essentials and Advanced modes. It sits outside the collapsible Technique controls.
- Progress distinguishes completed actions, verified plans and explanations, a pending explanation, and readiness to reveal a layer. An empty review reports zero progress when explicitly requested.
- Action history shows all available records, up to the existing 18-record limit. Learners can inspect a saved response and replay its contact. Arrow keys browse; Enter or Space selects. Selection and replay preserve procedure progress, notes, calibration, and scores.
- Before-and-after cards use saved tissue snapshots. Incomplete older records get an explicit fallback. An older stroke uses its saved contact point; it does not replay a later stroke's path.
- Current guidance prioritizes the learning checkpoint, then links to the relevant view, optics, tissue, instrument, or calibration control. It opens and focuses controls without performing a technique action. Restricted trays never direct focus to an unavailable hydration instrument.
- Guided observation and Study tools use destinations that exist in those routes. Quiz and timed-practical modes conceal the new review and its preparation shortcuts.
- Cards wrap into one column in a narrow lab. Supporting text is at least 14 px, large text is at least 16 px, and action targets are at least 48 px high. High contrast and forced colors retain clear selection markers.

## Verification

| Check | Result |
| --- | --- |
| Browser scenarios | 20 passed; no skips or retries |
| Empty-review focus follow-up | 1 passed after the final visibility adjustment |
| Accessibility | 5 scoped axe audits; zero violations |
| Canvas, workspace, and reference regression suites | 258 passed |
| Broader improvement suite | 86 passed; 5 existing failures |
| Final renderers | Byte-identical, valid JavaScript, repository LF line endings |
| Scoped diff whitespace | Passed |

The beginner journey starts with a blank frog skin protocol, confirms each plan, prepares and explicitly selects the instrument, performs all six actions through the existing motor-neutral controls (including two pins), and verifies each explanation. It then saves an observation and confidence rating and completes an assessment question through the existing answer-support flow. Notes and procedure progress remain intact. Supported technique and assessment remain distinct from independent mastery.

The five broad-suite failures expect older instrument labels, direct sibling placement in the evidence panel, a former compass expression, or an earlier directory description string. Each was rerun against the exact pre-change renderer, SHA-256 `d637e7adcf315e026a2da7d4cc4d95a432c590cfdb2d9661e0cb21db5e3adf8d`, in a separate test process. All five reproduced with matching assertion errors. These failures remain documented; the suite is not fully green.

The initial browser run found one small large-text number style and two test-setup issues: restricted trays require Advanced mode, and the assessment route is named “Practice assessment.” Those were corrected before the 20-case passing run. Initial unit failures also exposed a mistaken CRLF conversion; both renderers were restored to the repository's LF format and all four suites were rerun. A shared-module mirror assertion failed during the initial run and passed on the rerun; no shared-module files were changed in this pass.

Screenshots use a capture-only rule that makes the sticky next-action card static. Production positioning is unchanged. Browser captures preceded the final LF restoration; that restoration changed line endings only. The final source SHA-256 is `729418d54d2d93973e8bc3adcf48ef43273d46098a003970aa3a868416f17c87`.

## Evidence

- [Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/verification.json)
- [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/browser-final-results.json)
- [Regression results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/unit-results.json)
- [Baseline comparison results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/baseline-unit-results.json)
- [Desktop review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/desktop.png)
- [Phone review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/phone.png)
- [Narrow lab with large text and high contrast](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/embedded-large.png)
- [Selected response](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/selected-response.png)
- [Learner journey evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-layer-review-2026-10-01/journey-state.json)

Changes are uncommitted. Nothing was staged, pushed, or deployed by this pass.
