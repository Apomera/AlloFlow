# Steward campaign evidence

The campaign inspector lets learners choose one watershed component, one score and one completed year. Readable HTML axes, distinct marker shapes and a table of saved values replace the compressed chart. The inspector is available during yearly review, planning and the final debrief.

An optional investigation traces the recorded stages and asks which has the largest displayed change in either direction. Ties accept either supported answer. Missing or duplicate readings stay unavailable. No missing value becomes zero, and an incomplete or inconsistent stage record cannot establish a largest change.

## Verification

| Evidence | Result |
| --- | --- |
| Final browser run | 750 passed check instances; 750 unique labels; 243 native actions; 189 saved cases; 16 captures |
| Saved reading choices | 180 distinct component/score/year cases: six components × three scores × ten years |
| Focused tests | 47/47 in watercycle_steward_history.test.js |
| Regressions | 40/40: watercycle_cloud_evidence 34, watercycle_steward_decisions 6 |
| Production preservation | 24 exact campaign, model, localization and reward anchors match the committed frozen baseline |
| Preview | Page/runtime HTTP 200; served runtime bytes match the tested source |

The three test files contain 87 distinct passing test identities with no focused/regression overlap, omissions or pending tests. Browser check instances are assertions within the saved run; native actions and uniquely identified test cases are counted separately.

Both isolated Chromium runs closed before the focused tests began. The regression process started after the focused process completed. The browser harness uses setContent and launches no server. See [browser results](browser-results.json), [baseline results](baseline-results.json), [focused test results](unit-results.json), [regressions](regression-results.json), [focused before](unit-verification-before.json), [focused after](unit-verification-after.json), [regression before](regression-verification-before.json) and [regression after](regression-verification-after.json).

The 7 scoped axe audits have zero automated violations and retain 7 incomplete color-contrast rule instances across 70 year-label nodes. Each exact target has manually reviewed text/background contrast, a positive text Range, a font size of at least 12px and an unclipped position inside the inspector. The zero-width positioning anchors prevent axe from finishing those checks automatically. Full target/HTML/any/all/none evidence remains in the browser report.

The 775 saved direct-text contrast readings have a minimum of 6.41:1. Controls meet 44px targets and axis labels remain at least 12px in the seven viewport, narrow-host, dark and forced-color contexts. The region rule is disabled for this component audit.

## Matched captures

| Context | Frozen baseline | Enhanced inspector |
| --- | --- | --- |
| desktop | [Before](baseline-desktop.png) | [After](browser-desktop.png) |
| phone320 | [Before](baseline-phone320.png) | [After](browser-phone320.png) |
| phone390 | [Before](baseline-phone390.png) | [After](browser-phone390.png) |
| dark | [Before](baseline-dark.png) | [After](browser-dark.png) |
| host390 | [Before](baseline-host390.png) | [After](browser-host390.png) |
| forced-phone | [Before](baseline-forced-phone.png) | [After](browser-forced-phone.png) |
| forced-dark | [Before](baseline-forced-dark.png) | [After](browser-forced-dark.png) |

Additional captures: [answered real record](browser-answered-real-record.png) · [answered real record phone320](browser-answered-real-record-phone320.png) · [support year1](browser-support-year1.png) · [connectivity year1](browser-connectivity-year1.png) · [tied record](browser-tied-record.png) · [legacy record](browser-legacy-record.png) · [missing component gap](browser-missing-component-gap.png) · [review one year](browser-review-one-year.png) · [planning one year](browser-planning-one-year.png).

## Evidence and campaign scope

The seeded campaign fixtures are generated from the actual unchanged production handlers: one fixed seed, coordinator difficulty, a dam-removal action each year and ten completed years. Native selections compare saved tables, point positions, marker shapes, line patterns, previous records and signed changes with those fixtures. Point-position checks allow 0.0001 percentage points for CSS serialization. Keyboard selections retain focus. Supported and reconsideration feedback stay unscored.

Inspection preserves the complete campaign state, hours, year, phase, saved log, unrelated outer tool data and rewards. The 24 preserved anchors include components/actions/events/difficulties/feedback rules, RNG/clamp, start/reset/apply/end/continue handlers, coaching/debrief, challenge authoring and reward progress. Baseline and final fixture snapshots are pinned independently of the rendered captures.

Separate derived fixtures deliberately exercise ties, displayed zero, changes below displayed precision, legacy missing stages, missing component/year evidence, duplicate years and feedback identity changes. They are labeled in the browser report; they are not additional campaign outcomes. Unit tests also cover malformed or inherited evidence, full-seed identity and symmetric signed rounding.

Scores and changes are rounded separately to one decimal place. Differences use the saved values before rounding, so subtracting two displayed scores can differ from the displayed change. Feedback is bound to the complete campaign seed, component, metric, year and raw recorded step values. Recorded model steps explain this simulated record; they do not establish outcomes for a real restoration project.

## Limits and reproduction

These checks use isolated Chromium viewport/forced-color emulation. Computed contrast composes text color over ancestor background colors; it does not assess every decorative opacity or gradient. Manual axis review and scoped audits do not replace a full application, assistive-technology or physical-device audit.

The baseline rendered the committed frozen runtime. Its separately observed public-runtime hash is retained in the manifest; a live public-file observation does not change the frozen rendered buffer. Preflight, diagnostic, live-progress and run-log files stay outside the final manifest. Repeated exact baseline copies are capture/reproduction inputs, not distinct behavioral evidence. The authorized learner preview is separate from the closed QA browsers.

Run the saved-artifact verifier; it launches no browser or test suite and resolves inputs relative to the repository:

```sh
node reports/watercycle-steward-history/verify.cjs
```

Final source/public/frozen browser runtime: `ed26499bf0435d1c613eb7d619e2537bc66ae06798382090ddb262cb20d6a29a`.

Committed frozen baseline: `42eae634d0027b819ac0e5368801447780290c3d70e5da15aa402ff84d94314c`.

[Artifact pins](artifact-summary.json) and [verification result](verification-summary.json) bind raw hashes/bytes, PNG dimensions, actual loaded test/runtime reads, closure chronology, manual incomplete-node evidence and independent production preservation. The four mutable report outputs are excluded from their own input pins.
