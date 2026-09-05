# Guided delivery confirmations - 2026-09-04

Implemented locally. No production deployment or production bundle was created.

## Changes

Document Builder exports previously marked the active Guided lesson as delivered even when the Builder contained unrelated History or a remediated document. Automatic export evidence now requires an explicit selection matching all current Guided-created resource IDs, with the resources still present and at least one exportable item.

An asynchronous export success is checked against the current lesson's source, learning goal, selected IDs, and resource content. A late callback cannot credit a changed lesson or a different Builder selection. Unrelated History changes do not invalidate an otherwise matching export.

Opening the learner preview and saving directions can record their own evidence but no longer automatically complete Package & Deliver. Automatic completion requires an export, share, or live-session outcome. Unknown evidence keys are ignored.

## Validation

- 167 tests passed across eight test files, including 24 new behavioral cases covering lesson matching, missing and unsupported resources, stale callbacks, preview evidence, and delivery completion.
- Development shell build completed; canonical host and both generated host files passed JSX syntax checks and contain the updated callback and stale-result guard.
- Scoped whitespace checks passed.
- Evidence: reports/classroom-review-2026-09-04/delivery-evidence-regression.json and delivery-dev-build.log.

These checks exercise the actual host functions and existing Builder regression coverage. They do not constitute a new full-browser classroom workflow test. Previously saved delivery evidence is not re-audited or migrated by this change. Share and live-session resource selection are outside this patch's scope.
