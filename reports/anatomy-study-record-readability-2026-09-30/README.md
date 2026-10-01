# Anatomy study sheet: readable saved work and import recovery

This enhancement pass is left uncommitted at the user's request.

## Changes

The study sheet now uses larger headings, clear numeric summaries, and distinct cards for saved structure records. Text, controls, badges, and saved writing reach at least 17 px in larger-text mode. Light, dark, and high contrast themes use matching surfaces, borders, and text colors. Structure links align correctly in Arabic; review-date chips wrap, and saved notes and reflections keep their own text direction.

Printing uses black text on white surfaces in every theme, including review badges and saved reflections. This keeps dark-theme text readable when saving the sheet as a PDF.

Importing a JSON record shows the selected filename, a named preview, and a cancel action while reading. A valid file selection moves keyboard focus to the preview heading. Merge moves focus to its result message, while Cancel returns to the file chooser. These actions preserve focus when the learner has already moved elsewhere.

Read completions and import actions check the current read token, revision, and visible sheet before changing state. Older reads and queued actions cannot replace a newer preview or resume after the sheet closes. Parser failures have translated explanations while retaining the existing error messages for callers of the parsing API.

Opening a recorded structure uses the correct collection, view, and minimum learning level. It keeps existing quiz progress and checkpoints the current card round. Filter recovery, opening, closing, and starting review use accepted state before moving focus.

French, Latin American Spanish, and Arabic now include 73 missing study-sheet labels, import messages, recovery explanations, next-step suggestions, and activity headings. The localization audit checks every label referenced by the sheet, including the four filter options and the generated guidance supplied by other helpers.

## Initial audit

| Check | Before this pass |
| --- | --- |
| Larger-text study sheet | Visible text and controls as small as 11 px |
| Import filename | Absent from the preview flow |
| Merge and Cancel | Focus ended on the document body |
| Schema failures | English parser detail after the translated prefix |
| Recorded structure in another diagram | Could reset the current quiz progress |

## Validation

All 604 checks passed in 10 suites, including 72 new behavior checks and 75 localization checks. Results and the final source hash are recorded in [verification.json](verification.json). Functional coverage includes both anatomy copies, connected and detached file inputs, queued actions, out-of-order file reads, fresh notes and practice records, previous saved previews, focus recovery, and recorded-structure navigation. Localization checks cover French, Latin American Spanish, and Arabic in both catalog copies.

The browser journey passed using real JSON file selections. It checks malformed files, previews, cancellation, merging, repeated cumulative practice imports, preserved writing, diagram navigation, card review, and close/open focus. All 15 accessibility scans found zero violations. Visual and accessibility checks cover 320, 390, 768, and 1440 px in three themes, plus Arabic with larger text at 320 px. No horizontal overflow occurred, and all 70 measured larger-text elements reached at least 17 px. Scans are scoped to the study sheet and its opener.

Three print checks passed under Arabic with larger text. Each theme rendered 33 visible text elements in black and 18 paper/card/badge surfaces in white. Print controls were hidden, and saved writing and state stayed unchanged. Detailed browser measurements are in [study-record-browser-validation.json](study-record-browser-validation.json); the initial measurements are in [baseline.json](baseline.json).

## Screens

- [Before: phone with larger text](before-phone.png)
- [Named import preview](import-preview-phone.png)
- [Merged records](merged-work-phone.png)
- [Phone](after-phone.png)
- [Dark theme](after-dark.png)
- [Arabic with larger text](after-arabic.png)
- [Desktop](after-desktop.png)
