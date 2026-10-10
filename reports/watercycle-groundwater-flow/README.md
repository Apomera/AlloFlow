# Water cycle: compare groundwater flow

In Explore, open **Look inside the ground**, choose **Groundwater pores**, then open **Compare groundwater flow**. The child disclosure starts closed and is also available in groundwater Check investigations. Compare left-higher, equal, and right-higher head arrangements. Predict the horizontal direction and check the well evidence. Selecting a different setup or revising an answer clears the previous feedback. Explorer practice stays separate from Check practice; Check choices are bound to the current exact question.

The water levels are schematic head comparisons above one common reference, with nonpumping wells open at the same height in one uniform, connected aquifer. Water has the same density throughout. Higher head drives flow toward lower head. Equal heads show no net horizontal flow driven by a head difference in this simple comparison; real groundwater can also move vertically. These principles were checked against [USGS: Hydraulic Head and Factors Causing Changes in Ground Water Levels](https://pubs.usgs.gov/circ/circ1217/html/boxa.html). The diagrams provide no measurements, rates, recharge calculations, or weather response.

## Verification

- **85 focused tests passed** in three suites: the new groundwater comparison, groundwater-lens regressions, and investigation regressions. Existing behavior assertions are retained; the investigation loader extracts its pure kernel, and bounded VM and test timeouts accommodate this host. No failures or skips.
- **1748 browser checks passed**, including three setups, all nine direction predictions, native keyboard controls, feedback focus, setup and answer reset, malformed saved data, remounting, and Explorer/Check isolation.
- **Eight scoped accessibility audits**, zero violations. Ten captures cover folded and unchecked states, light/dark, 320px and 390px phones, a 400px host, high contrast, forced colors, and 150% zoom.
- Native interactions preserve existing climate, paused journey, quiz outcomes, awards, evidence, and writing. The only learner-state addition is wcGroundwaterFlow; the practice is unscored.
- Five reversible source additions preserve every earlier source byte. Installed source and public mirror match. Owned QA browser and server closed. Earlier diagnostic runs are excluded.

See [unit receipt](unit/unit-receipt.json), [browser results](browser/results.json), and [source proof](source-proof.json). Exact native runner/config, loaded-script stamps, three tested input files, raw results, logs, tested browser harness, and captures are retained. Existing frozen regression dependencies are referenced by hash without copying full runtimes.

## Reproduce

Run from the project root:

```text
node reports/watercycle-groundwater-flow/verify.cjs
node reports/watercycle-groundwater-flow/verify.cjs --write-baseline <temporary-baseline-path>
node dev-tools/watercycle_groundwater_flow_qa.cjs --expected-sha=fbfbcf84e06cf48575ec74cbc8a640abdba0a4cae0db5320d3ce06d660e88daf --baseline=<temporary-baseline-path> --out=<new-evidence-directory>
```

The verifier checks the installed source and reconstructs the frozen previous runtime by removing the five additions. It refuses to overwrite another baseline file. The browser harness uses a separate local server and browser, leaving learner sessions untouched. The native unit runner uses Node with one worker and requires a fresh output label; it loads no shared translation files or DOM setup.

Final source SHA-256: `fbfbcf84e06cf48575ec74cbc8a640abdba0a4cae0db5320d3ce06d660e88daf`. Previous source: `906f5470210c266c4c0fd7bebba5874fa081fd53cfbb9ca48bb283fed59a70ef`.
