# Symbol Studio deep review — September 12, 2026

The review found and addressed failures in memory games, learner data recovery, asynchronous generation, AAC speech, and mobile editing. The changes retain the existing Symbol Studio workflows and add focused regression coverage. Source and desktop distribution copies are synchronized. Changes are local; no deployment was performed.

## Findings and changes

| Priority | Problem and impact | Change |
| --- | --- | --- |
| High | Opening Symbol Memory added conditional React hooks and could crash the entire studio. Hiding an already-mounted studio also changed hook order. | Keep hooks unconditional; stop game work when the active section, learner, or visibility changes. |
| High | A full backup included all learner profiles but only the active learner's content. Restore could put that content under the wrong learner. | Version 8 backups retain explicit ownership for each profile's symbols, boards, sequences, packs, goals, familiarity and usage. Legacy backups remain readable. |
| High | A malformed import or full device storage could leave only part of a restore applied. Malformed saved records could crash opening. | Validate before writing, stage the complete import, roll back failed writes, and normalize stored collections. Preserve local data when validation fails. |
| High | Image generation finishing after a learner switch could write into the wrong bank. Stale callbacks could restore deleted symbols or lose concurrent edits. | Guard request ownership across profile/visibility changes, coalesce repeated submissions, merge against current bank state, and ignore stale work. |
| High | Failed saves could display success or discard newly generated content. | Keep generated symbols available for the current session and show an unsaved warning with backup guidance, including after a mounted studio is reopened. |
| High | Phone layouts clipped the main editor behind a fixed sidebar. Board editing controls overlapped. | Add collapsible profile/settings controls, a full-width mobile workspace, stacked symbol authoring, scrolling tab navigation, larger controls and a responsive board editor. Print and AAC board column settings remain unchanged. |
| High | Older AAC speech requests could play after newer taps or after leaving communication mode. | Own the current playback request, suppress late results, stop old audio on context changes, and fall back when playback fails. |
| Medium | Text-only board cells disappeared from AAC/scanning; reopening AAC could append an old session log again. | Include meaningful text cells and reset session logs when starting a new session. |
| Medium | Category quizzes could offer impossible or ambiguous questions; visual variants of the same word could be marked wrong. Old timers could update a different game. | Use eligible distinct-word pools, show usable category names, disable impossible rounds, and cancel stale timers. |
| Medium | Keyboard tabs changed selection without moving focus. Nested dialogs could expose the background or close the whole studio on Escape. | Move focus after tab rendering, add Home/End and tab/panel relationships, isolate dialog backgrounds and contain nested keyboard interaction. |
| Medium | Cloud metadata restore could replace local names and strip page, cell, speech or schedule details. | Preserve local details, validate and stage restoration, and reject stale responses after the active context changes. |
| Medium | A stale dependency prevented cloud autosave from being scheduled after edits. | Debounce saving when the current profiles, symbols, boards or sequences change. |
| Low | A filtered empty Symbol Bank gave misleading feedback without an easy recovery action. | Explain that search/filters produced no matches, expose pressed states and add Clear filters. |

## Validation

**129 tests passed across 17 test files**, including 37 new regressions. The final suite completed with no unhandled errors. Both module copies pass `node --check`, their SHA-256 hashes match, and `git diff --check` passes. Twelve golden snapshots were refreshed for the intentional UI changes.

**18 browser states passed** at 1440, 390 and 320 CSS pixels: no runtime errors or workflow overflow, selected-tab focus works with ArrowRight/Home/End, dialog background isolation and cancel behavior pass, and print emulation retains the fixture board's four columns. The horizontally scrolling tab strip is intentional.

Browser tests use local React and the real module, fictional learner fixtures, stubbed generation/speech and blocked external requests. They do not access production data or invoke paid generation.

Reproduce the unit run:

```powershell
node node_modules/vitest/vitest.mjs run tests/symbol_studio --maxWorkers=1 --testTimeout=30000
```

- [Final unit test output](test-results.txt)
- [Machine-readable browser checks](final/checks.json)

- [Rendered UI findings and baseline/final evidence](browser-findings.md)
- [Reusable local browser harness](browser-review.cjs)
- [Final browser screenshots and measurements](final/measurements.json)
- [Mobile Symbol Bank](final/390-symbols.png)
- [Mobile populated board editor](final/320-board-loaded-scrolled.png)
- [Mobile populated sequence](final/320-schedule-loaded-scrolled.png)

The automated tests cover actual React interactions and focused storage/speech helpers, including late promises, storage quota errors, malformed data, profile changes and dialog teardown. They are stronger evidence for these paths than render snapshots alone. Snapshots are updated only for intentional UI changes.

## Remaining opportunities

1. **Profile-scoped cloud schema.** Existing cloud metadata does not carry complete per-profile ownership. This review makes local restoration safer; a future backend/version migration should round-trip each learner explicitly, with migration tests. Complete local backups are the recovery path verified here.
2. **Persistent drafts and undo.** Boards, social stories and sequences would benefit from a consistent recoverable draft model and undo for deletion/replacement. This should preserve learner ownership and avoid silently treating incomplete work as a saved resource.
3. **Separate authoring and student use.** The settings disclosure improves phones, but teacher controls remain dense. A clearer create/review/use workflow and a consistent secondary-actions menu would reduce scanning effort without moving established AAC cells.
4. **Split the large component gradually.** Symbol Studio remains a very large hand-maintained React component. Extract profile storage, board authoring, symbol generation, games and speech behind the new tests; avoid another broad rewrite before that coverage is in place.
5. **Real-device validation.** Test real screen readers, switch devices, microphone permissions, browser speech voices, offline conditions and actual cloud conflicts. Local deterministic tests do not establish whole-product accessibility conformance or verify external service availability.

The technical review used the repository as its primary evidence. Reference guidance: [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) and [W3C guidance on reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). The mobile check includes 320 CSS-pixel width; the report does not claim a complete WCAG audit.
