# Review and refinements of the 24 main resources

Reviewed and implemented on September 8, 2026.

All 24 main resources were reviewed against the current implementation and the earlier September reviews. This pass implemented concrete reliability, accessibility, and presentation refinements in **17 resources**. The other seven had no additional confirmed blocking defect in the reviewed paths.

The largest recurring issue was delayed work applying after the learner, resource, draft, or permissions had changed. The fixes keep results attached to the work that requested them, preserve newer edits, and make recoverable failures visible. Existing unrelated workspace changes were preserved.

## Resource-by-resource coverage

| # | Main resource | Result of this pass |
| --- | --- | --- |
| 1 | Analyze Source Material | Added contextual names to correction checkboxes and cleaned up failed built-in AI sessions before provider fallback. |
| 2 | Glossary & Language Selection | Rechecked editing, filtering, empty states, language/pronunciation controls, image descriptions, and modal focus. No additional confirmed blocker; recent glossary-game and Definition Detective refinements were preserved. |
| 3 | Text Adaptation | Removed collapsed teacher tools from keyboard navigation and the accessibility tree; added expanded-state semantics. Audio saving now catches errors, offers retry guidance, and rejects obsolete progress/results. Fixed a browser-confirmed selector overflow at 320px. |
| 4 | Word Sounds | Bound delayed missing-audio confirmations to their original lesson and configuration. Navigation, edits, repeated confirmations, or failed setup can no longer launch stale practice or leave the launch guard stuck. |
| 5 | Visual Organizer | Improved narrow-screen toolbar wrapping and reduced-motion behavior. Revalidated existing hardening and view contracts. |
| 6 | Note-Taking Templates | Fixed stale feedback-dismissal callbacks and request ownership. Validated model response shapes and bounded rubric numbers so malformed feedback cannot crash rendering or produce invalid XP. |
| 7 | Anchor Chart | Protected rubric suggestions against newer teacher edits, chart changes, dialog dismissal/reopening, permission changes, and unmount. |
| 8 | Memory Aid Studio | Reviewed request tokens, input revisions, learner ownership, private practice, review/export contracts, and read-aloud. Existing protections passed; no additional confirmed blocker. |
| 9 | Applied Challenge Studio | Invalidated abandoned hint, stress-test, and feedback requests across learner/resource/permission changes. Old requests can no longer commit results or clear a newer request's busy state. |
| 10 | Lesson Images / Visual Supports | Fixed overlapping replacement uploads: the newest file selection wins, and late reads cannot overwrite newer edits, restores, or regenerated images. |
| 11 | FAQ | Added truthful save/partial-save/error status and retries, protected save/regeneration ownership, prevented duplicate work, synchronized external speed changes, and reset disclosure state between resources. Improved control targets, RTL alignment, and reduced motion. |
| 12 | Writing Scaffolds | Added usable recovery for empty/malformed resources while preserving original learner-response indexes. Improved save-error labels, phone layout, input hints, and button contrast; removed empty translation headings. |
| 13 | Activities | Reviewed discussion/jigsaw editors, learner projections, derivative presentation, and answer-key separation. Existing regressions passed; no additional confirmed blocker. |
| 14 | Interview Mode | Reviewed resume identity, session/reflection ownership, evidence notes, dialogs, and duplicate-submit guards. Existing runtime checks passed; no additional confirmed blocker. |
| 15 | Sequence Builder | Protected picture-description generation against navigation, reordering, manual edits, image changes, language changes, and unmount; added recoverable failure status. |
| 16 | Concept Sort | Rechecked teacher-review controls and keyboard select/place/dialog contracts. Earlier canonical-type fixes remain present; no additional confirmed blocker. |
| 17 | Document-Based Question | Scoped feedback to the current learner, source, and answer revision; restored reliable retries; validated feedback and scores; improved comparison-only feedback discovery and vocabulary request ownership. Added native rubric buttons and corrected summaries containing deleted criteria or invalid scores. Host wiring now respects student AI availability. |
| 18 | STEAM Lab | Refined the main resource's Explore entry to a native, named, keyboard-operable button with a larger target. Checked registry integration. This coverage concerns the main entry and integration, not every individual STEAM tool. |
| 19 | Adventure Mode | Reviewed session/turn completion, cleanup, character/settings paths, and existing request guards. Runtime regressions passed; no additional confirmed blocker. |
| 20 | Assess | Protected five AI authoring paths: question regeneration, whole-assessment repair, image refinement, individual distractor rewriting, and bulk distractor rewriting. Delayed results cannot replace a newer assessment; duplicate requests and synchronous bulk-provider failures are handled. |
| 21 | Standards & UDL Alignment / Curriculum Audit | Reports without a usable date now still compare available fingerprints and removed dependencies, with an explicit qualification about what cannot be verified. |
| 22 | Lesson Plan / Study Guide / Family Guide | Reviewed role-specific rendering, edit/copy/print/PDF actions, extension guides, next-lesson options, and station saving. Existing checks passed; no additional confirmed blocker. |
| 23 | Assignment Directions & Goals | Kept a single remaining activity available; corrected misleading all-visited and plural wording. Added direct Enter/Space activation for map stations, clearer continuation guidance, larger targets, better contrast, and phone wrapping. Existing HTML station navigation remains available. |
| 24 | Preview, Package & Deliver | Manual readiness confirmations now reset when the delivery setting or priority changes, so evidence confirmed for one delivery route is not reused for another. |

