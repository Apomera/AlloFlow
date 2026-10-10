# Bridge Lab: where stored energy goes after shaking

The damping guide now shows paired energy budgets from **16 s**, when synthetic shaking ends, to the inspected time. Students can compare each trial's starting stored energy with the energy remaining and the energy removed by damping.

## Visual explanation

The existing stored-energy row becomes a figure after 16 s. A and B each show a starting bar and a second bar split into remaining energy and damping loss. Both trials and both bars share one J/kg scale. Blue identifies stored energy; diagonal lines identify damping loss. Exact values, units and a signed numerical balance residual appear beside the bars.

This makes unequal starting energies visible. A trial with more damping need not dissipate more energy during this interval because the trials can have different energy available at 16 s. The guide invites students to compare those amounts before explaining their result.

- Before 16 s, the original instantaneous stored-energy reading remains.
- At 16 s, remaining energy equals the starting amount and interval damping loss is zero.
- At 24 s, the figure says the observation ends; it does not assume all vibration has stopped.
- Tiny nonzero amounts retain scientific notation and proportional lengths. A **Small on this scale** label identifies a nonzero budget that can be hard to see. The scale uses a fallback only when both budgets are exactly zero.
- With zero damping, loss is zero and the numerical residual remains visible.

## Recorded and printed evidence

The figure uses the guide pair's own inputs and shared time. Notebook reference selection, scene selection and a separately pinned interval cannot change its source. Recorded evidence and fresh printed reports reconstruct the budget from the recorded inputs and time, including the original comparison conditions.

The saved format, student writing, modal physics and static bridge analysis are unchanged. The feature adds no graphics resources or animation. Text readings accompany the decorative bars, and the existing 16 s and 24 s buttons work with a keyboard. Printed evidence includes the same amounts without controls.

Stored and remaining energy are recorded instantaneous amounts. Damping loss is the difference of accumulated loss over the interval. Ground input is zero after 16 s, and the displayed residual follows **stored at 16 s − remaining − damping loss**.

## Validation

Results are recorded in `unit-results.json`, `browser-results.json`, `model-invariants.json` and `source-verification.json`. Run `node reports/bridgelab-guide-energy-2026-10-05/verify.cjs` from the project root to check the reports against the source and matching English strings. Run `node reports/bridgelab-guide-energy-2026-10-05/verify-energy-budgets.cjs` to repeat the numerical sweep.

The verifier rejects missing or invalid run-start timestamps. Both source copies and all three unit test files must have modification times no later than the Vitest run start. Both source copies, the browser test file and both English registries must likewise predate the Playwright run start. The output records both run timestamps, input modification times, and SHA-256 hashes of the checked inputs and reports. Inputs and reports are checked again before the verification output is saved. Numerical results must also match the current source hash. These checks protect against ordinary stale successful reports; they are not a security mechanism.

Final validation covers:

- **251 automated checks:** complete immersive interaction, seismic model and inertia suites, including nine new energy-budget checks. The complete run uses one worker and a 4 GB Node heap.
- **14 browser workflows:** three new energy-budget workflows, four existing guided-damping workflows, four claim-interval workflows and three energy-question workflows. Coverage includes keyboard controls, phone layouts, graphics loss/recovery, small/zero amounts, record provenance and print output.
- **144 numerical configurations and 576 primary paired windows**, plus 16 mixed-pair windows and 288 amplitude-comparison windows. The sweep checks exact recorded terms, zero ground input, shared ranges, swapping A/B, finite bar geometry, numerical residuals and quadratic amplitude scaling.
- Identical source copies, valid syntax, matching English text for **1,318 literal keys**, scoped whitespace checks, and 14 new feature captures.

Browser comparisons between the Node oracle and Chromium allow rounding error up to the positive paired-energy scale multiplied by 2e-10. They apply no one-J/kg floor. True zero readings, zero-range fallback, zero-bar absence and saved/printed snapshots remain exact checks; SVG widths are checked against the browser's raw values and shared range.

The initial focused unit run exposed one unsupported fixture that changed reference A away from its prescribed 5% damping. The fixture now tests the supported A5%/B0 setup; the complete final suites include the corrected check. The initial browser run exposed floating-point differences between Node and Chromium at tiny amplitudes. The final browser oracle uses the scale-based tolerance described above.

Changes remain uncommitted.
