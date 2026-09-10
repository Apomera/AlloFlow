# Broadside reader review

Added optional audience and purpose notes to the composer. They are saved with the draft, shown in the reader review, and excluded from the exported sheet. Bounded text normalization handles legacy drafts and long planning notes wrap on phones.

The reader-review panel switches between the decorated design and a text-only proof that preserves wording and line breaks. A return action focuses the composer. The self-review checklist asks students to check their message for its audience, proofread details, and inspect visual hierarchy. Checks are self-reported, never gate printing, and clear whenever text, planning, typography, or mark settings change, including external draft updates. Switching proof views does not clear them; reopening starts a fresh review.

Exports from either view contain the designed broadside. Planning notes, checklist controls, and the plain proof are excluded. Lesson printing still shows the design when text-only review is selected. Text is rendered safely, including markup-like content.

Validation: 43 tests passed across nine existing Printing Press suites. The existing broadside browser regression and new reader-review browser checks passed. New checks cover keyboard view selection, direct focus return, planning recovery, check invalidation, view-switch preservation, export isolation, print visibility, long planning notes, external draft changes, and no horizontal overflow at 1280/390/320 px. Axe reported zero WCAG A/AA violations in the planning and reader-review regions. Mobile screenshots of the review controls and plain proof were visually inspected. Syntax, whitespace, and source/desktop parity verified.

Evidence: browser-results.json, review-1280.png, review-390.png, review-320.png, text-proof-1280.png, text-proof-390.png, text-proof-320.png, broadside-from-reader.html. These checks use the actual tool in an isolated React host; learning outcomes have not been measured.