## Validation and integration

- **1,008 distinct automated assertions passed across 57 test files.** Repeated tests were counted once, using the latest result for each file and exact test name.
- **21 Chromium resource/viewport cases passed** at 1280px, 390px, and 320px. These cover paragraph and list Writing Scaffolds, Directions, the actual STEAM entry button, FAQ, Word Sounds preview, and Adapted Reading. No captured page errors or horizontal overflow remained.
- The 12 Scaffolds/Directions/STEAM cases also reported **zero axe accessibility violations** for the configured WCAG tags. The remaining nine cases include actual Tab checks for collapsed and expanded reading tools. This is targeted automated evidence, not a WCAG conformance claim.
- All **16 rebuilt runtime modules** match their desktop public copies byte-for-byte. Changed JSX sources, runtime scripts, and all three host files passed syntax parsing. The shared string catalog parses and matches its desktop copy.
- Updated the affected module cache versions in all three app entry files, preserving other in-progress work.
- Module registration passed: **189 consumers, zero missing producers**. The tool registry's strict contract passed with zero violations. Its 32 informational metadata defaults remain optional polish in individual STEAM/SEL tools.
- The affected builders that encountered OneDrive direct-write failures now replace generated files atomically.

Evidence: [deduplicated test and browser summary](validation.json), [module hashes and host integration](integration.json), [12-case browser results](root-browser.json), and [9-case foundation browser results](../main24-foundations-20260908/browser-results.json).

The broader runs exposed several obsolete test expectations, which were updated to the current UI or intentional abandoned-request behavior. Two invocations omitted a requested test file; successful focused reruns supplied that coverage. Earlier failures are retained in source reports and superseded only by a later pass of the same assertion. The validation summary identifies every contributing report.

## Remaining refinements and limits

These are specific follow-up opportunities, rather than newly confirmed blockers:

1. Give Lesson Plan/Study Guide/Family Guide generation exact dependency provenance so later edits can be compared against the resources actually used.
2. Verify a complete saved-map round trip for Visual Organizer when interactive nodes and static branches are edited together.
3. Exercise saved-resource language versus ambient language across realistic pronunciation and TTS configurations.
4. Extend human-reviewed translations for recovery messages and perform classroom sessions with keyboard, screen-reader, and touch users.
5. Refine explicit evidence handoffs between Interview and other resources where that improves the learning workflow.

Provider-dependent logic was validated with controlled local providers. This pass did not run live Gemini/Kokoro/model-quality comparisons, every main-resource browser journey, every individual STEAM/SEL tool, physical printing, or a full repository test suite. Stale-result guards prevent obsolete application updates; they do not necessarily cancel provider-side generation.

Changes are local; no deployment or commit was performed.

## Detailed workstream reports

- [Foundations: seven resources](../../docs/main-24-foundations-refinements-2026-09-08.md)
- [Interactive learning: seven resources](../../docs/main-24-interactive-refinements-2026-09-08.md)
- [Studios, planning, and alignment: six resources](../../docs/main-24-studios-refinements-2026-09-08.md)
- Root integration covers Writing Scaffolds, STEAM entry, Assignment Directions & Goals, and Preview/Package/Deliver, plus host wiring and cache versions.


## Subsequent focused follow-up

[Additional organizer refinements](../main-24-followup-2026-09-08/REVIEW.md) repair connection targets after concept removal and validate AI layout coordinates. That follow-up passed 90 targeted assertions; its counts are separate from the earlier review above.


## Approved continuation completed

[Saved-map synchronization and planning provenance](../map-planning-refinements-2026-09-08/REVIEW.md) are implemented, with 190 passing targeted checks and nine browser cases. These follow-up counts are separate from the earlier review above.
