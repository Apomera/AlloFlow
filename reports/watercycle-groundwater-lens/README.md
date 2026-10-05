# Groundwater lens

The current enhancement is **uncommitted**, as requested. Main, public and frozen tested runtime share SHA256 `3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d` (3,058,809 bytes).

## Learning and interaction

Land and groundwater Check investigations now share a native disclosure with three views: soil water and air, the water-table boundary, and saturated connected pores. HTML labels, hatching and outlines keep materials readable. An optional unscored question distinguishes infiltration from evidence of recharge. Explorer and Check store their choices separately; Check answers bind the complete normalized question identity.

The unconfined schematic includes a capillary fringe above the water table, where pores can be nearly or fully saturated. [USGS groundwater facts](https://pubs.usgs.gov/circ/circ1186/html/gen_facts.html), [USGS water-table publication](https://www.usgs.gov/publications/water-table). Upper soil contains air and water; infiltration alone does not establish recharge amount or timing. [USGS unsaturated-zone overview](https://water.usgs.gov/ogw/unsaturated.html), [USGS groundwater definitions](https://water.usgs.gov/outreach/Posters/groundwater/middle_school/Page2.html).

## Verification

- 49 focused tests and 152 regressions passed: 201 distinct identities across 10 files; zero failed, pending or todo tests.
- 511 browser assertion instances (511 unique labels), 230 native actions, and 14 context/display combinations measured in two phases. These are separate evidence counts.
- 28 scoped axe audits found **zero automated violations**. They retained 28 incomplete rule entries containing 86 nodes. All 86 nodes have exact-target manual contrast/geometry evidence and remain in the raw report.
- Minimum sampled HTML text contrast 6.29:1; required graphic cues 3.05:1; legend cues 4.36:1. All 56 keyboard explanation headings have at least 3 px outlines and 5.76:1 contrast. Measured native target heights are at least 44 px. Patterned gradients and forced-color alternatives are checked through their visible cues.
- Runtime, test and frozen-fixture bytes were pinned before each process, captured during actual native reads and checked after completion. Baseline browser closed 2026-10-02T12:05:59.292Z; candidate closed 2026-10-02T13:16:42.477Z; focused tests began 2026-10-02T13:21:13.490Z. QA used `setContent` and created no HTTP server.

The protected baseline is [the committed Steward runtime](../watercycle-steward-history/browser-tested-runtime.js) (`ed26499bf0435d1c613eb7d619e2537bc66ae06798382090ddb262cb20d6a29a`). Independent extraction preserves **61 exact code bodies** plus **two reviewed visual exceptions** across 63 anchors, and both original quiz/myth scoring and reward statement sets. Formulas, route handling, physical-time traces and the full 3D engine are protected. Exceptions are the marked decorative 2D pore paint and the single Check renderer adapter. Journey and Cloud regression guards now validate these narrow exceptions; their other extractions and existing assertions remain intact.

One mounted paused 2D canvas retained its context, public hooks and parcel progress while lens choices changed. Recorded native clips paint partial liquid beside air above the illustrative water table. One mounted paused 3D scene retained its renderer, scene, camera, context and four public hooks. Actual types/kinds are recorded. OrbitControls and individual geometry/material resources were not enumerated; full 3D source preservation is checked separately.

## Saved evidence

- [Manifest](artifact-summary.json), [saved-evidence verifier](verify.cjs), [verification result](verification-summary.json).
- [Final browser report](browser-results.json), [baseline report](baseline-results.json), [owned browser closures](browser-resource-closures.json), [frozen tested harness](browser-tested-harness.cjs), [tested candidate](browser-tested-runtime.js).
- [Focused results](unit-results.json), [regressions](regression-results.json), [focused loaded bytes](unit-loaded-runtime.json), [regression loaded bytes](regression-loaded-runtime.json), [preview byte check](preview-check.json).

All 21 baseline and 54 candidate PNGs have exact hashes, byte lengths and dimensions in the manifest. The 21 corresponding captures use the same Land card, Check pore region or 2D canvas, authored route fixture and display context. The Check region now contains a native disclosure. Additional details show pore views, open questions, feedback and paused 3D. The table shows representative comparisons; the manifest lists all pairs.

| Region | Before | Candidate |
| --- | --- | --- |
| land-phone320 | [Before](baseline-land-phone320.png) | [Candidate](browser-land-phone320.png) |
| check-phone320 | [Before](baseline-check-phone320.png) | [Candidate](browser-check-phone320.png) |
| canvas-phone320 | [Before](baseline-canvas-phone320.png) | [Candidate](browser-canvas-phone320.png) |
| land-desktop | [Before](baseline-land-desktop.png) | [Candidate](browser-land-desktop.png) |
| check-desktop | [Before](baseline-check-desktop.png) | [Candidate](browser-check-desktop.png) |
| canvas-desktop | [Before](baseline-canvas-desktop.png) | [Candidate](browser-canvas-desktop.png) |
| land-dark | [Before](baseline-land-dark.png) | [Candidate](browser-land-dark.png) |
| check-dark | [Before](baseline-check-dark.png) | [Candidate](browser-check-dark.png) |
| canvas-dark | [Before](baseline-canvas-dark.png) | [Candidate](browser-canvas-dark.png) |
| land-forced-dark | [Before](baseline-land-forced-dark.png) | [Candidate](browser-land-forced-dark.png) |
| check-forced-dark | [Before](baseline-check-forced-dark.png) | [Candidate](browser-check-forced-dark.png) |
| canvas-forced-dark | [Before](baseline-canvas-forced-dark.png) | [Candidate](browser-canvas-forced-dark.png) |

Phone details: [soil water and air](browser-explorer-soil-phone320.png), [water table](browser-explorer-boundary-phone320.png), [Check feedback](browser-check-feedback-phone320.png). Native views: [retained 2D canvas](browser-canvas-retained-desktop.png), [paused 3D canvas](browser-paused3d-canvas-desktop.png).

Run from the repository root:

    node reports/watercycle-groundwater-lens/verify.cjs

The verifier reads saved evidence only and launches no browser or test suite. QA library inputs are pinned for reproduction; actual loaded-byte proof covers runtime, test and frozen-fixture files. The focused helper receipt includes byte lengths and timestamps. The legacy Cloud helper receipt records hashes; the independent native read audit supplies regression byte lengths and timing. Preliminary runs, diagnostics and logs are excluded. [Live preview](http://127.0.0.1:8770/).
