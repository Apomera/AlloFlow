# Symbol Studio: draft recovery and story authoring — September 12, 2026

This pass turns the remaining authoring gaps from the previous review into working features, then checks the failure paths that could cause new draft storage to preserve the wrong work.

## Implemented

- **Editable Social Stories:** Every page has Edit text, Save text and Cancel. Blank text is rejected, the original illustration stays attached, narration and printing use the saved wording, and keyboard focus returns to the edit control. The draft status identifies page text that has not been saved.
- **Draft recovery on this device:** Board Builder, Sequences, Social Stories and all eight Quick Board modes restore their current setup. Multipage board edits and the selected page survive recovery. A recovered edit retains its saved board/sequence identity so Save changes updates the original support.
- **Separate learner drafts:** Switching A → B → A restores each learner's own setup, including images, hidden choice options and Communication Builder fields. Temporary selected choices, earned tokens, pain selections and transition progress reset; they are not treated as authored content.
- **Honest save status:** “Draft saved” appears only after the IndexedDB transaction completes. Loading is bounded; failed recovery releases the editor and retains new work in the current session. A retry that finds older work offers Restore saved or Keep current. An unreadable saved draft can be replaced with current work through an explicit confirmation.
- **Scoped clearing:** Clear this draft resets only the current editor and leaves saved supports and other drafts intact.
- **Navigation protection:** Editing waits until initial recovery settles, including entry points from Word Garden and other tabs. Profiles and tabs remain available. Closing the Studio, switching learners and hiding the page flush pending drafts. A browser page-exit guard protects work while a write is pending or page text remains uncommitted.
- **Late-result ownership:** Board translations and cell recordings check learner, board and request ownership before updating content. Delayed results are discarded after replacement or navigation. Translation preserves valid concurrent cell edits and handles malformed responses and timeouts; recording releases stale microphone streams, timers and readers.
- **Quick Board accessibility:** Earned-token controls are keyboard-operable native buttons with pressed state. Body Check generation and Transition controls have descriptive accessible names.

Automatic drafts are separate from saved supports: use Save / Save changes to update gallery records and Visual Pack references, and Save text to commit a page edit. Existing downloadable backups do not include drafts.

## Resilience design

Drafts use a versioned IndexedDB record per learner, with ordered reads, writes and deletion. Validation preserves AAC cell metadata and recorded audio while excluding loading flags, generated speech cache pointers and temporary response states. Unknown, malformed or oversized records are rejected without overwriting them. The current draft limit is 25 MiB; arrays and text also have defensive bounds.

There is no image-bearing localStorage fallback. If device storage is unavailable or full, the current in-memory work remains available and the UI offers retry. Local recovery depends on this browser's storage and is not a cloud backup. A forced process termination or a browser that suppresses page-exit prompts can still interrupt pending writes; the “Draft saved” status is the point at which persistence has been confirmed.

## Verification

- **237 / 237 automated tests passed across 26 files** in the final combined run. This includes 35 draft-store tests, 14 draft-lifecycle tests, 7 story-text tests, 11 recording-lifecycle tests, 10 translation-ownership tests, and the existing Symbol Studio regressions. [Full test results](test-results.txt)
- **75 / 75 browser workflow assertions passed**, including real IndexedDB reloads, learner isolation, aborted-write retry, failed-read recovery choices, corrupt-record replacement, scoped clearing, keyboard controls and the page-exit warning. [Browser findings](browser-findings.md) · [Assertions](final/checks.json)
- **48 rendered states reviewed** at desktop and phone widths: 24 new authoring states, 18 prior interface states and 6 board/print states. No measured workflow overflow or browser runtime errors; all measured controls in the new phone states met the 44px target. [Summary](final/summary.json) · [Measurements](final/measurements.json)
- **Actual two-page story PDF verified** for edited wording, line breaks and an illustration on each sheet. Existing four-column board printing also passed. [Printed story](final/edited-story.pdf) · [PDF checks](final/pdf-verification.json)
- Root and desktop JavaScript syntax checks passed; the scoped whitespace check passed. Both distributed files are byte-identical, with SHA-256 `3d8a0dfae75820ef8605f5108ec6e45e454911922709c5920cf012aa6aafad87`.

The final regression run used `node node_modules/vitest/vitest.mjs run tests/symbol_studio --maxWorkers=1 --pool=threads --hookTimeout=60000 --testTimeout=30000`. The browser harness is [preserved for repeat checks](browser-draft-authoring.cjs). Earlier partial-run logs in this folder are superseded by the final combined result above.

All browser and automated tests use fictional learners and local provider/recording fixtures. No production deployment, external AI call, or live learner-data operation was performed.

## Remaining opportunities

- Versioned cloud metadata and deliberate cross-device transfer of drafts.
- Recovery/export for drafts beyond the current size bounds.
- Tests with actual microphones, screen readers and switch hardware.
- Separating the growing authoring and persistence code into maintained modules while preserving the current loading contract.
