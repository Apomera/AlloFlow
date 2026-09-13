# Applied Problem Solving: second refinement pass

Implemented locally on September 12, 2026. This extends the [first implementation](IMPLEMENTATION.md).

## Improvements

- **A more useful final review.** Learners can review writing, linked work, evidence connections, detailed-check summaries, criteria notes, and saved AI feedback together. A checklist shows which parts have recorded content; it explicitly does not grade that content or submit it. Edit controls return to the relevant stage and focus its writing field.
- **Linked work is a real response option.** A valid link plus an explanation now qualifies for coaching and counts as a started response section. A bare link does not. AI receives the written explanation and an explicit instruction that it has not inspected the linked artifact; the stored URL is omitted from that coaching context. Existing stale-response guards include edits to the explanation and link.
- **Quicker evidence connections.** In Explore, “Connect a lesson idea” links a selected source fact to an empty evidence row and focuses the learner’s claim. It leaves claim and explanation blank. Repeated clicks reuse an untouched row. Edited source facts appear unselected until reconnected, making changed references easier to resolve.
- **Tighter mobile navigation.** The five stages share one row, with a wider first button to keep Understand readable. Progress and the all-steps toggle share a row. The smaller phone header reduces scrolling while preserving the challenge context and reading controls.
- **Clearer question actions.** Accepting the suggested question focuses the writing field and changes the control to “Question added.” Replacing an existing custom question is labeled explicitly.

## Validation

90 tests passed across eight focused suites. New cases cover linked-work readiness, coaching boundaries, review coverage, keyboard focus, source reconnection, and preserving student authorship. Existing generation, export, and shared-response protections continue to pass.

Chromium checks passed at 1280, 390, and 320 pixels, including the evidence shortcut and a linked-work-only response through coaching, revision, review, and editing. The tested screens had no horizontal overflow, no axe violations, and no browser errors. The response stayed separate from the teacher template. The module compiled and its public copy and English string catalog match the root files.

| Viewport | Previous first writing field | Current first writing field | Document width |
| --- | --- | --- | --- |
| 1280px | 829px | 841px | 1280px |
| 390px | 1160px | 1051px | 390px |
| 320px | 1379px | 1218px | 320px |

These measurements include the authored preview’s shared workspace controls. Real task lengths vary. Automated accessibility checks do not establish conformance.

## Preview and evidence

Refresh the [component preview](current-preview.html) to load this pass. Its scenario is authored and AI responses are mocked; no deployment or live-provider validation was performed.

Screenshots: [phone](pass2-390.png), [small phone](pass2-320.png), [desktop](pass2-1280.png), [response review](pass2-review-390.png).

Results: [tests](pass2-tests.json), [browser checks](pass2-browser-results.json).
