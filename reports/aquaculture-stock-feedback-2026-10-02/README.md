# Aquaculture stock-feedback enhancement · 2026-10-02

User request: continue enhancement; do not commit. Local, unstaged and uncommitted. No push, deployment or full host build. Previous aquaculture enhancements and unrelated shared work are preserved.

## Changes

- Independent crop biomass, survival index, growth suitability and readiness. Reference temperature/salinity bands slow growth rather than act as lethal thresholds.
- Opening biomass scales stock load, waste, filtration and nutrient uptake; closing biomass carries into the next month. Learner stocking counts remain unchanged.
- Biofilter, phytoplankton and eelgrass remain fixed stocked support, excluded from crop biomass/survival/readiness. Incompatible placements grant no beneficial processing; library thermal/salinity suitability adjusts the allowance.
- Follow individual species in the existing chart, with shared water readings, temperature reference bands and growth stress/progress. Missing B species retain only their A curve and no fabricated delta.
- Readiness accumulates suitable-growth months and persists as target achievement, without harvesting stock. The numeric table distinguishes newly ready units.
- Annual and species CSV carry model version, units and timing. Non-applicable crop survival stays blank.
- New evidence stores version and species outcomes; original legacy summaries remain frozen and reviewable. Replay identifies recalculation and does not claim legacy evidence is saved current-model work. Backups keep their compatible version-1 envelope.

## Model context

Model: 2026.10-stock-feedback. Uncalibrated classroom comparison indices, not farm forecasts. Coefficients and omissions are explained in the interface. Solubility/day-night dynamics, food/light/nutrient limitation, nitrification oxygen use, nitrate accumulation and pH-dependent ammonia toxicity are omitted.

Directional context: [FAO biomass/water balances](https://www.fao.org/4/x5744e/x5744e0g.htm), [FAO mussel growth conditions](https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_bluemussel.htm), [NOAA seaweed seasons](https://www.fisheries.noaa.gov/national/aquaculture/seaweed-aquaculture), [USGS oxygen solubility](https://www.usgs.gov/tools/dotables). These sources do not validate the classroom coefficients.

## Verification

93 distinct focused tests passed across 10 files over completed runs: ecosystem, seasonal explorer, stock feedback, 3D accessibility, evidence recovery, guided questions, investigation, learning, mussel health and pedagogy. The new suite includes 19 cases for fractional/zero stock, incompatible processing, individual physiology, carryover, support applicability, CSV escaping and versioned/legacy evidence.

Run history: one existing seven-metric assertion was updated for the pressure option; two ecosystem setup hooks exceeded 10 seconds. A later threads worker could not start the mussel-health file. In the subsequent default-worker batch, three existing mussel/3D cases exceeded their explicit 15-second limits; all three passed unchanged in isolation. The other seven had already passed. No timeout was edited and no case was permanently skipped.

Final Chromium checks passed at 1280, 390 and 320px: keyboard, shared/species metrics, scheduled events, preview purity, baseline retention, drafts, CSV downloads, saved versions and reload. Three additional 320px cases verify missing B, support-only N/A and frozen legacy replay. All six have zero scoped WCAG2 A/AA and2.1 AA axe findings, zero runtime errors and no horizontal overflow. Forced colors/reduced motion were checked. Root and an independent reviewer inspected desktop/phone and edge-case captures. Shorter options/larger phone labels were checked in the final refresh.

Syntax, LF preservation, exact canonical/public parity and scoped Git whitespace checks pass. SHA256: a7adeda13cabea4fee9384ab32a39c009a27a6a6b364d8c492764f2adf95f28f. Focused tests precede the final two cosmetic label/font changes; the browser refresh verifies final source.

## Reproduce

From the checkout with existing dependencies:

    node reports/aquaculture-stock-feedback-2026-10-02/species-browser-qa.cjs

The harness renders the actual registered tool through the repository fixture, serves localhost only, and writes browser-run artifacts. It requires existing Playwright/axe/React and cached sweep CSS. Run explicit aquaculture Vitest files serially with --maxWorkers=1. Default forks and threads completed recorded batches.

This was not a full application build or production/live-provider check.

## Artifacts

Desktop/phone/320px/forced-colors and edge-case previews, browser-results.json, sample-timeline.csv, sample-species.csv, and portable species-browser-qa.cjs.
