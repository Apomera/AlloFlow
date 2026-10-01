# Bridge Lab: earthquake investigations and evidence

## What changed

- **Explain the motion.** A synchronized diagram connects the moving ground to a deck mass through a spring and damper. It shows their force directions, relative velocity, and instantaneous damping power. The diagram remains available in 2D and when WebGL fails.
- **Inspect useful moments.** Jump directly to the largest sampled relative motion, largest sampled absolute acceleration, or the end of shaking. Each action pauses playback.
- **Keep earthquake evidence.** Save up to four experiments with a name, prediction, observation, inputs, and inspected time. Restore a saved experiment with motion paused. Saved trials are independent of the static design notebook.
- **Make controlled comparisons.** The first saved trial becomes the comparison reference. The table compares full-event peak displacement and acceleration and lists the changed settings. It flags comparisons where several settings changed.
- **Print the investigation.** The existing portfolio now includes saved earthquake trials, their settings, peak results, energy values at the inspected time, and student writing. Later draft notes remain separate from saved observations.
- **Improve the lessons.** Nine seismic topics and the related site-hazard card now explain mechanisms and limitations. Unsupported percentages, universal acceleration thresholds, historical statistics, and survival guarantees were removed. The lesson links directly to FHWA, USGS, and Caltrans.

## A classroom sequence

1. Enable **Earthquake experiment** in Stress Test.
2. Predict what will happen near the selected mode's natural frequency.
3. Select **Inspect peak motion** and use the spring/damper diagram to explain the force directions.
4. Save a trial. Select **Try 20% damping** and compare the new full-event peaks with the first trial.
5. Record the observation, save a second trial, and open the earthquake evidence report.

The comparison uses the entire 24-second event, regardless of the inspected time. Changing time alone cannot change a peak result.

## Physics and data handling

For relative displacement u, relative velocity v, natural angular frequency ω, and damping ratio ζ:

- Spring force per modal mass is −ω²u (N/kg).
- Viscous damping force per modal mass is −2ζωv (N/kg).
- Their sum equals absolute deck acceleration (m/s²).
- Damping power per modal mass is 2ζωv² (W/kg), which cannot be negative.

The diagram uses the same response sample as the scene and readings. Motion has a fixed display scale within each experiment; forces use their own scale. Neither diagram spacing nor spring length represents physical bridge geometry.

Saved records contain supported model inputs and student text, without storing a full animation or trusting imported result numbers. Results are recalculated and cached for display. Invalid or unsupported records are not interpreted as default experiments; they remain in storage when other records are saved or removed. Text is rendered through React, including in the printable report.

The elastic model and its assumptions remain unchanged. The comparisons do not rank real bridge families or predict damage. See the [previous numerical model notes](../bridgelab-immersive-earthquake-2026-09-28/model-notes.md).

## Primary references

- [FHWA: LRFD Seismic Analysis and Design of Bridges](https://www.fhwa.dot.gov/bridge/seismic/nhi130093.pdf), especially isolation, dissipation, and retrofit mechanisms.
- [USGS: earthquake effects](https://www.usgs.gov/programs/earthquake-hazards/what-are-effects-earthquakes), for ground shaking and soil failure.
- [Caltrans: lessons from Loma Prieta](https://dot.ca.gov/programs/public-affairs/mile-marker/winter-2019-2020/copy-of-loma-prieta), for retrofit history and the limits of seismic performance guarantees.

## Verification

**151 distinct focused checks passed:** 142 unit and interaction checks, one unchanged render snapshot, and eight Chromium browser cases. Browser coverage includes desktop, 390 px immersive views, 320 px investigation workflows, WebGL recovery, and reduced motion. The two new investigation workflows were checked again after the final force-arrow legend was added.

Both Bridge Lab source copies are byte-identical. All 858 literal English fallbacks match both registries, with no missing entries. JavaScript parsing and scoped whitespace checks passed. The mechanism, notebook, and printable evidence screenshots were reviewed at desktop and phone widths.

The initial unit run recorded 32 passing assertions but could not start the evidence-portfolio worker before its timeout. The regression run completed all 20 selected files, including that file, with 125 passing assertions and exit code 0. Counts above exclude repeated assertions and unrelated skipped tests.

Results: [initial unit checks](initial-unit-results.json), [regression checks](regression-unit-results.json), [eight browser cases](browser-results.json), [final notebook workflows](browser-final-results.json), and [source verification](source-verification.json).

To reproduce the source and report verification from the repository root:

    node reports/bridgelab-investigation-2026-09-29/verify.cjs

### Visual previews

- [Desktop mechanism](bridge-1000-mechanism.png) · [320 px mechanism](bridge-320-mechanism.png)
- [Desktop notebook](bridge-1000-notebook.png) · [320 px notebook](bridge-320-notebook.png)
- [Desktop evidence report](bridge-1000-earthquake-report.png) · [320 px evidence report](bridge-320-earthquake-report.png)
