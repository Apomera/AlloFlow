# Guided endpoint investigation - September 19, 2026

The Titrate tab's interactive bench now includes **Find and explain the endpoint**. The first investigation uses the existing 25.0 mL, 0.1 M HCl sample, 0.1 M NaOH titrant, and phenolphthalein. Starting explicitly restores that setup at 0.0 mL while retaining notebook readings and other equipment-practice records.

## Student journey

1. Enter and save a predicted color-change volume before collecting observations. Predictions accept the simulation's 0.1 mL resolution and are not scored.
2. Save the starting 0.0 mL reading through the existing notebook.
3. Add titrant and save observations that bracket the color change within 0.2 mL. Suggested additions become smaller near the change. Students can use the ordinary bench controls and notebook too.
4. Inspect the existing comparison plot for the qualifying saved pair, then continue to the explanation.
5. Write and save a conclusion using the prediction, volumes, pH readings, and distinction between endpoint and equivalence. Completion records submitted work; it does not automatically grade the explanation.

Each stage has an optional hint. A progress strip and evidence panel show the current step, live flask readout, prediction, qualifying reading IDs, and saved interval. Direct controls open the flask, live curve, or notebook; **Return to investigation** brings keyboard focus back to the current stage. The guide works with the 2D diagram, 3D bench, and WebGL failure fallback.

## Evidence and continuity

Only readings newly saved while this investigation is active, after its prediction, and in its supported setup can become evidence. Pre-existing readings and note edits do not silently complete stages. Both guide saves and ordinary notebook saves use the same validation, capacity, and ID allocation helper.

Progress requires a saved starting reading and a pair from the same reaction setup, signal axis, and indicator. The pair crosses the indicator threshold at increasing volumes with a gap no greater than 0.2 mL. Once reviewed, the pair remains selected when further observations are saved. Reused numeric IDs with different values do not replace the original evidence. Clearing the notebook removes the missing evidence from progress and requires new observations.

**Return to free exploration** pauses evidence capture and retains the study. Resuming restores saved progress. A different reaction or indicator pauses the guide; restoring the supported setup returns the live volume to zero while retaining recorded evidence and answers. These are saved simulation observations, so students may deliberately revisit the volume slider to refine their interval. The guide explains this behavior and preserves saved observations.

Prediction, evidence references, reviewed comparison, explanation, and completion are saved in the tool's endpointInvestigation state. Explanation text is capped at 700 characters and saves while typing. Serialized state survives component remounting. An unsubmitted prediction draft and an open hint are temporary UI state. The existing notebook CSV exports notebook readings and notes. A separate [investigation report](titration-investigation-reports-2026-09-19.md) now includes the prediction, reviewed evidence, saved notes, and explanation.

## Chemistry and resolution

The activity separates a stoichiometric equivalence amount from an indicator's observed color-change signal. The content follows the definitions of [equivalence point](https://goldbook.iupac.org/terms/view/09042) and [acid-base indicator](https://goldbook.iupac.org/terms/view/A00075), and the HCl/NaOH example in [OpenStax's acid-base titrations chapter](https://openstax.org/books/chemistry/pages/14-7-acid-base-titrations).

For this existing simulation, 25.0 mL has pH 7.00 and 25.1 mL has displayed pH 10.30. A single available addition can therefore skip the phenolphthalein transition range. The guide accepts a color-change interval, rather than requiring an unreachable in-band reading or presenting 25.1 mL as an exact endpoint. It uses the existing chemistry calculations, indicator rendering, and equivalence value.

## Verification and limits

The new browser fixture completes the activity using actual additions and both notebook save controls. It checks old-record exclusion, invalid prediction handling, focus handoffs, optional hints, editable conclusions, pause/resume, setup recovery, serialized remounting, missing/full notebooks, revisiting volume, stable 3D viewer identity, and context-loss fallback. Its 28 scoped accessibility/layout scans cover 14 states at 1200 and 320 pixels. The existing bench regression adds nine scans at 1200, 360, and 320 pixels.

Normal-mode scans include axe color contrast. The two forced-color scans omit that rule because of axe's forced-color limitation; all other scoped rules and layout/ARIA checks run. The desktop comparison, phone completion, and phone forced-color comparison screenshots were visually reviewed. This is browser emulation, not a physical-device or classroom pilot.

**129 tests across six suites passed across targeted runs, and 37 browser accessibility/layout scans passed.** The unit test results and runner limitations are recorded in the [combined validation record](../reports/chemistry-refinement-2026-09-06/titration-investigation-validation.json). An initial concurrent run had two test timeouts. Those tests passed on rerun; that later run also encountered three worker-startup failures before those files could execute. All 27 tests in those three files passed using the forks pool. No unresolved assertion failures remain; a single clean full-suite run was not obtained.

Both source copies match, syntax and scoped whitespace checks pass, and all 65 new English keys match their fallbacks. Other-language translations remain pending. No dependencies were added and no deployment was performed.

Browser rerun: node reports/chemistry-refinement-2026-09-06/titration-investigation-browser.cjs
