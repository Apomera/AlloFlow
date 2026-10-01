# Recorded forces: clearer balance and motion explanations

The recorded-moment inspector now shows how gravity and air drag combine into net force, and how that force determines acceleration. Students can compare signed force components, directions, and magnitudes while keeping the original flight selected.

## Changes

- Add three force cards for gravity, air drag, and net force. Each has a proportional vector diagram, horizontal and vertical components, explicit newton units, and a magnitude. The diagrams use one common scale, with different line patterns and readable labels.
- Put the signed vertical force balance directly beneath the motion-phase readings. Explain rising, zero vertical velocity, falling, and arrival before contact using the captured drag setting.
- Show the recorded mass in the acceleration calculation. Changing next-launch controls preserves the inspected flight's original mass, gravity, velocity, and drag model.
- Preserve tiny signed drag components by calculating them directly from recorded velocity. Scientific notation retains small nonzero readings in both visible measurements and screen-reader descriptions.
- Explain zero forces and arrows too short to see clearly. Normalize force components before drawing so even a minimum positive force produces finite coordinates without changing vector proportions.
- Label the canvas gravity arrow with its acceleration units. Keep the native force disclosure operable with Enter and Space, and provide all diagram information in semantic text and description lists.
- Stack force cards on phones, support default, dark, and contrast themes, synchronize the desktop source, register 29 physics strings, and include the new browser cases in physics CI.

## Verification

- **Unit tests: 321 tests passed across 18 files.** The 27 new force-component cases cover component sums, net force divided by captured mass, drag magnitude and power, tiny-force cancellation, vacuum, apex, horizontal release, terminal balance, impact, zero forces, immutable snapshots, and finite guards.
- **Focused browser checks: 43 tests passed across eight files.** Five new force cases cover real-flight phases, shared vector geometry, historical evidence and full CSV preservation, tiny and minimum positive values, zero gravity, native keyboard disclosure, and nine theme/width layouts. Existing inspection, apex, history, graph, energy, contrast, and canvas-layout cases passed.
- The initial canvas-layout run hit a context teardown timeout with a transient GPU error; its isolated rerun passed. The extreme-value case caught two remaining fixed-decimal force readings in the screen-reader description. They were corrected and the force suite was rerun. The updated extreme-value case also checks the visibility note for a short arrow in a normal paused launch. A unit rerun encountered the existing whole-directory OneDrive scan timeout and fork worker-start failures; the final complete unit run used one thread worker.
- **Visual audit: 11 configurations passed with 22 PNGs.** Two baseline captures at 1100 and 320 px precede nine final combinations of default, dark, and contrast themes at 1100, 375, and 320 px.
- **Recorded evidence: 22 actual flights, 99 selections, and 121 complete CSV checks.** Every configuration records both a vacuum flight and a drag flight. Full body state, every original point, captured settings, apex metadata, run log, and last-flight results match the pinned baseline exactly. Every CSV row retains its original numerical values.
- The visual audit derives forces independently from recorded velocity, mass, gravity, and the fixed drag coefficient. It verifies signed readings, shared-scale arrow endpoints, linked sample markers, phase explanations, disclosure keyboard focus, text contrast, touch dimensions, and overflow.
- Source, mirror, auditor, styles, harness, and the complete physics catalog namespace remained unchanged throughout capture. The report records all requested translation keys and dependency hashes. No browser page errors, page overflow, inspector overflow, or force-card clipping were found.

The visual measurements cover the recorded inspector and its open force disclosure. Tiny-force accuracy and minimum positive values are covered by the dedicated unit and browser cases; the normal-flight visual audit covers the recorded vacuum and drag regressions.

| Theme | Viewport | Minimum text | Minimum text contrast | Minimum target dimensions | Page overflow |
| --- | ---: | ---: | ---: | ---: | ---: |
| default | 1100 | 12.00 px | 5.20:1 | 86.70 × 44.00 px | 0 px |
| default | 375 | 12.00 px | 5.20:1 | 111.70 × 44.00 px | 0 px |
| default | 320 | 12.00 px | 5.20:1 | 109.50 × 44.00 px | 0 px |
| dark | 1100 | 12.00 px | 6.37:1 | 86.70 × 44.00 px | 0 px |
| dark | 375 | 12.00 px | 6.37:1 | 111.70 × 44.00 px | 0 px |
| dark | 320 | 12.00 px | 6.37:1 | 97.50 × 44.00 px | 0 px |
| contrast | 1100 | 12.00 px | 15.30:1 | 88.70 × 44.00 px | 0 px |
| contrast | 375 | 12.00 px | 15.30:1 | 113.70 × 44.00 px | 0 px |
| contrast | 320 | 12.00 px | 15.30:1 | 107.50 × 44.00 px | 0 px |

