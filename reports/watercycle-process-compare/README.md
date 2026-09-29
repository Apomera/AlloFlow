# Water Cycle: compare processes

Open **Compare processes** below the process story in Explore. Choose two named processes, consider a water-state or latent-heat question, and check the descriptions side by side. The panel starts folded so the scene stays prominent.

## Learning choices

- Suggested pairs connect evaporation/transpiration, condensation/precipitation, and infiltration/collection. Both selectors support all 30 ordered pairs of distinct processes.
- State diagrams, drivers, and source/destination descriptions provide evidence. Latent-heat details appear after an explicit check.
- Descriptive feedback explains both processes and preserves the learner's choice. It adds no score or completion credit.
- **Explain the connection** retains up to 800 characters for each ordered pair. Changing a pair or question clears old feedback and preserves writing. Changing an answer also clears its checked state.
- The comparison updates its own state and leaves the live parcel, selected scene process, walkthrough, climate, scenario evidence, and stage progress intact.

## Scientific scope

The cards describe canonical named processes using the existing matter/energy trace. Condensation is scoped here to gas becoming liquid. Ice forming directly from vapor is deposition. Falling precipitation moves liquid or solid particles and requires no phase change; those particles can undergo other changes along the way. Root uptake and xylem transport remain liquid before water evaporates from leaves. Soil infiltration can retain water near the surface or lead to onward movement; it does not establish groundwater recharge.

These distinctions were checked against the USGS Water Science School: [condensation](https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle), [precipitation](https://www.usgs.gov/water-science-school/science/precipitation-and-water-cycle), [evapotranspiration](https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle), and [infiltration](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle).

This is a comparison of process descriptions. It does not calculate scene water amounts, rates, or physical travel times. Water may take many routes, and several processes can happen at once.

## Interface and verification

The panel uses the shared paper and teal palette, restrained earth accents for the second card, local SVG diagrams, native radios/selects, and large labeled targets. Desktop cards sit side by side; narrow screens stack them. Feedback has its own status region and keyboard focus target. Dark, high contrast, forced colors, and reduced motion have scoped treatments.

All 105 targeted tests passed: 83 comparison behavioral tests and 22 existing matter/energy, stage-transfer, and host-surface regressions. The comparison tests cover every ordered pair/question combination, canonical descriptions, invalid evidence, restored-state recovery, immutable transitions, feedback resets, independent exported ID lists, and pair-specific writing. See [behavioral results](unit-results.json) and [compatibility results](integration-regressions.json).

The [browser report](results.json) records 569 passing assertions across three runs and 21 axe audits with zero violations. It covers all 60 ordered pair/question cases, descriptive feedback, saved writing, active paused-journey isolation, native keyboard controls, theme contrast, and 320px layout. No runtime errors or unresolved failures remain. Light, dark, and forced-colors captures are included in this directory.

The raw [initial run](initial-results.json) retains two failed checks: a wording predicate that rejected the equivalent phrase "state change," and a hover rule that reduced the keyboard focus outline. The wording predicate now accepts both phrases. The product hover rule preserves the solid 3px keyboard outline. The [first follow-up](followup-results.json) retains two mobile focus probes whose pointer moved off the button after keyboard scrolling. The [final focus run](focus-results.json) positions the pointer over the keyboard-focused button and passes all four theme/viewport states. The aggregate report links each earlier failure to its corrective validation.

The initial functional matrix used source SHA-256 `e5174f8277783e0c99e577f3393324ddb709bf17d692f4ec29b9efa323f05844`. Follow-ups used final source/public SHA-256 `d539315632821ffe00b7048293e9a1f4d5be3da611052cb0f0c1816eb6332005`. The only product change between runs was the focus-preserving hover selector. All three representative captures were refreshed on the final hash.

The [timing report](timing-results.json) records 30 native control handlers at 1.5–77.3ms in the isolated preview. Six complete cases took 439–862ms including scheduled focus and settlement. These are local diagnostic measurements, not field performance metrics. The review used owned isolated servers and browsers, which were closed after each run.

Run node dev-tools/watercycle_process_compare_qa.cjs to repeat the isolated browser review. Run node node_modules/vitest/vitest.mjs run tests/watercycle_process_compare.test.js --maxWorkers=1 --pool=threads for the behavioral suite.
