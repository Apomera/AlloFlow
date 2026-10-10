# Water cycle: explore water state changes

Open **Explore water state changes** beside **Compare processes** in Explore. The native disclosure starts closed. Three water-state figures lead into six reversible routes, examples from nature, and an unscored heat-direction prediction. Checking a prediction reveals the direction of latent heat between the surroundings and water. Changing routes or revising a prediction clears old feedback.

Sublimation and deposition skip the liquid state. Water vapor is an invisible gas; dots are a schematic symbol. The diagram describes physical state changes independently of the live parcel and climate. It supplies no water amounts, rates, or temperature thresholds. The scientific descriptions were checked against [NOAA’s six phase changes](https://www.nesdis.noaa.gov/about/k-12-education/understanding-our-planet/water-cycle-board-game), [USGS sublimation and deposition](https://www.usgs.gov/water-science-school/science/sublimation-and-water-cycle), and the [FAA Aviation Weather Handbook](https://www.faa.gov/sites/faa.gov/files/FAA-H-8083-28A_FAA_Web.pdf).

## Verification

- **119 focused tests passed** in three suites, including the new phase-map behavior and unchanged process-comparison and matter/energy regressions. No failures or skips.
- **2288 browser checks passed**, all six routes, native keyboard focus, both heat answers, reverse/reset behavior, reopening and remounting, and malformed restored selections.
- **Eight scoped accessibility audits**, zero violations; ten captures cover folded and unchecked states, light/dark, 320px/390px phones, a 400px host, high contrast, forced colors, and 150% zoom.
- Native interactions preserve the paused parcel, climate/land settings, old comparison writing, saved evidence and awards; the only learner-state addition is wcPhaseChangeMap.
- Four reversible source additions preserve every earlier source byte. The source and public mirror match. Owned QA browser and server closed. Earlier diagnostic runs are excluded.

See [unit receipt](unit/unit-receipt.json), [browser results](browser/results.json), and [source proof](source-proof.json). Native loaded-script hashes, raw results, logs, and captures are preserved.

## Reproduce

Run from the project root:

```text
node reports/watercycle-phase-map/verify.cjs
node reports/watercycle-phase-map/verify.cjs --write-baseline <temporary-baseline-path>
node dev-tools/watercycle_phase_map_qa.cjs --baseline <temporary-baseline-path>
```

The browser harness uses a separate local server and browser. The verifier reconstructs the frozen earlier runtime by reversing the additions. It refuses to overwrite an unrelated baseline file. The unit folder retains the exact tested native runner/config/setup and test inputs.

Final source SHA-256: `906f5470210c266c4c0fd7bebba5874fa081fd53cfbb9ca48bb283fed59a70ef`. Previous source: `ad07af85cc74677dacb388dd27a29b5d874fc498773f6688a62953bccaa42a0a`.
