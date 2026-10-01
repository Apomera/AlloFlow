# Water Cycle: clearer Conditions labs

Weather and ground choices now explain their units and modeled effects where learners adjust them. The Land readings use separate directional illustrations, and both labs stay readable in phone and embedded layouts.

## Visible changes

| Area | Before this pass | Final behavior |
| --- | --- | --- |
| Native sliders | Climate 34px, Land 36px high | 44px targets, thin tracks, distinct thumbs and visible keyboard focus |
| Reset actions | Climate 28px, Land 40px high; both labeled Reset | At least 44px, labeled Reset climate and Reset land |
| Phone choices | Selected Medium/Moderate checkmarks wrapped at 320px | Label and checkmark stay together; choices wrap into roomy rows |
| Ground inputs | Bare 55/45 values; little local scale guidance | Explicit /100 values, honest endpoints, and definitions for all ground choices |
| Climate readings | Relative values could be confused with a saved baseline | Reference sunlight/wind explained separately; exact live evaporation teaching index shown |
| Land results | Primarily distinguished by text and a colored edge | Fixed diagrams show movement over the surface or into soil pores beside the existing scores |
| Presets | Weather chooser also changed folded Land inputs | Selected preset explains its weather-and-land scope |
| Narrow embedded Climate lab | Older viewport rules could squeeze three columns into a narrow panel | Controls and response use the panel's actual width |
| Forced colors | Open/closed cues and some guide strokes needed explicit system colors | Visible system-color disclosure cues, diagram guides, arrows and selected choices |

The result arrows keep the same geometry as conditions change. They show direction, and the separate 0–100 indices do not form a measured water budget. Existing calculations and state handlers remain unchanged. Both labs stay foldable; the richer expanded Land lab is about 1997px tall at 320px.

## Matched visual review

| View | Baseline | Final |
| --- | --- | --- |
| Land, light 320px | [Before](land-default-light-320.png) | [After](land-light-320.png) |
| Climate, light 320px | [Before](climate-default-light-320.png) | [After](climate-light-320.png) |
| Land, light 1280px | [Before](land-default-light-1280.png) | [After](land-light-1280.png) |
| Climate, light 1280px | [Before](climate-default-light-1280.png) | [After](climate-light-1280.png) |

Additional final captures: [Heavy storm and its scope note](climate-light-390-heavy-storm.png), [narrow embedded panel](climate-light-1280-host390.png), [Land in forced colors](land-light-forced-colors-320.png), [Climate with dark mode and forced colors](climate-dark-forced-colors-1280.png).

## Final verification

- **137 distinct tests passed:** 18 focused semantic/accessibility tests and 119 affected regression tests across nine files. No skipped tests.
- **771/771 browser checks passed:** 135 snapshots across light mode at 320/390/768/1280px, dark mode, forced colors, dark with forced colors, a 390px embedded host on a 1280px viewport, and high contrast at 320px.
- **18 scoped axe audits passed** across the two Conditions labs. This review does not audit every mode in the tool.
- Native ranges, all categorical choices, scoped resets, preset behavior, endpoint clearance, touch targets, focus, exact model readings, fixed diagram geometry, and layout were checked.
- The paused infiltrating parcel stayed at progress 0.37. Saved baseline, comparison writing, and valid observation evidence survived the interactions.
- Fifteen existing calculation and state blocks match the frozen baseline exactly after line-ending normalization. Whole source/public files have identical SHA-256 hashes.
- JavaScript syntax, scoped whitespace checks, and the empty staged-file check passed. Owned QA browsers and servers closed. The local preview was restored at the same address and serves the exact final runtime; see [preview status](preview-status.json). All changes remain uncommitted.

Final runtime SHA-256: `239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003`.

Frozen baseline SHA-256: `d43969e8c5824b6f2b94b2b7e29b51ef33a24833495059c79cad6e9551951061`.

Recheck the saved evidence from the repository root:

```sh
node reports/watercycle-conditions-clarity/verify.cjs
```

Reports: [verification summary](verification-summary.json), [browser results](results.json), [focused test results](unit-results.json), [regression results](regression-results.json), [final browser findings](final-browser-findings.md), [baseline findings](baseline-findings.md).

## Method and corrected diagnostics

The baseline and final browser reviews use frozen copies of the actual runtime on owned ephemeral localhost servers in isolated Chromium. The browser reads the existing production model and rendered tool. It does not duplicate the scoring formulas or use learner tabs. The final harness is [watercycle_conditions_clarity_qa.cjs](../../dev-tools/watercycle_conditions_clarity_qa.cjs).

The first full candidate exposed CSS cascade defects: endpoint text stayed at 11px, narrow hosts inherited viewport columns, and dark with forced colors needed explicit system colors. Those defects were corrected, along with the open/closed cues, before the complete final run. [Initial browser results](results-initial.json) and diagnostic captures remain separate from final totals.

The first full-module unit initializer exceeded the default 10-second hook limit before any assertions ran. Its hook now allows 60 seconds on this Windows host. A later test passed 17/18; its single new label assertion omitted the production word “teaching.” The assertion and actual explorer fixture were corrected, then all 18 tests passed. [Timeout diagnostic](unit-hook-timeout.json) and [label diagnostic](unit-label-assertion.json) are preserved and excluded from final counts.
