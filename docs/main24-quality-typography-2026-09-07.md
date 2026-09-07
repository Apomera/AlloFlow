# Main 24 resources: quality and typography follow-up

Date: September 7, 2026 (UTC). Scope: the current local working tree, building on the September 4 review and completed fixes.

This pass reviewed all 24 main resource entries and implemented confirmed improvements to editing reliability, accessible controls, printable content and typography. Existing work in the shared checkout was preserved. The local app and affected runtime modules were rebuilt; nothing was deployed or committed.

## Typography

- Font size now has one shared state for its slider, keyboard input, voice commands and rendering. The slider restores the saved size instead of starting at 16 while the text uses another size. The supported 10–48px range is consistent with stored preferences and voice commands; asking for bigger text cannot shrink a size above the former 32px voice limit.
- Letter spacing now survives reloads, with invalid/out-of-range storage values rejected.
- Main resource headings, prose, cards, table cells, disclosures, labels and response fields respect the selected line and letter spacing instead of competing with fixed prose/leading styles.
- Fixed-pixel text utility classes within the main resource host scale proportionately with the root font size. Ordinary DBQ and Anchor Chart inline text uses rem. Anchor Charts and Lesson Plan questions inherit the selected font instead of forcing a decorative/serif face.
- Andika italic and bold italic load the full Andika stylesheet on first selection and share a single request with the regular face. OpenDyslexic falls back to sans-serif consistently with the font catalog.
- Typeset mathematics and SVG diagrams retain their renderer-specific fonts and metrics. Font-library initialization no longer removes native disabled attributes from application controls.

These settings govern ordinary application/resource text. Immersive Reader has its own font preference; exported documents retain their own authored export typography. Embedded images, fixed-coordinate diagrams and individual STEAM tools were not all converted or audited. Web-font request behavior and CSS family selection were tested with controlled network responses; this is not a visual comparison of every downloaded font.

## Review of the 24 entries

| # | Resource | Result of this pass |
| ---: | --- | --- |
| 1 | Analyze Source Material | Retained grammar persistence safeguards; reviewed and reran grammar coverage. Shared typography applies to its resource text. |
| 2 | Glossary & Language Selection | Retained description-aware image accessibility and generator integration; refreshed obsolete test expectations and reran coverage. |
| 3 | Text Adaptation | Retained reading accessibility and its separate immersive preference; no new confirmed playback defect. |
| 4 | Word Sounds | Reviewed preparation, review and learner-launch contracts; existing regression coverage passed. |
| 5 | Visual Organizer | Reviewed static/interactive/3D handoffs; no new confirmed defect. Saved branch/node consistency remains an unconfirmed follow-up. |
| 6 | Note-Taking Templates | Existing learner-response ownership, feedback and preview protections passed. |
| 7 | Anchor Chart | Inherited fonts, scalable titles/body/inputs, icons stacked above text in narrow sections, wrapped reading headings, scoped print/motion styles and no unused decorative-font download. |
| 8 | Memory Aid Studio | Existing normalization, review, ownership and build checks passed. |
| 9 | Applied Challenge Studio | Existing schema and learner interaction checks passed. |
| 10 | Lesson Images / Visual Supports | Delayed AI description requests preserve newer author edits and decorative choices; request state follows the image and failures allow retry. |
| 11 | FAQ Generator | Existing localized audio/disclosure behavior retained and tested. |
| 12 | Writing Scaffolds | Response fields identify each blank and prompt to assistive technology while preserving saved response keys. |
| 13 | Activities | Existing typed Discussion/Jigsaw editing, projections and main-resource runtime tests passed. |
| 14 | Interview Mode | Existing session-artifact and runtime isolation tests passed. |
| 15 | Sequence Builder | Reorder buttons show arrows; image regeneration is visible when keyboard focus enters its controls. |
| 16 | Concept Sort | Preserved ongoing work and existing canonical-type fixes; dialog accessibility tests passed. |
| 17 | Document-Based Question | Counts visible work accurately, exposes progress/selection state, wraps choices, scales text and prints literal safe content with translated headings. |
| 18 | STEAM Lab | Reviewed the Math/STEAM entry and its lifecycle/null-content coverage; individual plugins remain outside this 24-entry scope. |
| 19 | Adventure Mode | Existing runtime cases and deterministic build checks passed after an isolated timeout rerun. |
| 20 | Assess | Existing answer-key and mode-preset checks passed. |
| 21 | Standards & UDL Alignment / Curriculum Audit | Retained fingerprint-based freshness/staleness protections; no new confirmed defect. |
| 22 | Lesson Plan / Study Guide / Family Guide | Clearer action names and state, inherited question font, wrapping header, safe station-storage failures without false success. |
| 23 | Assignment Directions & Goals | Existing translated choice references, optional goals, missing-choice feedback and text fallback retained and tested. |
| 24 | Preview, Package & Deliver | Existing preflight, accessibility and scoped builder-resource projection checks passed. |

## Verification

- Foundations: 151 passing tests across 13 suites.
- Learning: 121 passing tests across 11 suites, including focused reruns.
- Studios/planning/export: 232 passing tests across 11 suites, including focused reruns.
- Shared typography: **35 distinct passing checks**, including nine Chromium checks and 26 style/persistence/header regressions. Final merged result: `scratch/main24-typography-final-summary-2026-09-07.json`.
- Local app build completed, generated App.jsx parses, and all nine changed runtime files exactly match their desktop public mirrors.
- CSS template check: 485 files, no stray backticks. View-prop scan: 65 views, no parse failures or risky missing props. Tool registry: no contract violations (30 existing informational default metadata notices).

Suite groups overlap; their counts must not be added as a count of distinct whole-project tests. Obsolete source-string/decorative-icon expectations were updated to current behavior. An Adventure build check initially timed out under concurrent load, then passed directly and in isolation. Browser-test setup was corrected to avoid React 18 server-side CSS escaping and to inspect the actual chart text nodes with the shipped utility CSS.

This is focused source, component and browser verification. It is not a claim that all 24 complete live-browser journeys, external AI providers, live classroom delivery, physical printing or manual screen-reader use were tested.

Details: [Foundations](main24-foundations-quality-2026-09-07.md), [Learning](main24-learning-quality-2026-09-07.md), [Studios and delivery](main24-studios-quality-2026-09-07.md).
