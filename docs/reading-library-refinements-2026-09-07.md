# Reading Library support refinements — 2026-09-07

Scope: reading-tool discovery and keyboard/touch access in `reading_library_module.js`, with source-reader and immersive-reader inspection for coverage. No applicable AGENTS.md was found. The main resource reader already has grouped student tools; this pass does not add another tool hub or duplicate an existing reader.

## Implemented

- Reading Library's saved/enabled ruler is visible immediately, centered before pointer movement. The page becomes a named keyboard region while the guide is enabled. Up/Down moves the guide by the rendered text line height; at the lower/upper limit it scrolls the page. Pointer/touch positions the guide without cancelling native scrolling; moving away no longer removes it. Resize handling clamps the band within short viewports. The existing 68px band remains unchanged.
- Aa, Reading tools, Translate, Create and non-AI Export are named support regions with native controls, rather than partial ARIA menus lacking menu keyboard behavior. Opening moves focus into the panel. Escape closes that panel and returns focus to its trigger before a subsequent Escape exits the book. Both existing mouse outside-dismiss and touch/pointer outside-dismiss are supported.
- My words focuses and contains keyboard focus within its modal, closes with Escape and restores its opener. Word-lookup Escape closes the lookup and keeps the focused source word/book available. Page navigation shortcuts pause while these surfaces are open.
- The exact three library-launched immersive dialogs own their Escape/Tab handling; closing returns focus to Reading tools. This fixes the outer library's earlier capture-phase Escape interception without broadly exempting all application dialogs.
- Aa has the accessible name “Reading supports”; the custom translation field has the accessible name “Translation language”.
- The reader's Default font now inherits any valid canonical `window.FONT_OPTIONS` choice, including the app's serif, sans-serif and Andika variant options. An explicit local reader font still wins. The four known local accessibility fonts remain a fallback if the catalog is unavailable; unknown stored IDs never become classes.

The source module is authored JavaScript, so no JSX build is required. Its `desktop/web-app/public` mirror is synchronized. Existing unrelated catalog/illustration improvements in the working tree were preserved.

## Existing support versus genuine coverage gaps

Already available: app text size/spacing/font settings; reading themes; library Aa font/size/line/letter/word spacing; Focus/bionic reader, read-along and story crawl; source-reader definitions/sounds/syllables/POS and passage-selection tools; published bilingual companion editions and AI translation; book section/page/range navigation; saved position/bookmarks; My words and a vocabulary-handout bridge; reader practice and resource generation. Audio lifecycle and the global ruler are separate agents' workstreams.

Remaining recommendations and discovery follow-up:

1. Reuse the existing vocabulary notebook across adapted text and glossary instead of adding a second word bank. Library storage keys are direct device-local localStorage (`allo_reading_lib_pos`, `allo_reading_lib_bookmarks`, `allo_reading_lib_words`); entries are keyed by book slug or word+language, not learner/profile. Decide the learner boundary and migration before cross-resource integration.
2. Bring definition quality into alignment. Library Define currently calls AI with word, language and level, but does not include the surrounding passage in the prompt. `view_simplified_source.jsx` already has a sourced, cached dictionary panel alongside explanations. Reuse that lookup path and context where the book's allowed usage permits it.
3. Completed by the parent agent: the Learning Hub fallback, English description and command hint now describe picture books, longer reads, textbooks and primary sources. Other translations are unchanged. This improves discovery of existing content.
4. Consider optional brief comprehension checkpoints within the existing reading flow, using the current quiz/source-scope bridge rather than another full-screen reader. This is a product recommendation, not a demonstrated implementation defect or an efficacy claim.

## Validation

Runtime tests mount the actual React ReadingLibrary and BookReader; nested launch checks use the actual immersive-reader module. Ruler geometry/resize inputs are deterministic jsdom geometry, not a physical touch-device measurement. The canonical-font test renders every font currently in the real UI font catalog. External font network success and screen-reader speech output were not measured by this suite.

Verified 138 distinct checks: 67 in reading_library.test.js, 55 in reading_library_render.test.js and 16 in reading_library_support_accessibility.test.js. The final aggregate passed the 122 established cases but hit a 5-second timeout in the actual Focus launch test during concurrent app building, followed by a teardown-related failure. The new integration suite now uses the same 30-second allowance as the established render suite; its complete retry passed 16/16 in 6.46 seconds. Source syntax and exact public-mirror parity also passed. Existing jsdom media-pause warnings in the broad render suite are unrelated to these changes.

Key implementation references: readerFontClass at reading_library_module.js:588; inner-panel focus handling at :1782; ruler initialization at :1842 and keyboard behavior at :1865; source lookup prompt at :1896; exact nested-reader delegation at :3566. The new test file covers support panels, ruler behavior, canonical font inheritance and all three launched reader dialogs.
