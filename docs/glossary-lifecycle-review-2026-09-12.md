# Glossary lifecycle and usability review — 2026-09-12

## Corrections

- Image generation, image refinement, and word-root generation now track the originating glossary and a stable entry ID. Results merge into the latest version of that resource, including its history entry, without selecting it again. Reordering and duplicate terms are safe; deleted entries/resources or conflicting text/image edits reject obsolete results. Replacement requests supersede earlier ones.
- Add Term and Quick Add capture their destination before generating. They preserve concurrent edits and newer input drafts, accept Unicode terms, and do not resurrect deleted glossaries. Overlapping requests cannot clear each other's busy indicator. Returning to a glossary restores indicators for requests still running there.
- Shared generation callbacks retain display ownership only while the user remains in the originating workflow. Resource selection or view navigation revokes that ownership immediately, including within a queued React batch; completed generation can still be saved to history.
- Glossary audio preparation, saved-clip lookup, regeneration, and dictionary recordings are scoped to the active content. Navigation or relevant text changes abort or ignore stale work and stop owned playback. Flashcard navigation/focus timers are canceled when the resource changes. A shorter deck clamps its index safely, and a new glossary starts with fresh practice state.
- Health-check scheduling survives image-only and history updates, reads the current source text, and rejects obsolete results. Both the initial timer and spoken follow-up are canceled on navigation, including opening History while retaining the same loaded resource.

## Presentation

- Edit/Done is a direct toolbar toggle. Adding terms, changing image styles, generating/refining/removing term images, and generating word roots are available in Edit mode. Existing reading, listening, practice, export, and display-size functions remain available.
- More tools groups additional utilities independently of Edit mode.
- The glossary table has a named keyboard-focusable region and visible focus. On phones, definitions and translations stack below each word; desktop and print keep the table columns.
- The existing larger images, term-first definition narration, image reuse, and saved size preferences are retained.

## Editing follow-up — 2026-10-13

- Word and image deletions offer Undo for the latest ten deletions in the current glossary. The recovery control has no time limit and can be dismissed. Leaving the glossary or teacher mode clears it. Undo restores the removed data without rolling back later edits, and it refuses to replace a newer image. Deletion cancels pending work for the removed content so restoring it cannot revive an obsolete request.
- Search and vocabulary filters show an immediate matching/total word count. A polite announcement follows after typing pauses; Clear filters resets both filters and returns keyboard focus to search.
- The header checkbox shows partial selection across the whole glossary. Its description explicitly includes words hidden by filters; an empty glossary disables the checkbox.
- Undo requires the updated HostHandlers bundle as well as the updated GlossaryView bundle. Older hosts that return no deletion receipt keep their existing deletion behavior without displaying a nonfunctional Undo control.

## Audio workflow follow-up — 2026-10-13

- Audio review starts collapsed and follows the glossary search and filters. Closed review does not inspect every clip, and each visible row retains its original entry identity for audio actions.
- Clip badges distinguish Not prepared, Ready, Needs update, Audio unavailable, and No text. Translation controls name their language, and Listen changes to Stop for the playing clip.
- More tools now says Prepare audio and explains that recordings are saved and reused. Its scope options fit small screens, and partial completion reports ready/total counts instead of a success message.
- Individual and bulk preparation can be canceled. Completed clips are retained, late completions cannot overwrite a canceled or newer operation, and overlapping preparation jobs are prevented. Clip cancellation remains available when review is collapsed or its active word is filtered out; keyboard focus returns to the review toggle.
- Regression coverage includes audio status, scope, partial results, cancellation, stale completions, disclosure/filter behavior, and focus. Browser measurements and screenshots use mocked providers and are saved in reports/glossary-audio-ux-2026-10-13/.
- Validation: 129 focused tests across 11 suites passed across the main run and targeted reruns after updating obsolete label/selectors in existing tests. Chromium verified 18 layout/state combinations at 320px, 390px, and 1280px without page errors or horizontal overflow. Final GlossaryView SHA-256 prefix is `426c5d12`; the public mirror and all three shell loader pins match. No production deployment or live Canvas export verification was performed in this follow-up.

## Editing controls and flashcard follow-up — 2026-10-13

- Add-term and image-instruction inputs ignore Enter while text composition is active, held Enter, empty input, and pending work. Image editing has stable-width inputs, 44px targets, visible focus, and action names that identify the word. Definition and translation fields identify their word and language.
- Health-check suggestions show which word is being added, prevent duplicate requests, and announce completion or retryable failure. Failed additions remain available; failure to fetch another suggestion does not undo or misreport a successful addition. Feedback is scoped to the current glossary, view, and teacher role.
- Standard flashcards preserve all translated definition text after the first colon, both on the card and in narration. Retry rounds announce their current position and size instead of positions from the full deck.
- Validation: 111 tests across nine suites passed, including 15 new editing-control cases and three flashcard regressions. Log: reports/glossary-edit-controls-tests.log. The GlossaryView bundle and public mirror share SHA-256 prefix `12871512`; all three shell loader pins were updated. Provider calls in tests are mocked; no production deployment was performed.
- Browser validation: 12 editing states/layouts at 320px, 390px, and 1280px passed with no horizontal overflow or page errors. Chromium also checked full translated definition display/narration and retry-round announcements. Visually reviewed screenshots and measurements: reports/glossary-edit-controls-2026-10-13/.

## Verification

- Regression tests cover resource switching, duplicate terms, reordering/deletion, overlapping requests, conflicting edits, Unicode Quick Add, preserved drafts, queued React updates, late audio, dictionary playback cleanup, health-check timing, and Edit-mode visibility.
- Chromium checks cover 12 glossary/concept-sort combinations at 1280px, 390px, and 320px, including direct Edit toggling and access to export/image-size controls. No page overflow or browser errors were reported. Screenshots and measurements are in reports/glossary-lifecycle-2026-09-12/.
- Final test log: reports/glossary-lifecycle-tests.log. Desktop shell build log: reports/glossary-lifecycle-shell-build.log.
- Generated glossary modules match their desktop/public copies. The canonical shell mirror is synchronized and the generated desktop App.jsx parses successfully.
- Delayed provider mocks exercise race conditions without paid AI calls. No production deployment was performed.
