# Evidence draft review

Date: September 19, 2026

## What changed

The evidence coach previously treated note length and English keywords as completed observation, location, and reasoning elements. Unfinished sentence starters plus a confidence rating could therefore produce a green 4-of-4 completion signal. That signal overstated what the tool could determine about a student's explanation.

The panel now reports only observable record state: whether a nonblank draft exists and which confidence level was chosen. Neither status validates scientific reasoning. The automatic completion meter, keyword tests, green completion state, and inferred missing-element advice have been removed.

A collapsible **Review your explanation** guide uses three numbered steps:

1. **Observe:** describe a visible feature, while distinguishing schematic appearance from measurements of real specimens.
2. **Locate:** describe relationships and check directions against the specimen orientation.
3. **Explain:** connect observations to identification, name any reference used, and distinguish reference claims from observations.

A **+ Reference** sentence starter appends to the existing note. The optional countercheck is available before writing and no longer depends on matching English keywords. These helpers preserve existing note text, confidence, observed structures, verified identifications, and assessment scores. They do not generate anatomical answers.

The review sections start collapsed. Status text uses neutral styling and does not become a pass/fail indicator. Numbered guidance, readable line spacing, native disclosure controls, and wrapping status labels support narrow screens and keyboard use.

## Verification

- Two affected Vitest regressions passed: draft-state accuracy (including unfinished starters, whitespace, and non-English text) and confidence/countercheck interactions with report export. The other 89 tests in that file were intentionally outside this focused run.
- Two Chromium scenarios passed: keyboard reference insertion and evidence preservation; 320-pixel mobile review, countercheck before writing, and focus return.
- The mobile evidence panel had no horizontal overflow and zero axe violations for the audited WCAG A/AA tags.
- Desktop and phone screenshots were visually reviewed.
- Source JavaScript syntax, byte-identical canonical/desktop modules, and scoped whitespace checks passed.
- The initial Vitest thread worker timed out before starting tests. Retrying with one fork worker passed. No full-suite pass is claimed for this change.

New copy uses translation keys with English fallbacks. Translation and physical assistive-technology review remain follow-up work. Existing note persistence and assessment logic were retained; this change does not introduce automatic scientific grading.

## Artifacts

- [Focused regressions](evidence-draft-focused-final.log)
- [Browser verification](evidence-draft-browser.log)
- [Desktop draft review](evidence-draft-desktop.png)
- [Phone draft review](evidence-draft-mobile.png)
