# Search within observation review — September 9, 2026

Students can now search their inspected structures across layers by structure name, layer name, or words in their own saved notes.

## Workflow

- Open **Review observations** and use **Search your observations**.
- Every query word must match somewhere in the combined name, layer, and note text. Matching ignores case, punctuation, and diacritic marks through the existing text normalization helper.
- Review filters apply within search results. Their counts update to describe matching observations.
- A note-match cue points students toward **Read saved note** when query words occur in their writing.
- **Clear observation search** clears the query and returns focus to the search box. Escape clears the query while retaining the chosen review filter.
- Search remains in place when opening a note and returning to review. Editing the note updates the matches and export preview.
- Searches that find no matching observations explain how to recover and do not expose an empty export.
- The exported summary names the search query and retains its original filter and inspected-count scope. Search exports include `_search` in the filename.

Search examines only known, inspected structures of the current specimen. It excludes uninspected drafts, other specimens, and reference-function text. Layer locks and observation-credit rules remain in effect. It is separate from the 2D structure-directory search, is not saved as evidence, and clears when changing or resetting specimens. Existing assessment/activity guards also hide it.

## Verification

- Focused reference, discovery, recall, spatial, 3D, review, and export checks: **126 passed**.
- Chromium review/search/export acceptance: **8 passed** without retries, including exact search-filtered download contents, keyboard clearing, evidence preservation, and live results after editing a note.
- The phone review panel had zero automated WCAG A/AA axe violations and no horizontal overflow. The active-search screenshot was visually inspected.
- Syntax, scoped whitespace, and canonical/desktop byte parity checks passed.
- New interface copy is English; physical-device testing and full translations remain follow-up work.

## Artifacts

- [Focused verification](observation-search-focused.log)
- [Browser verification](observation-search-browser.log)
- [Phone search workflow](observation-search-mobile.png)
