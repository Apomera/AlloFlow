# Perception Lab: repeat with one change

Updated October 3, 2026. Changes are left uncommitted.

Complete saved studies now offer **Plan one-setting repeat**. Choose one surrounding setting and a different value, then start three new matches. The new study keeps the baseline's fixed reference and its actual three starting positions, including valid nonstandard historical starts.

Planning leaves the current drawing, notebook, and pinned view unchanged. Starting opens the chosen experiment, clears the new study's impression and note, keeps drawing values hidden, and locks its surroundings during collection. Each new match carries its reused starting value in the existing notebook metadata and JSON export. Ordinary three-match studies retain their existing behavior and data shape.

After the third match, the tool ends the collection block and opens the baseline and new study together for review. Each study retains its own reveal state. The comparison shows their separate matches, ranges, medians, and changed setting after both are revealed. A revealed baseline stays revealed; a hidden baseline stays hidden.

## Meaningful setting choices

- Brightness supports background difference, visibility of surroundings, and surrounding order. The gray reference is excluded from the planner.
- Circle matching supports surrounding radius, gap, visibility, and order. Line matching supports fin angle, fin length, visibility, and order.
- When the baseline hides its surroundings, the planner permits making them visible. Inactive parameter and order choices are explained and disabled.
- Swapping identical brightness backgrounds is disabled because it has no visible effect.
- An unchanged, out-of-range, or unsupported value cannot start a study. Only the selected setting changes; the other settings remain fixed.

## Reliability and notebook space

Before starting, the tool checks that adding three observations under the notebook's newest-24 limit will retain all three baseline records. If the baseline would be evicted, the planner explains that other observations need to be removed first. It does not silently reorder saved records.

The latest start updater checks the selected plan, its revision, the current notebook, and the baseline fingerprint. Deleting or replacing the baseline, changing profile, choosing another baseline, editing the plan, or canceling a queued start prevents an outdated action from creating a study. Revealing the baseline alone does not invalidate an otherwise unchanged plan. Source records remain checked during collection, and ending a partial study leaves recorded matches in the notebook.

The plan is transient. Recorded starting values use the existing observation schema, so review and export remain compatible with earlier notebooks.

## Layout and verification

The planner uses labeled native selects and a range control with a readable baseline-setting label. Keyboard focus moves to the setting when the planner opens, back to its opener when canceled, to the comparison slider on start, and to saved-study review on completion. Two fields sit side by side on larger screens and stack on phones.

See [validation.json](validation.json) for current-source test counts, browser results, hashes, translation parity, discovery, and integration checks. The earlier test-runner failures and the stale comparison feedback expectation are retained separately from the final evidence.

The new guided suite passed 38 tests. The six existing Perception files passed all 203 tests, giving 241 unique current-source tests across seven files. The guided Chromium suite passed 25 groups; the existing comparison suite passed 23 groups again against the same source. Five viewport widths, 44-pixel controls, dark and high-contrast themes, Windows forced-color palettes, and 200% text passed WCAG-tagged axe audits and reflow checks. Phone and theme panels were visually reviewed.

The ordinary repeated-study browser suite stopped twice at `download.saveAs` with a canceled SVG transfer. Two standalone SVG Blob probes without product code reproduced the cancellation, including one with an explicit writable download folder. That suite's unfinished remainder is not counted as passing. The [browser regression evidence](browser-regression-results.json) preserves both attempts and probes and verifies that the adapted regression harnesses changed only their report output directories. The existing repeated-study unit and component tests passed in the 203-test regression run.

The root and desktop sources are identical, and all 279 Perception English entries are synchronized. Metadata, routing, loader, and catalog checks are recorded in the validation evidence.

## Previews

- [Planner on a phone](guided-planner-panel-390.png)
- [Dark-theme planner](guided-dark-panel.png)
- [Windows dark forced-color palette](guided-forced-dark-panel.png)
- [200% text](guided-large-text.png)

Two three-match studies describe a small set of observations. Keeping one setting, the reference, and starting positions controlled helps comparison; it does not establish a general causal effect or a calibrated display measurement.

Implementation: `stem_lab/stem_tool_perception.js` and its desktop mirror. New verification: `tests/perception_lab_guided_study.test.js` and `dev-tools/perception_lab_guided_qa.cjs`.