Final measured text is at least 12 px. Text contrast is at least 4.5:1 in default and dark themes and 7:1 in the contrast theme. Measured controls are at least 44 px in both dimensions. The three force cards share a row on desktop and stack on phones.

## Screenshots and evidence

| Theme | Width | Phase | Forces |
| --- | ---: | --- | --- |
| default | 1100 px | [Motion explanation](forces-final-default-1100-phase.png) | [Force balance](forces-final-default-1100-balance.png) |
| default | 375 px | [Motion explanation](forces-final-default-375-phase.png) | [Force balance](forces-final-default-375-balance.png) |
| default | 320 px | [Motion explanation](forces-final-default-320-phase.png) | [Force balance](forces-final-default-320-balance.png) |
| dark | 1100 px | [Motion explanation](forces-final-dark-1100-phase.png) | [Force balance](forces-final-dark-1100-balance.png) |
| dark | 375 px | [Motion explanation](forces-final-dark-375-phase.png) | [Force balance](forces-final-dark-375-balance.png) |
| dark | 320 px | [Motion explanation](forces-final-dark-320-phase.png) | [Force balance](forces-final-dark-320-balance.png) |
| contrast | 1100 px | [Motion explanation](forces-final-contrast-1100-phase.png) | [Force balance](forces-final-contrast-1100-balance.png) |
| contrast | 375 px | [Motion explanation](forces-final-contrast-375-phase.png) | [Force balance](forces-final-contrast-375-balance.png) |
| contrast | 320 px | [Motion explanation](forces-final-contrast-320-phase.png) | [Force balance](forces-final-contrast-320-balance.png) |

- Baseline: [desktop phase](forces-baseline-default-1100-phase.png), [desktop forces](forces-baseline-default-1100-balance.png), [phone phase](forces-baseline-default-320-phase.png), [phone forces](forces-baseline-default-320-balance.png).
- [Structured visual measurements and recorded-evidence hashes](forces-results.json).
- [Reproducible visual and recorded-evidence audit](verify-forces.cjs).

## Source provenance

- Baseline commit: `ea35209b29700c899e55d2db1b6fabc88bca6a95`.
- Baseline source SHA-256: `15f24f1deac8988eb79cc35b19bd490efb88ea2333510f63093450fe72356151`.
- Final source and desktop mirror SHA-256: `ca53195582386f1cf660068f1298ea4b7ba3bfd7225357a66ad062dc3c166904`.
- Auditor SHA-256: `71ecb371e9698d6c5b8f2ff8d987863cfcf495b028ed252c7eb224b2d31f78d9`.

Baseline and final pages use the same frozen fixture dependencies. The audit records their hashes before execution and verifies them again when it finishes. The complete captured physics catalog namespace is included in the structured results.

## Reproduce

Run from the repository root, with browser validation and visual capture sequentially:

```powershell
npx vitest run tests/physics_ --maxWorkers=1 --pool=threads
npx playwright test tests/e2e/physics-force-clarity.spec.ts tests/e2e/physics-sample-inspection.spec.ts tests/e2e/physics-apex-inspection.spec.ts tests/e2e/physics-flight-history.spec.ts tests/e2e/physics-graph-landmarks.spec.ts tests/e2e/physics-energy-visuals.spec.ts tests/e2e/75-physics-theme-contrast.spec.ts tests/e2e/physics-visual-layout.spec.ts --workers=1 --retries=0
$env:PHYSICS_EXPECT_SOURCE_SHA256='ca53195582386f1cf660068f1298ea4b7ba3bfd7225357a66ad062dc3c166904'
node reports/physics-force-clarity-2026-09-30/verify-forces.cjs
```

The physics CI workflow also runs the existing browser suites and the complete numerical contracts.
