# Educator evaluation: SPM / SLO workflow refinement

Reviewed September 8, 2026.

## Changes

SPM / SLO now has a record chooser for the selected educator. Each option includes its creation date, status, version, and goal. Unfinished plans appear before locked plans; explicit shortcuts and an already selected record keep their intended target. Changing educators or removing a record selects a valid record in the current educator's scope. Earlier locked plans remain available for review.

A five-stage guide explains proposal preparation, evaluator review, educator results, rating and lock, and the locked record. It identifies the current owner, explains the returned-plan branch, and shows finalized annual cycles as read-only. The guide follows saved workflow state. It does not advance records or calculate ratings.

SPM plan, review, results, and rating fields now have an explicit accessible name linked to its visible label, so a saved textarea value does not become part of the field name. The progress guide supports keyboard scrolling on narrow screens and uses the existing light, dark, and high-contrast themes.

Draft recovery remains scoped to the educator, role, year, and plan. Browsing a locked plan and returning to an unfinished plan retains refused edits and blocks submission until those edits are resolved. Opening a submitted plan records an evaluator access receipt only for the selected plan.

## Manual and presentation

The [educator manual](../educator-evaluation-manual.html) now explains the chooser, stages, revision branch, keyboard scrolling, and switching plans with refused edits. It includes a new fictional screenshot showing the chooser and returned-plan guide. The [administrator walkthrough](educator_evaluation_pathway_walkthrough.md) includes those steps. Both the educator and school-store manuals were checked for image decoding, packaged-copy parity, section anchors, desktop and phone layout, and dark mode at 160% text size.

## Verification

The [browser review](../reports/educator-spm-refinements-2026-09-08/browser-results.json) exercises the full fictional sequence: select unfinished work and locked history, submit a proposal, return it with a reason, revise and resubmit, review approval, submit results and reflection, enter a rating and rationale, and review the lock. All 11 reviewed views have zero axe violations and no document-width overflow. Some gradient and diagram color checks remain marked for human review by axe; this is not an accessibility certification.

**309 tests across 21 files passed**, including 17 SPM navigation and accessibility cases. Automated evidence is recorded in [verified-tests.json](../reports/educator-spm-refinements-2026-09-08/verified-tests.json); it uses the latest completed result for each file after the startup-affected checks were rerun. Original reports are retained. Coverage includes record ordering and scope, stale selections, refused-edit recovery, all six SPM statuses, accessible field names, local preview restrictions, HTML-looking goal text, existing portal integration, and both manuals.

The generated district portal is current and the packaged app/manual copies match. The new screenshot was visually reviewed on desktop alongside the phone layout.

Reproduce the browser review with `node dev-tools/educator_spm_review.mjs`. [Open the local educator demo](http://127.0.0.1:8768/) to present the changes. This work changes the local app and generated deployment files; no district deployment, real message, or live account/Drive change was performed.
