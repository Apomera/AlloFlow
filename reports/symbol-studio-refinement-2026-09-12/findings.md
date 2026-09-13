# Symbol Studio refinement review — 12 September 2026

This second pass examined Social Stories, selected Symbol Bank assets, saved boards, and Visual Packs in the actual local Chromium UI at 1440, 390, and 320 pixels. All data is fictional. Model and image calls were stubbed locally; external browser requests were blocked.

## Concrete findings and fixes

| Finding | Reproduction and impact | Result |
| --- | --- | --- |
| Comma-separated aliases cannot be typed normally | Typing `drink, beverage` produced and persisted `drinkbeverage`. Immediate normalization removed the comma while typing. | Alias text remains editable while typing and normalizes when committed; the final browser assertion verifies two aliases after typing and blur. |
| Story print output is blank | Under real print media, the story viewer's visible text was empty. Screen content was hidden and the all-pages block remained `display:none`. | All pages display for print; the story-only print layout releases fixed/overflow constraints, hides the inert host UI, and preserves one story page per printed sheet. The final real PDF has exactly two complete pages, including with a tall constrained host. |
| Replacing a story loses the existing draft when generation fails | Generate a story, then return an invalid replacement response. The old viewer disappears. | Generation retains the existing draft until a valid replacement arrives and supplies progress/error feedback. |
| Story navigation thumbnails cannot be reached by keyboard | Thumbnails were clickable DIV elements without keyboard semantics. | Native buttons now have `Go to story page N` names and current-page state. Previous/Next names are descriptive. |
| Generated story clips at 320px | Fixed creator/image layout produced 18 offscreen workflow descendants. | Creator and viewer stack on phones; image/text card fits the screen. |
| Selected Visual Pack clips on phones | Fixed pack-list width pushed the detail pane out of view: 62 offscreen descendants at 390px and 74 at 320px. | Pack list/details stack on phones; the name input keeps usable width and detail cards fit. |
| Slow Quick Board results can be paired with the wrong label or profile | Start an apple image, change the label to toilet or switch profiles, then finish the original response. Upload decoding had the same association risk. | Requests and uploads are bound to target, label, profile, and lifecycle. Obsolete results/loading are discarded; label edits clear the old image. Newer results win. |

Selected Symbol Bank assets and saved-board panels already fit all three widths in this pass. A selected preview remains visible when a filter has zero matching tiles; that behavior keeps the current inspection available and was not treated as data corruption.

## Validation

The focused regression suite `tests/symbol_studio_quickboard_request_context.test.js` passes 6 tests: changed label, a newer result winning, profile switch, close/reopen, delayed upload, and clearing a completed image after its label changes.

The final browser run covers **18 authoring states** at 1440, 390, and 320 pixels, with **zero runtime errors and zero workflow overflow**. All measured phone controls in these six scenarios meet the 44px comfort target. Committed alias typing, keyboard thumbnail selection, and preservation of the existing story after failed replacement pass.

Printing was verified by producing the actual Chromium PDF, extracting every page with pypdf, rendering both pages with Poppler, and visually inspecting both page images. The two-page story produces exactly two sheets with the correct text on each sheet. A separate nine-state stress run gives the host a 4000px hidden background and a padded, overflow-hidden 5000px container; it also prints exactly two sheets. Before the isolation fix, the tall background introduced three blank sheets.

A separate **six-state board regression run** has zero runtime errors and zero workflow overflow. Loaded boards preserve **four print columns at all three widths**, and tab focus/background isolation still pass. The intentionally scrollable tab strip is excluded from workflow-overflow counts; the board's labelled native color-coding checkbox remains below 44px.

Artifacts:

- [Baseline functional reproduction](baseline/functional.json)
- [Final browser assertions](final/checks.json)
- [Final measurements](final/measurements.json)
- [Corrected story on a phone](final/320-story-generated-scrolled.png)
- [Corrected Visual Pack on a phone](final/320-pack-selected-scrolled.png)
- [Parsed PDF verification](final/pdf-verification.json)
- [Tall-host print assertions](print-host-check/checks.json)
- [Board print and layout regression](board-print-check/checks.json)
- [Reusable local browser harness](browser-refinement.cjs)

## Bounded follow-up opportunities

The Story viewer has no per-page text editor even though its guidance asks teachers to review and edit the draft. A small explicit Edit text / Save action would make that instruction actionable; this feature is deferred from the current fixes.

Completed Quick Board drafts remain shared in the current session across profile switches, matching prior behavior. The new protections cover pending work and edited labels; defining separate saved Quick Board drafts per profile is a further product/state decision. This remains a separate product opportunity rather than a claim of persistent per-profile Quick Board storage.

Desktop authoring controls remain dense and some are below a 44px comfort target. Phone controls in the reviewed corrected workflows meet that target. These measurements are not a complete WCAG audit or a claim that every smaller desktop control violates accessibility criteria.
