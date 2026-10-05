# Micro Lab: inspect sampled settings in Growth sweeps

This pass adds visual inspection of individual sampled settings in saved Growth sweeps. The selected sample and its population at hour 24 appear beside a fixed 0–100 arbitrary population scale. Inspection keeps saved sweeps, imported notebook state and next-trial conditions unchanged.

The installed candidate is mirrored and syntax checked at SHA-256 `0cb0eb7b5d68198fb5b9b2935cc6ce3f49a2ac4e7971646446ed885734eb28c4`. Final validation passed: 1,060 Micro Lab unit checks across 28 files and 43 targeted Chromium scenarios across eight specs, with no failed, skipped, flaky or retried cases. All ten visual captures passed manual review.

Current and previous sweeps use separate local React selections, with no persisted inspection field. Readable HTML axes, fixed-size circle/square markers, a selected-sample outline and a vertical guide show all samples at their true numeric positions. The setting selector offers only actual sampled values, and the readout reports the selected setting, population at hour 24 and modeled response. The accessible table highlights the same sample. Temperature, pH and oxygen each keep their fixed teaching range, with sparse axis ticks to avoid crowded labels.

Explicitly preparing a sampled setting now reads the latest raw state and changes only normalized Growth conditions. Imported notes and metadata, saved trials, current and previous sweeps and recovery data remain intact. The same updater serves existing Growth condition controls and preparation shortcuts. Partial imports use the same defaults as the visible controls, so editing one field keeps untouched displayed conditions fixed.

## Validation scope

The Micro Lab unit suite contains 1,060 checks across 28 files. Two existing Growth workflow checks now verify the updated marker representation and state-preserving previous-sweep inspection. One new regression case covers seven incomplete or malformed imported setups, checking displayed defaults, untouched conditions, raw evidence and no XP. The targeted Chromium suite contains 43 scenarios across eight specs: annotation integrity (7), experiment design (6), Growth citations (7), guided resume (5), Growth inspection/export (2), Resistance live visuals (5), Growth visual inspection (5), and the new sweep visual inspection scenarios (6). This is the relevant browser regression scope for this change.

The runners capture 36 test files and ten support inputs, totaling 46 distinct inputs. Both runtime files must match the frozen candidate before and after each run. Final phases are `unit-defaults-final` and `browser-defaults-final`; a rerun uses a fresh phase name and retains previous evidence. The audit checks exact file and case counts, zero failures, skips, flaky scenarios or browser retries, raw runner receipts, all captured input hashes and hashes of the manually reviewed screenshots.

The interface audit checks 1,936 source-used keys, the four new Sweep visual labels, all 2,055 Micro Lab namespace labels, and equality of the canonical/desktop namespaces. Registry patches add only `sweep_visual_inspect`, `sweep_visual_selected`, `sweep_visual_scale`, and `sweep_visual_note` to the immutable parent.

## Visual review

The primary and independent agents manually reviewed all ten screenshots: desktop temperature, pH and oxygen sweeps, the previous saved sweep, temperature/pH/oxygen at 320px, 400% enlargement, forced colors and a selected flat-response square at the left boundary. The final browser run refreshed every capture; byte hashes match the reviewed images. `candidate.json` lists the required PNG names, and `visual-review.json` records matching source/phase details, hashes and concrete observations. No blocking visual issues were found.

## Retained diagnostics

The initial focused browser run stopped all six scenarios on one shared assertion: it expected the endpoint tick's text center at the plot boundary. The labels intentionally face inward to avoid clipping. The corrected assertion checks each endpoint's inward text edge and each interior label's center. This retains exact numeric alignment and rendered single-line checks. Earlier receipts are retained and excluded from the final passing counts.

The refined focused run passed all six scenarios. Screenshot review then prompted extra phone checks for pH and oxygen and a direct selected-square capture. These extend the same six scenarios, with no runtime or model change, and are covered by the final targeted browser run.

The initial full unit run passed 1,057 checks. Two structural assertions still expected SVG rectangles and no selector in the previous-sweep view. They now check square markers at the correct population and a previous-sweep selector that updates exact readouts while keeping both saved curves and the complete raw state unchanged. The refined full unit run passed all 1,059 checks. Earlier failed-run evidence remains available.

The first targeted browser run passed all 43 scenarios. Independent source review then found a default mismatch for partial imported Growth conditions: the updater normalized raw missing fields differently from the visible setup. It now merges the same existing defaults before normalization. The new seven-setup regression case covers this fix. Fresh `unit-defaults-final` and `browser-defaults-final` phases passed all 1,060 unit checks and 43 targeted Chromium scenarios on the corrected candidate. Earlier passing receipts identify their earlier source hash and do not count as final evidence.

## Focused local save

The focused tree continues verified Micro Lab commit `7536623e5687c15d801b42787c8cbeb8c8c356bc` on the preceding Growth chart branch. It owns the canonical/desktop runtime pair, the new six-case sweep visual browser spec, two updated assertions and one new regression case in `tests/microbiology_growth_workflow.test.js`, four Sweep visual labels and this report's artifacts. The intended new local branch is `codex/micro-sweep-visuals-2026-10-04`.

Registry blobs are built from the immutable parent with exactly four labels added. Other working registry changes stay outside this focused tree. Private Git indexes preserve the shared checkout and staging. Runtime, test and report files use exact byte seals. Registry guards seal all 2,055 Micro Lab labels in sorted key order against the immutable tree, allowing unrelated namespace edits and key ordering while every Micro Lab label remains fixed. Publication keeps an intent receipt before updating the new local branch.

After a local save, verification checks the immutable tree, the full sealed Micro Lab namespace, current source-used labels, and the four Sweep visual labels. Unrelated whole-registry hash drift is reported explicitly. Commit identifiers, shared-index preservation and final verification are recorded in local receipts beside this report.
