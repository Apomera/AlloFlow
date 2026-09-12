# Lesson plan and teaching script review — 2026-09-12

Implemented locally; nothing deployed or pushed.

## Bugs fixed

- **Valid materials could appear empty.** The script reader now understands native sentence frames, outlines, concept-sort cards and math worked examples. Guided notes are selectable. Changes to this content now invalidate a running script's input snapshot.
- **Matching source materials could disappear.** Missing folder/lesson metadata and blank provenance values no longer hide otherwise matching resources. Explicit conflicting scope remains excluded.
- **Lesson edits could overwrite newly saved work.** Field and extension edits merge into the latest saved lesson, preserving teaching script versions and extension guides. The view uses the canonical saved plan.
- **A whole-lesson request could silently accept a segment.** New scripts must match the requested scope. Whole-lesson scripts must cover the saved lesson phases. Existing saved versions remain compatible.
- **Older or incomplete data could crash the views.** Scalar objectives/materials, structured text, and incomplete script/provenance entries now have safe rendering/edit/export behavior. Bilingual text edits preserve the other language fields. Invalid script exports now show an error instead of clearing the clipboard and reporting success.
- **Restored lessons could use another lesson's context.** The header and extension guides use recorded plan metadata. Next-lesson suggestions use the saved plan and its linked source, and stale results cannot attach after navigation, editing or deletion.

## Usability changes

- Saved-script title and duration are visible before opening the panel.
- Existing scripts appear without a long generation form ahead of them; **Create another script** expands the settings.
- Learning goals default to saved objectives.
- Main plan actions have larger touch targets; controls and text fit narrow screens.
- Successful generation keeps keyboard focus visible, and collapsed panels expose generation/error status.
- Missing recorded grade and incomplete saved scripts are explained in place.
- The next-lesson hint uses readable contrast.

## Verification

**324 regression tests passed across 11 test files**, with no failed or skipped tests. Desktop, 375px and 320px browser checks plus the new-script phone form passed with **zero axe violations, horizontal overflow or page errors**. Editing/saving, new-version generation and focus recovery passed. Detailed results are recorded in `regression-results.json` and `ui-browser-results.json`. Browser checks use the real generated view modules and translation catalog with deterministic fixture data at 1280px, 375px and 320px widths.

The browser fixture exercises editing/saving, generating a new version and keyboard focus. Unit/integration tests cover provider dispatch, cancellation, scoped resources, changed/deleted inputs, research failure, native material formats, phase/scope validation, persistence and next-lesson ownership. Generated source/runtime mirrors and the local shell are rebuilt and checked.

Live AI-provider output quality and a production deployment were not tested. The optional research service still depends on external availability; its explicit failure and unresearched fallback remain intact.