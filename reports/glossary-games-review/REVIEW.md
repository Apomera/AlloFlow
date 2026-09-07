Reviewed every activity launched from the Glossary game menu—Word Search, Memory, Matching, Crossword, Bingo generator/caller, Play Bingo, and Word Scramble—plus Syntax Scramble. Implemented focused fixes in the existing design and preserved the pre-existing Concept Sort changes.

| Activity | Findings and changes |
|---|---|
| Memory | Cancel pending match/mismatch timers on restart and unmount so an old pair cannot alter the new deck. Reset score feedback. Handle absent/invalid glossary rows and use pictures when definitions are missing. Show an actionable empty state. |
| Matching | Replace term-based identifiers with unique pair identifiers. Accept either valid definition when visible term labels are identical. Clean up mouse/touch drag listeners on reset, cancellation and unmount. Prevent repeated checks, fix the printed score denominator, name the progress bar, and improve phone column spacing and definition readability. |
| Crossword | Clear stale boards and scores when data becomes empty or unsupported; prevent empty-board completion bonuses. Preserve IME composition and prevent navigation keys from scrolling the page. Crop unused outer grid space, keep cells at their intended size, support rectangular-board navigation, and scroll the selected square into view. Revealing still earns no credit. |
| Word Search | Preserve grapheme clusters and combining marks instead of splitting Unicode characters into code units. Support short CJK words, skip unavailable target-language translations, and use matching right-to-left grid, keyboard and answer-key orientation. Stop an old highlight timer from clearing a newly started selection. Handle absent data and unsuccessful placement. |
| Bingo generator/caller | Filter invalid rows when generating cards/call queues. Invalidate delayed audio work when the caller closes or unmounts, ignore stale audio events, stop autoplay after the final clue, and preserve translated definitions containing additional colons. Stack caller panels and wrap controls on phones. |
| Play Bingo | Guard malformed rows; remove a stale win banner when a winning line is unmarked, without awarding completion a second time. Replace the large opaque marker with a small check badge so vocabulary stays readable. Wrap long words within their squares. |
| Word Scramble | Lock correct rounds against repeat submissions, hints and skips during the advance delay. Cancel stale timers on new data, replay and unmount. Respect IME Enter input, add visible answer feedback, and make long content scroll within the phone viewport. Respect reduced motion at completion. |
| Syntax Scramble | Award a 40-point increment per sentence rather than repeatedly awarding the cumulative total. Remove the ASCII-capital filter, use sentence/word segmentation, keep trailing unpunctuated text, and support scripts without spaces. Guarantee an initially changed word order, wait for all tiles before checking, label word actions, preserve keyboard focus, show recoverable feedback and an empty state, and prevent callback changes from resetting progress or repeating completion. |
| Shared review/build | Show full terms and definitions instead of truncating learning feedback. Synchronize the desktop game source along with generated bundles. Use atomic game artifact replacement so files held open by Windows do not leave stale copies. |

Validation: **221 tests passed across 19 files**, including **31 new regression cases**. Rebuilt the game, glossary view, text utility and pure helper modules; verified root/desktop bundle equality and the game source mirror. The earlier Concept Sort work remains intact.

Chromium validation used the application's React, Tailwind configuration, app styles and English translation catalog. Checked seven game components at 1280 × 900 and 390 × 844, plus caller and marked-card states, Syntax keyboard focus, dark/high-contrast Syntax screens, and nonoverlapping Crossword cells. No uncaught page errors or page-width overflow were recorded. Word Search generation was tested directly; its full host view was covered by existing interaction contracts rather than this standalone browser fixture.

The browser fixture uses local sample content and mocked host callbacks. Live TTS services, physical touch hardware and printer output were not exercised; delayed audio cancellation is covered by runtime tests. These changes are saved locally and have not been published.

Optional next improvements, rather than defects required for this pass:

- Offer a smaller Bingo board when a glossary has few terms; current 5 × 5 cards intentionally repeat vocabulary.
- Offer a clearly labeled alternative-order mode for Syntax Scramble. Current scoring reconstructs the source sentence; other grammatical arrangements can differ from it.
- Localize newly added fallback instructions through the project's translation workflow.

Screenshots and reproducible checks:

- [Phone Syntax Scramble](SyntaxScramble-390.png)
- [Phone Word Scramble](WordScrambleGame-390.png)
- [Phone Matching](MatchingGame-390.png)
- [Phone Crossword](CrosswordGame-390.png)
- [Phone Bingo caller](BingoCaller-390.png)
- [Readable marked Bingo](BingoMarked-390.png)
- [Dark Syntax Scramble](SyntaxScramble-theme-dark.png)
- [Browser measurements](browser-results.json)

Run the focused behavioral suite with `npx vitest run tests/glossary_games_review_runtime.test.js --maxWorkers=1`. Recreate the visual checks with `node dev-tools/check_glossary_games_review.cjs`.

