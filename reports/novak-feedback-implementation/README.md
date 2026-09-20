# Novak reading implementation — 2026-09-19

The source-preserving reading workflow is implemented locally. This extends the reviewed plan with an optional, remembered Show changes setting in the Original/Adapted comparison.

## User-visible behavior

- **Read original with supports** opens the exact input or the currently selected saved analysis without an AI rewrite. Existing companions retain the source captured when they were made, even after source edits or deletion.
- **Original / Adapted / Both** are available in student reading. Both uses two columns on wide screens and stacked panes on narrow screens. It keeps the currently selected adaptation; it never substitutes an unrelated recent analysis.
- **Show changes** defaults off and remembers the learner's choice on this device. Turning it on marks deletions and insertions in red and green, with strikethrough and underline. Unsupported long or cross-language comparisons explain why highlighting is unavailable. Clean comparison remains available.
- **Keep Source Format and Tone** is the default for new adaptations. It asks generation and later revisions to retain genre, structure, speakers and broad tone while adapting language. Explicit format transformations remain available. This is an AI instruction, not a guarantee of exact stylistic equivalence.
- Reading supports use the selected pane's passage and language. Each pane has Listen/Stop. Original wording is protected from direct edits, revision, undo/redo replacement and complexity changes; teachers can create an adapted companion.
- Generated word supports are separately validated, exact-range annotations. Visibility and density can change without altering source text. Clean Both can show matching original glosses; turning change markings on temporarily suppresses glosses to keep the diff understandable. Generation reports partial and unavailable results honestly.
- Saved projects, class resources and student packs preserve valid source/support fields. Text that resembles JSON remains text. Transport limits are retained; incomplete originals lose claims of exact preservation.
- Document and PowerPoint exports pair originals with adaptations, with an independent Include original reading option. Gloss notes are escaped and separate, and original text is not converted into cloze blanks.

## Validation

Behavioral tests cover source capture and preservation, edited analyses, exact text serialization, source pairing, generation and revision safeguards, stale async results, anchored glosses, source-language actions, visible instructional roles, comparison toggles, student access, export projection and accessibility.

The browser fixture uses the actual generated reader and contract modules with stateful React props and the app stylesheet. It checks exact passage text, persisted diff preference, 390px/320px layout, gloss visibility, direct audio Stop controls and forced-color change indicators. Audio and AI callbacks are mocked; this is not an end-to-end live AI quality evaluation. See browser-results.json and screenshots in this folder.

Focused final verification:

- Preservation contracts and original-reader handlers: 50/50 passed; adjacent instructional/session suites also passed (105-check earlier preservation run).
- Final reader suite: 61/61 passed; instructional-role and accessibility/formatting suites passed (15 checks in the final adjacent run).
- Generation/gloss and citation suites: 39/39 passed. Full Pack generation, ready-plan and lesson-DNA regressions: 72/72 passed.
- New delivery/export suite: 15/15 passed. Existing document selection, instructional metadata, history sharing, cloze and session suites passed.
- Browser: 8 checks passed, no runtime errors. Desktop and 390px/320px screenshots visually inspected.
- All 16 affected root/public module pairs match. Root and both desktop app sources pass Babel syntax parsing and match apart from their existing production/local loader configuration. Cache pins reference the current affected modules. Scoped git diff --check passed.

These counts describe separate test runs and should not be added as one deduplicated total. Shared-host startup/file-I/O timeouts were resolved with one thread worker and longer test/hook limits; no test configuration was changed globally.

Known unrelated baseline failures: two Memory Aid visualAlt sanitation assertions in firestore_sync.test.js; three old static shell-wiring assertions in class_mailbox.test.js (all reproduced against HEAD); and the pre-existing inline-rigor implementation expectation in simplified_rigor_cdn_extraction.test.js, although that implementation already lives in host_handlers at HEAD. No unrelated baseline was rewritten to hide failures.

## Release limits and follow-up scope

- Changes are local; this task does not deploy the application.
- The plan's Quick Start loading investigation remains a separate workstream.
- Community publication of preserved-reading payloads currently refuses the operation explicitly. Automatic approval review rejected extending that community payload because the public destination was not authorized; the permitted alternative avoids silently dropping the original. Local/student delivery and export work is complete.
- Live model evaluation of literary style and gloss selection, live session/network round trips, and manual screen-reader use were not performed in this fixture.

## Evidence

- browser-qa.cjs — reproducible browser checks.
- browser-results.json — browser assertions and scope.
- both-clean-desktop.png / both-changes-desktop.png — comparison toggle.
- both-clean-390.png / both-clean-320.png — narrow layouts.
- both-changes-forced-colors.png — non-color change indicators.
- original-glosses-desktop.png / original-glosses-320.png — additive original supports.
