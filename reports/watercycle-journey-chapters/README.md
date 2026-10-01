# Water cycle journey chapters

Journey chapters now let learners inspect water state, latent heat, drivers and time without moving the tracked parcel. Six chapter buttons open a readable diagram; the land chapter distinguishes route choice, surface runoff, soil infiltration, aquifer flow, plant uptake and transpiration.

The selected diagram and current parcel have separate labels. Follow current parcel restores the diagram to the tracked state. Chapter choices preserve animation and replay progress, climate and land settings, saved evidence and writing, counters and rewards.

The plant route cue says Liquid enters roots, keeping liquid uptake distinct from evaporation at leaves.

Live replay labels name the actual parcel state. Replay completion describes the illustrated return. Route counts describe choices because they increment when a route is chosen.

## Validation

- **353 distinct passing tests across 14 files:** 47 chapter/control tests in 2 files and 306 regression tests in 12 files. No failed, skipped or pending tests.
- **72 unchanged AST anchors and 2 unchanged first-answer score blocks** against the frozen baseline. Complete comparison and signal derivations also match.
- **1658 browser checks, 136 recorded cases, 108 native actions and 14 scoped axe audits.** All browser checks passed and axe reported zero violations. The owned browser and temporary server closed.
- Accessibility audit coverage is limited to the Journey targets recorded in the browser report. Axe recorded 15 incomplete audit items, preserved in the report for manual review.
- Separate counter contrast checks record 252 measurements of computed colors with a minimum of 4.80:1. They account for ancestor opacity and resolved CSS gradient endpoints.
- Checks of the main water symbols and flow arrow record 213 measurements with a minimum of 5.91:1 against composited card endpoints. Internal shape opacity is outside this measurement.
- Browser preservation checks measure retained canvas/context, engine and camera hooks, parcel progress and DOM references. They do not inspect private renderer objects.
- Syntax, scoped whitespace, local links and exact source, mirror, frozen baseline, test, report and PNG hashes are checked by the standalone verifier.

Browser configurations recorded: light-320, light-390, light-768, light-1280, dark-1280, light-forced-320, dark-forced-1280, light-1280-host390, 3D-light-1280.

## Evidence

- [Browser review summary](final-browser-summary.json)
- [Native browser results](results.json)
- [Chapter/control test results](unit-results.json)
- [Regression test results](regression-results.json)
- [Artifact hashes](artifact-summary.json)
- [Verification results](verification-summary.json)
- [Standalone verifier](verify.cjs)
- [Frozen baseline metadata](baseline-freeze.json)
- [Baseline browser audit](baseline-results.json)
- [Baseline audit script](baseline-audit.cjs)
- [Final preflight](preflight.json)
- [unit verification before](unit-verification-before.json)
- [unit verification after](unit-verification-after.json)
- [regression verification before](regression-verification-before.json)
- [regression verification after](regression-verification-after.json)
- [preview check](preview-check.json)

## Matched captures

| View | Before | After |
|---|---|---|
| Paused aquifer on a phone | [Baseline](baseline-paused-aquifer-light-320.png) | [Chapters](final-paused-aquifer-light-320.png) |
| Paused aquifer on desktop | [Baseline](baseline-paused-aquifer-light-1280.png) | [Chapters](final-paused-aquifer-light-1280.png) |
| Paused aquifer in a narrow host | [Baseline](baseline-paused-aquifer-light-1280-host390.png) | [Chapters](final-paused-aquifer-light-1280-host390.png) |

## Final captures

- [final paused aquifer light 320](final-paused-aquifer-light-320.png)
- [final land light 320](final-land-light-320.png)
- [final idle light 320](final-idle-light-320.png)
- [final replay light 320](final-replay-light-320.png)
- [final complete light 320](final-complete-light-320.png)
- [final ground choice light 320](final-ground-choice-light-320.png)
- [final plant cloud again light 320](final-plant-cloud-again-light-320.png)
- [final plant rain again light 320](final-plant-rain-again-light-320.png)
- [final invalid persisted chapter light 320](final-invalid-persisted-chapter-light-320.png)
- [final paused aquifer light 390](final-paused-aquifer-light-390.png)
- [final land light 390](final-land-light-390.png)
- [final idle light 390](final-idle-light-390.png)
- [final paused aquifer light 768](final-paused-aquifer-light-768.png)
- [final land light 768](final-land-light-768.png)
- [final idle light 768](final-idle-light-768.png)
- [final paused aquifer light 1280](final-paused-aquifer-light-1280.png)
- [final land light 1280](final-land-light-1280.png)
- [final idle light 1280](final-idle-light-1280.png)
- [final paused aquifer dark 1280](final-paused-aquifer-dark-1280.png)
- [final land dark 1280](final-land-dark-1280.png)
- [final idle dark 1280](final-idle-dark-1280.png)
- [final ground choice dark 1280](final-ground-choice-dark-1280.png)
- [final paused aquifer light forced 320](final-paused-aquifer-light-forced-320.png)
- [final land light forced 320](final-land-light-forced-320.png)
- [final idle light forced 320](final-idle-light-forced-320.png)
- [final ground choice light forced 320](final-ground-choice-light-forced-320.png)
- [final paused aquifer dark forced 1280](final-paused-aquifer-dark-forced-1280.png)
- [final land dark forced 1280](final-land-dark-forced-1280.png)
- [final idle dark forced 1280](final-idle-dark-forced-1280.png)
- [final ground choice dark forced 1280](final-ground-choice-dark-forced-1280.png)
- [final paused aquifer light 1280 host390](final-paused-aquifer-light-1280-host390.png)
- [final land light 1280 host390](final-land-light-1280-host390.png)
- [final idle light 1280 host390](final-idle-light-1280-host390.png)
- [final 3D paused aquifer light 1280](final-3D-paused-aquifer-light-1280.png)
- [final land 3D light 1280](final-land-3D-light-1280.png)
- [final 3D follow light 1280](final-3D-follow-light-1280.png)

## Scope and reproduction

Condensation is scoped to liquid droplets; direct vapor-to-ice deposition is identified separately. Groundwater and plant uptake remain liquid transfers. These diagrams are not to scale, their time descriptions are qualitative, and they do not measure water volumes or predict a real parcel.

Only the final browser run and final unit/regression runs contribute to the pass totals above. Earlier diagnostic files are kept locally and excluded from the committed artifact inventory.

From the repository root, run:

```powershell
node reports/watercycle-journey-chapters/verify.cjs
```

Final source and desktop mirror SHA-256: `a0b86ac156e3045c52448226e518ed1ad4acd2b104c491d56efc7c1272b3579c`.

Frozen baseline SHA-256: `8e43450261e9faff3de64bdd8d4778ac0495f19a75c1fbe48a91ed66d6279dbb`.
