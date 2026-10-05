# Bridge Lab: inspect the recorded maxima

October 4, 2026. Changes remain uncommitted.

## Student experience

The comparison timeline now shows where notebook reference A and current experiment B reach their largest recorded magnitudes. A circular marker and a diamond marker place these maxima on the signed curves. Matching cards identify the trial, magnitude, units and recorded time. Students can inspect either maximum to read both trials at that exact shared time.

Markers use fixed CSS sizes and readable labels over the responsive history plot. Circles and diamonds keep their shape on phones and wide screens. Labels sit outward from each pair of peak times with clearance at the plot edges. Real-browser bounds checks cover nearby, reversed and identical peak times on both screen widths. Tiny shaking inputs retain scientific notation in the comparison header as well as the numerical results.

Relative motion, absolute deck acceleration and stored energy use the same comparison measure selected above the chart. This reveals that the two trials and the different measures can reach their maxima at different times. Markers and full histories stay fixed while inspection moves the cursor. Exact underlying times are retained; visible comparison timestamps use three decimal places.

The shortcuts pause playback and vehicle driving, then focus and scroll to the existing keyboard-accessible timeline. They preserve inputs, camera, scene source/selection, saved records, writing and the pinned interval. Notebook reference A remains independent of a guided or captured scene reference.

These are maxima in the recorded 60 Hz history. Full-event maxima use the smaller 240 Hz integration steps and may be larger. The cards state this distinction and the buttons say recorded maximum. If exact largest magnitudes tie, the first recorded occurrence is shown. Signed plotted coordinates remain separate from the positive magnitudes displayed in the cards.

Zero histories show an explanation, omit peak markers and disable their shortcuts. Small nonzero responses retain scientific notation in the cards and paired frame readings. The comparison chart now scales nonzero A/B responses to their actual common full-event maximum, with a denominator fallback only when both responses are zero. Amplitude-scaled small trials therefore keep their visible curve shape; unequal trials still share a truthful scale.

The existing energy map and notebook evidence guide update at the inspected time. No new record format, writing field or automatically generated claim is introduced. The simulation retains its assumed elastic vibration model and existing model scope.

## Verification

- 219 checks passed across the complete immersive interaction, seismic model and seismic inertia suites. This includes all 163 immersive interactions and four new peak workflows.
- Fifteen real-WebGL workflows passed: three new peak workflows plus twelve evidence-guide, accounting, route and paired-interval regressions.
- After the final marker and input-caption refinements, all four peak interaction checks and the three peak browser workflows passed again. Final captures use this source.
- Direct numerical checks passed across 144 input combinations: 432 recorded maxima, 111 negative signed markers, 108 zero histories, 108 amplitude comparisons and 216 unequal A/B scale comparisons. These checks also cover units, exact ties, curve coordinates and same-time recorded sampling.
- Source parsed; canonical/public mirrors identical; 1,238 literal English fallbacks verified in both registries. The model result records the final source hash.
- Desktop, 320 px phone, small-value and graphics-fallback captures inspected; browser overflow and JavaScript-error checks passed.
- Independent read-only reviews covered model/source/time attribution, units, ties, signed markers, zero handling, wording, focus and preservation of the scene and investigation.
- Scoped whitespace checks passed. No staging or commits.

The initial sandboxed browser launch pointed to an empty cache and could not start Chromium. The successful runs used the existing installed browser; the first launch report is retained in browser-environment-failure.json.

Run numerical verification: node reports/bridgelab-recorded-maxima-2026-10-04/verify-recorded-maxima.cjs

Run report verification: node reports/bridgelab-recorded-maxima-2026-10-04/verify.cjs

- [Desktop recorded maxima](bridge-1000-recorded-maxima.png)
- [Phone recorded maxima](bridge-320-recorded-maxima.png)
- [Desktop small responses](bridge-1000-small-recorded-maxima.png)
- [Phone small responses](bridge-320-small-recorded-maxima.png)
- [Graphics fallback](bridge-844-fallback-recorded-maxima.png)
