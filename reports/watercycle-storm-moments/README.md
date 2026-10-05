# Storm moments

The enhancement remains uncommitted. Final native browser checks and tests passed.

## What changed

The Storm lifecycle panel now offers an optional comparison of Developing, Mature, and Weakening snapshots at model positions 16, 52, and 86. Learners can inspect a snapshot, choose one of five ground responses, and practice reading the changes in the two displayed tracks. Stage cards use phase-specific schematic particles, labeled values, and distinct solid and hatched bars. The existing lifecycle controls have larger text and touch targets.

The new inspection choices update only `wcStormMoments` presentation metadata. They do not move the live chamber or change the weather setup, experiments, notes, or scored activities. The existing timeline controls still move the chamber.

## What the comparison means

Each snapshot recomputes the existing kernel for the same normalized weather setup. Weather edits replace all three snapshots; this is not a saved record of earlier settings. Positions describe a schematic sequence rather than elapsed minutes. Falling activity and each ground response use separate qualitative 0–100 indices. Compare changes within a track; the values are not water shares, measured depth, discharge, or hazard forecasts.

The [NWS ordinary-cell lifecycle guide](https://www.weather.gov/spotterguide/life) supports the broad progression from growth through a mature stage to fading lift. The application also models gentle rain and winter precipitation, so its common sequence is not a literal ordinary thunderstorm lifecycle for every setup. The [USGS runoff overview](https://www.usgs.gov/water-science-school/science/runoff-surface-and-overland-water-runoff) explains how infiltration, storage, vegetation, and drainage affect actual surface flow; those processes limit what the existing qualitative ground indices can represent.

The optional interpretation is checked against the displayed rounded values. Zero-response and tied readings are handled explicitly. Lightning cues appear only when the selected snapshot supports lightning. The practice is unscored.

## Saved evidence

The baseline is the previous uncommitted Groundwater lens runtime with SHA-256 `3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d`. Its files and earlier reports remain unchanged.

An independent token comparison confirms that all 352,610 prior JavaScript tokens remain unchanged outside seven presentation boundaries: the new helper, style declaration, local renderer, one lifecycle append call, stage-copy substitution, and two corrected grouping roles.

- 92 focused tests and 122 regressions passed (214 distinct tests).
- 837 final browser checks, 132 native actions, and 16 scoped accessibility audits passed.
- 0 scoped accessibility violations; 0 incomplete targets received exact-node manual resolution.
- 17 final captures and 3 baseline captures are retained. Supporting and diagnostic captures remain separate from final pass counts.
- All 7 owned browser runs closed before the test bundles began. Both test processes closed successfully.

The first preflight exposed heading order and two existing labeled-container ARIA issues. The initial complete matrix then exposed narrow-host layout and forced-dark title contrast issues. Native select focus was retained to allow consecutive keyboard changes. A draft test fixture was corrected to use an invalid schema version, and a new private helper was renamed to preserve existing unique-name guards. Original reports, frozen inputs, screenshots, test recipes, and closure evidence remain separate from final pass counts.

Final source/public/runtime SHA-256: `d68b832b562d75b4f12eddf0638187eabd27ccf92b0f1ddaa787442566b44603` (3088929 bytes). The learner preview serves those same bytes at [127.0.0.1:8770](http://127.0.0.1:8770/).

The saved-evidence verifier launches no browser or test runner. Run `node reports/watercycle-storm-moments/verify.cjs --read-only` to recheck current source, frozen inputs, actual load receipts, captures, and saved results.
