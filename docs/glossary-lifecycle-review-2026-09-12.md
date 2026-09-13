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
- The glossary table has a named keyboard-focusable scrolling region, visible focus, and a phone-width hint explaining how to reach definitions and translations. The hint is excluded from print.
- The existing larger images, term-first definition narration, image reuse, and saved size preferences are retained.

## Verification

- Regression tests cover resource switching, duplicate terms, reordering/deletion, overlapping requests, conflicting edits, Unicode Quick Add, preserved drafts, queued React updates, late audio, dictionary playback cleanup, health-check timing, and Edit-mode visibility.
- Chromium checks cover 12 glossary/concept-sort combinations at 1280px, 390px, and 320px, including direct Edit toggling and access to export/image-size controls. No page overflow or browser errors were reported. Screenshots and measurements are in reports/glossary-lifecycle-2026-09-12/.
- Final test log: reports/glossary-lifecycle-tests.log. Desktop shell build log: reports/glossary-lifecycle-shell-build.log.
- Generated glossary modules match their desktop/public copies. The canonical shell mirror is synchronized and the generated desktop App.jsx parses successfully.
- Delayed provider mocks exercise race conditions without paid AI calls. No production deployment was performed.
