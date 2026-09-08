# Educator evaluation enhancements and manual refresh

Reviewed September 8, 2026. Changes are available locally in the standalone app, the packaged app, and the generated district portal.

## Educator workflow improvements

The overview previously could show an evaluator-owned formal task while hiding a returned SPM that the educator could act on. It could also open a completed record when the shortcut referred to another unfinished record. Next actions now prefer work owned by the current role and carry the intended record into formal observations, SPM/SLO, and walkthroughs. Annual judgment shortcuts focus the rating composer. Record selection stays scoped to the educator and role.

The evaluator overview now offers search by name, staff code, assignment, building, or evaluator, plus next-step owner and cycle-date filters. Search narrows the attention queue and roster while completion totals continue to describe the full authorized active roster. Clear filters restores the list and search focus. Empty states and matching counts are explicit. Date filters use calendar-day arithmetic, including month and leap-day boundaries, and exclude finalized cycles from overdue work.

Roster status now distinguishes unfinished formal/SPM work from completed records for the same educator. Switching a walkthrough or changing its saved content clears the publication privacy checkbox, requiring a fresh review. Accessible names and region/group semantics were also corrected. Shortcut focus scrolls within the workspace so the standalone header stays in place.

## Updated manuals and presentation support

- [Educator evaluation manual](../educator-evaluation-manual.html): worklist filters, exact-record navigation, educator-owned next actions, SPM proposal/results/lock steps, walkthrough privacy checks, full Drive permission review, and troubleshooting.
- [School store manual](../school-rewards-manual.html): catalog search/sort/filters, available and reserved points, saving goals, cashier review, editable description-to-Sculpt recipes, and the Print Lab handoff/review/quote/collection lifecycle.
- [Administrator pathway walkthrough](educator_evaluation_pathway_walkthrough.md): adds mixed-record, filter, role-priority, and fresh-publication-review demonstration branches.

Six screenshots were captured from the current interfaces with fictional data. Every referenced figure and both HTML manuals are mirrored in the packaged public tree. Existing section anchors remain available. The manuals now wrap long technical text, and the educator setup code and remaining rating table can be focused and scrolled with a keyboard. Both manuals were checked at the reading tool's maximum 160% text size on a 390 px phone viewport.

The Print Lab guidance distinguishes rough material estimates, staff strength review, and comparison of two slicer runs from structural simulation. It does not claim finite-element analysis, automatic hollowing, or topology optimization. Device dictation can enter a description; editable recipe creation still requires a configured provider. A changed design needs fresh print review.

## Verification

- **945 educator tests across 63 files passed**, including the 23 new worklist/navigation/privacy regression cases. The suite also exercises existing role boundaries, published/private projections, workflow transitions, conflicts, recovery, export/share checks, and fictional district-portal integration.
- **45 manual tests across 3 files passed**: content contracts, preserved anchors, figure availability, packaged byte parity, entry links, and reading/print support.
- **11 browser views passed** with zero axe violations and no document-width overflow: evaluator and educator views, actual dark/high-contrast startup themes, both manuals on desktop and phone, and dark-mode manuals at 160% text size. Keyboard filter reset, exact record selection, and setup-code scrolling were exercised.
- Reviewed the new screenshots and responsive manual sections visually. Axe still marks some gradients and diagram colors as requiring human review; these results are not an accessibility certification.
- Generated portal check is current. App/manual packaged copies match their source outputs. Scoped syntax and whitespace checks passed.

Evidence: [validation summary](../reports/educator-evaluation-enhancements-2026-09-08/validation-summary.json), [browser results](../reports/educator-evaluation-enhancements-2026-09-08/browser-results.json), [educator tests](../reports/educator-evaluation-enhancements-2026-09-08/educator-tests.json), and [manual tests](../reports/educator-evaluation-enhancements-2026-09-08/manual-tests.json).

Reproduce the browser/manual checks with `node dev-tools/educator_worklist_manual_review.mjs`. They use an isolated fictional store repository and do not alter the open school-store demo.

## Local demonstration and deployment boundary

[Open the local educator demo](http://127.0.0.1:8768/). Its app and manual routes returned HTTP 200 after the updates. Start it with `npm run demo:educator-evaluation` if needed.

No district deployment, real messages, account changes, or Drive permission changes were performed. The tests use fictional service fixtures. Live district identity, permissions, approved framework configuration, and recovery checks remain part of the existing pilot walkthrough; passing local tests is not a guarantee that every deployment is free of bugs or security issues.
