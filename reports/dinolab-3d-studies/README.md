# Dino Lab: anatomical study views

2026-09-12 · Local implementation.

The 3D viewer now has **Head**, **Body**, and **Tail** study buttons beneath the canvas. Each frames that anatomical region so its existing surface details are easier to inspect. **Whole animal**, **Fit whole animal**, or the **Home** key returns to the full reconstruction.

Front, side, and overhead viewpoints keep the selected study region. Framing adapts to the species and screen aspect ratio, including portrait phones. Study selection persists across life/fossil layer changes and resets when choosing another species. Selecting an evidence anchor takes priority over a manual study; the active button and camera readout reflect that change.

The four study buttons remain on one row on mobile. They have keyboard access, pressed-state labels, and the existing live camera announcements. Camera studies do not alter saved observations or evidence data.

## Visual review

| Detail | Captures |
| --- | --- |
| Anchiornis crest and face | [Head](anchiornis-head.png), [overhead](anchiornis-head-overhead.png), [mobile controls](anchiornis-mobile-studies.png), [fossil head](anchiornis-fossil-head.png) |
| Sinosauropteryx color regions | [Head](sinosauropteryx-head.png), [tail](sinosauropteryx-tail.png) |
| Microraptor plumage | [Head](microraptor-head.png), [tail](microraptor-tail.png) |
| Large heads | [T. rex](tyrannosaurus-head.png), [Triceratops frill and horns](triceratops-head.png), [Brachiosaurus](brachiosaurus-head.png) |
| Previous whole-animal framing | [Anchiornis](../dinolab-3d-shadows/anchiornis-life.png), [T. rex](../dinolab-3d-shadows/tyrannosaurus-life.png) |

The view is centered on the selected region. Nearby anatomy remains visible when it lies within the camera view.

## Validation

- **113 distinct focused tests passed across four files:** [six study-bounds tests](study-results.txt), [92 snapshot and geometry checks](regression-results.txt), and 15 accessibility checks. The [initial accessibility run](accessibility-results.txt) passed 14 checks; its outdated camera-source assertion was updated and [passed the targeted recheck](accessibility-passed-results.txt).
- **10 distinct browser scenarios passed**, including the existing field-guide workflows. See [browser results](browser-results.txt) and the [final scan-priority recheck](scan-results.txt).
- All head, body, and tail framing boxes stayed inside the camera view for the six tested species. Source syntax, scoped whitespace, and byte parity across all three renderer copies passed. See [validation details](validation.json).

Six new bounds tests cover inherited regions, attached crest and tail features, transformed meshes, fossil bones, and exclusion of overlays or unrelated anatomy. Browser tests exercise all three regions for six species, head-study magnification, camera angles, mobile reflow, life/fossil switching, Home reset, species switching, saved-data preservation, and evidence-target priority.

The camera fits a conservative region box derived from model geometry and anatomical seed bounds. These bounds are display choices, not anatomical measurements. No new scientific claims or assets are introduced.

One snapshot update hit a filesystem write error. Its two layout changes were applied through a replacement file and checked with a normal passing snapshot run. The final snapshot diff adds only the study-controls row. Camera-source assertions were updated for regional framing, Home reset, and portable line endings. Oversized failure-log excerpts omit echoed renderer source while preserving the failure and result summary.

All rendering uses the local Three.js r128 build and Chromium with software WebGL. Hardware performance was not benchmarked.

No deployment or push was performed.

## Reproduce the focused checks

```powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_studies.test.js --maxWorkers=1 --testTimeout=60000
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_accessibility.test.js --maxWorkers=1 --testTimeout=60000
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-studies.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-studies/acceptance
```
