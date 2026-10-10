# Land pathway groups

The Land chapter now groups its six inspection choices into Surface water, Soil and groundwater, and Plants. Path choice remains a separate overview. Each group has a decorative icon, a short teaching cue and a visible marker when inspected. The soil cue states that entering soil does not guarantee groundwater recharge. The plants cue distinguishes liquid uptake from vapor leaving leaves.

Three columns use the actual workspace width. Narrow layouts stack the cards; below 190 CSS pixels, icons sit above headings so enlarged text stays inside the card. Selection remains readable in forced colors.

## Scope

Runtime SHA256: 4fec040c2d54a0df8beedfcf0b8dc93ae332dcab37f9a96c18f82a2aafcced37

Baseline: preceding heat actor clarity runtime 12132650ea1f18152ac4bf1e07dfd1c4c9d1c9bc84501276904ada975ad3e244, referenced at ../watercycle-heat-actor-clarity/candidate-runtime.js. The two recorded presentation slices reverse exactly to that baseline. Original chapter drawing helpers, facts, questions, notes, groundwater workspace, journey controls, model and scoring declarations are preserved. The six buttons call the existing inspection controller and retain its heading focus. Follow current parcel keeps the remembered land step.

## Validation

- 104 assertions verified across five complete passing suites.
- 619 passing browser checks, eight bounded captures and fourteen native interactions.
- Desktop, 320px and 390px layouts; light, dark, high contrast, forced colors and 150% CSS zoom.
- Native clicks preserve paused current and replay parcel state, scores and saved learner work. Scientific source/destination SVGs match the preceding baseline. Eight scoped accessibility audits have no violations.
- Runtime, public copy, served preview, loaded browser script, harness and test input hashes recorded before and after. Owned QA browser and HTTP server closed.

The initial zoom capture exposed a clipped heading. The final CSS fix was rerun through the complete browser matrix. Preliminary evidence lives in the task scratch diagnostics directory.

## Verify

Run node reports/watercycle-land-pathway-groups/verify.cjs from the repository to check archived evidence and current runtime, test and harness files. Add --snapshot-only to verify only this frozen evidence after later enhancements. verify-source.cjs --installed separately checks the two installed runtime copies and exact presentation boundaries.

All changes remain uncommitted.

## Regression run detail

All 104 assertions are verified through five complete passing suites from two runs with identical source and test hashes. The first run passed 103 assertions and timed out in one existing matter/energy rendering test at its fixed 15-second deadline. That entire suite passed on the second run. The second run skipped ten groundwater workspace tests after its existing 60-second setup deadline; their complete passing suite comes from the first run. No assertion, timeout or test input was changed. The aggregate is explicitly marked passing-suite-selection, and its verifier compares each entire selected suite with its raw passing result. Both raw runs, including the timeouts and skipped results, remain in unit-runs/.
