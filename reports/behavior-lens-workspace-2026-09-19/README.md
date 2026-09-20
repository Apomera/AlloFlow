# Behavior Lens workspace enhancement

Implemented locally September 19, 2026. This is the first implementation slice from the [UX review](../behavior-lens-ux-review-2026-09-19/README.md).

## What changed

- **Today is the default workspace.** Recording, target definitions, and reviewing work are grouped into a short daily workflow. The complete 101-tool library remains in All tools. Student/role settings, sample-data configuration, and workspace files use progressive disclosure.
- **Definitions work without AI.** The editor supports a target name, observable definition, measurement choice, examples, and non-examples. Optional AI wording is a suggestion that must be explicitly applied. Late suggestions are invalidated after edits or leaving the editor.
- **Definitions connect to shared targets.** Saving creates or updates a canonical target, preserving existing IDs and aliases. Duplicate names are rejected. Save target and record opens the student's ABC workspace, whose Definitions controls show the same target.
- **Drafts survive interruption.** Definition drafts use the existing per-student durable tool state. Navigation, reload, and student switching retain the correct student's draft. Existing saved definition history remains available for editing.
- **Family selection agrees with role state.** Family Mode and role settings now use one role choice. Daily family actions are home observations, coping choices, review, and family perspectives.
- **Less competing guidance.** Removed duplicate welcome/getting-started surfaces and the hub's competing recommendation panels. Specialist quick launch is scoped to specialist view. The removed welcome banner also removes its phone dismiss hit-area defect.
- **Small correctness and accessibility repairs.** Missing intensity no longer becomes 3 in the library summary. AI analysis commands reveal their result destination. Fixed contrast in the new workspace, definition editor, library status, and category counts. Target cards stack on narrow phones.

The root module and desktop public mirror are byte-identical. No data migration or production deployment was performed. Unrelated workspace changes were left alone.

## Validation

All **229 focused tests across 32 files** passed in completed batches (38 integration + 189 other regression + 2 localization). The localization worker timed out during startup in the combined thread-pool run; its isolated fork-pool retry passed. Two earlier silent combined runs were interrupted and are not counted as passing runs.

- Mounted integration coverage verifies draft recovery across navigation/reload/student switches; manual save and shared target handoff; duplicate-name protection; stable IDs and aliases; family role agreement; and access to the complete library.
- Existing affected integration suites passed: **38 tests across 5 files**, including cloud recovery/conflicts, imports, delayed AI identity, and AlloSheet export.
- The six intentional hub render baselines were reviewed and updated; all **44 golden/contract tests** passed.
- Chromium exercised **12 states**: Today, definition editor, full library, and Family Mode at 1280, 390, and 320px. Each had **zero axe violations, no page errors, and no horizontal overflow**. Browser tests also saved a manual target, verified the same definition in ABC, reopened a draft, and checked student isolation.
- JavaScript syntax and targeted diff formatting checks passed; both deployment copies have matching hashes.

The new synthetic empty-student home has 12 visible buttons and zero tool cards. The tool library still contains all 101 cards. The earlier audit counted 304 rendered buttons across the old initial teacher page; these measurements use different visibility filters, so they are not a strict percentage-reduction benchmark.

## Evidence

- [Desktop workspace](today-1280.png)
- [320px workspace](today-320.png)
- [Phone definition editor](definition-390.png)
- [Browser flow results](flow-results.json)
- [Initial layout checks](browser-results.json)
- [Browser workflow probe](verify-flows.cjs)
- [Mounted workflow tests](../../tests/behavior_lens_workspace_ux.test.js)

The browser fixture uses synthetic students, replacement icons, and stubbed host/AI services. It does not establish production Firebase behavior, live model quality, full application integration, or accessibility conformance for every specialist tool. Existing integration tests use simulated cloud services.

## Remaining product work

Today/All tools is a functional first slice; the proposed four-destination workspace is not fully implemented. Specialist planning, graph, and measurement tools still need broader model unification. The saved measurement choice is target metadata, not an automatic configuration of every recorder. The recording follow-up now opens the ABC form directly from Today and carries a saved target into it; see RECORDING.md. Practitioner review of assessment guidance and usability sessions with teachers/families remain appropriate next steps.
