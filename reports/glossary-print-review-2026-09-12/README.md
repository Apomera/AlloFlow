# Glossary print and export review

Reviewed locally on September 12, 2026. Changes are implemented in source and rebuilt runtime modules. Nothing was deployed.

## Findings and changes

| Printable | Entry point / export visibility | Review result |
| --- | --- | --- |
| Glossary reference table | Export view: Glossary, Table | Reduced excessive print padding and removed the section containment that pushed the first table onto a new page. Column headings repeat on subsequent pages. |
| Standard flashcards | Glossary: Export standard; Export view: Flash cards | Standalone cards used a fixed 220px height and clipped long definitions/etymologies. They now grow to fit. Cut/fold lines print darker and the fold label sits on the middle line. Export-view cards now print with equal-width halves; the former unequal top and bottom panels did not fold to matching faces. |
| Language cards | Glossary: Export language; Export view: Language cards | Same clipping/folding corrections. Export view retains the option for discovery but disables it with “add translations first” when the glossary has no translations. |
| Word search | Glossary activity: Print puzzle | Replaced copying the live grid HTML with a complete, independent document. Missing Tailwind styles previously turned a 15×15 grid into seven pages. The reviewed fixture now prints one student page and one teacher page on both Letter and A4. Found-word marks are not copied. Answer circles remain visible without background printing. Both grids preserve RTL direction; text is escaped. |
| Crossword | Crossword activity: Print puzzle | Removed fixed-dialog and scroll-container constraints in print, hid the surrounding app, made cell sizing fit the paper, suppressed entered/revealed letters on the student sheet, and neutralized fade animations and theme colors. The long-clue fixture prints grid, clues, then a separate answer key. |
| Matching | Matching activity: newly reachable Print button | The existing print heading had no Print action, and printing the screen could cut off rows or long definitions. A dedicated paper table now includes the current round's terms and shuffled definitions with no game progress. Matching uses its current round of up to eight terms, not every glossary term. |
| Bingo | Bingo generator: Print cards | A fixed outer overlay cut off later cards; narrow cells clipped common vocabulary, and the free square relied on a printed dark background. Cards now flow one per page with wrapping text and black-on-white free squares. Three generated cards produce three complete pages on both paper sizes. |
| Glossary-based cloze worksheet | Export view: Fill in the blanks, when a passage and glossary are present | Existing regression coverage was run. This is a passage adaptation, not a separate glossary game. No changes to its generation were needed. |

The word-search solution grid was also being appended to student glossary exports, including when Teacher key was off. It now appears only in a requested teacher copy and is suppressed in Assessment mode. This was verified for table, flashcard, and language-card export modes.

The export accessibility note now stays together across page breaks.

## Recommended export design

Keep **Glossary reference → Table** as the default. Add an optional **Vocabulary printables** section that teachers can expand when preparing paper materials. Activities should start unchecked; enabling the glossary should not silently generate a packet of games.

Suggested controls:

- Reference format: Table / Study cards / Language cards.
- Add activities: Matching / Word search / Crossword / Bingo.
- Teacher answer keys: separate from student sheets, with an explicit inclusion choice.
- A small page-count estimate and a preview of what was selected.
- Bingo: card count and, eventually, a compact versus large-card layout.

The current implementation still offers the three glossary display formats in export view; it does **not** add puzzle exports. Matching, crossword, word search, and Bingo continue to print from their own activities. This review implements the print repairs and language-option clarification; the larger export UI is a proposal.

| Design option | Strength | Tradeoff |
| --- | --- | --- |
| **Optional activity section — recommended** | Discoverable beside export choices; teachers choose exactly which pages to add. | Requires stable saved activity data so preview refreshes do not reshuffle a puzzle or Bingo set. |
| Vocabulary packet presets | Fast “Study”, “Practice”, and “Class game” bundles, with a visible checklist teachers can edit. | Page counts can grow quickly; presets need clear contents and editable defaults. |
| Keep per-activity printing, add an export shortcut | Smallest UI change; preserves the exact game currently open. | Harder to prepare several activities or distribute one coherent packet. |

For the recommended approach, reuse the same printable renderer for the activity's Print button and export view. Persist the selected puzzle/round or seed, scope settings to its glossary, and preserve learner work when previewing. Paper games should not be exposed as working digital games in an HTML download unless an interactive implementation exists. Memory, Word Scramble, Syntax Scramble, and Definition Detective currently have no dedicated paper export; they should remain digital choices until a useful worksheet counterpart is designed.

## Validation and evidence

- Nine rendering routes, each exported through Chromium to Letter and A4 with background graphics off: Matching, Crossword, Bingo, Word search, two standalone flashcard modes, and three glossary export modes.
- Long definitions, etymology, roots, translated terms, three Bingo cards, and separate answer pages were represented. Final browser metrics report no detected clipped card content and no page errors.
- Desktop (1280px) and phone (390px) checks of the actual glossary display-options JSX verified flashcard selection and language-card enable/disable behavior with and without translations. This fixture isolates those controls; it does not launch the full application.
- **135/135 focused tests passed across nine files**, including nine new behavioral tests for student/teacher separation, Assessment mode, fresh grids, RTL, escaped text, missing solution metadata, and empty card data. All 15 cloze worksheet tests also passed; results are recorded separately in `cloze-tests.json`.
- The broader export-recommendations run passed 35 of 36 tests. Its remaining assertion expects `response = await fetch(absolute` in the source. That string is also absent from the Git HEAD version, and the glossary UI diff does not touch the download code. This unrelated stale assertion was left unchanged.
- Runtime mirrors for `games_module.js`, `export_module.js`, `doc_pipeline_module.js`, and `view_export_preview_module.js` were byte-identical after rebuild. The app shell was regenerated from `AlloFlowANTI.txt`.

Reproduce browser output with `node dev-tools/review_glossary_printables.cjs after`. PDFs and screenshots are diagnostic fixtures under `after/`; baseline artifacts are under `baseline/`. `focused-tests.json`, `cloze-tests.json`, `after/results.json`, and `after/export-options-results.json` contain the machine-readable checks.

Validation used Chromium and synthetic content, not a physical printer or every browser. Very long translations, large image sets, unusual printer margins, and other browsers can still change pagination. The export document's one-inch default margins and accessibility/footer content can add a final page to a long vocabulary packet; a compact packet preset could address that separately.
