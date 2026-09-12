# Dino Lab: fuller feather surfaces

2026-09-12 · Local implementation.

Wing feathers now spread in the plane of their limb instead of sharing a fixed world-up orientation. Long overlapping vanes and shorter coverts give the wings a fuller silhouette, with smooth forearm surfaces underneath. Feather roots are seated on the actual limb mesh.

Tail fans, paired fronds and Microraptor's terminal feathers attach to the actual tail surface and follow its motion. A shared procedural barb texture follows each vane's own coordinates, and feather pigments use the same sRGB-to-linear conversion as the body palette. Texture allocation is limited to reconstructions with vaned feathers.

The profile lookup now recognizes the catalog's Paraves label, restoring Anchiornis's existing forewing and hind-wing feather settings. Its wing palette uses monochrome markings instead of the warm crest accent.

Existing species evidence and reconstruction-mode eligibility determine where feathers appear. This pass changes the procedural visuals; it does not add new claims about preserved coloration or flight.

## Visual review

| Study | Capture |
| --- | --- |
| Microraptor before | [Previous wing strips](../dinolab-3d-attachments/microraptor-life.png) |
| Microraptor after | [Whole animal](microraptor-life.png), [wing close-up](microraptor-wing-study.png), [side](microraptor-side.png), [overhead](microraptor-overhead.png), [mobile](microraptor-mobile.png) |
| Archaeopteryx wing and tail frond | [Life view](archaeopteryx-life.png) |
| Caudipteryx tail fan | [Whole animal](caudipteryx-life.png), [overhead](caudipteryx-overhead.png), [side](caudipteryx-side.png), [mobile](caudipteryx-mobile.png) |
| Anchiornis forewing and hind-wing feathers | [Life view](anchiornis-life.png) |
| Filament coat remains without wing vanes | [Sinosauropteryx](sinosauropteryx-life.png) |
| Smooth forearm surfaces without plumage | [T. rex](tyrannosaurus-life.png) |

The wing close-up uses a study camera in the test harness; its on-screen camera readout retains the underlying whole-animal setting.

## Validation

- **149 distinct focused tests passed** across seven suites after targeted corrections. The broad run passed 144/145; the updated renderer contract then passed, and the feather suite passed all 14 tests, including four newly added reconstruction-mode cases.
- **Nine distinct browser scenarios passed** across the acceptance run and targeted Anchiornis rechecks: six species, live tail-fan motion, and two catalog/notebook workflows.
- Canonical, public, and existing app-build renderer copies match. Syntax and scoped whitespace checks passed.
- Initial failures exposed the missing Paraves profile match and outdated source assertions for the old forearm/helper signatures. They were corrected and rechecked. The first geometry trial also used a geometry method absent from bundled Three.js r128; the test now uses its supported matrix transform.
- See [validation.json](validation.json), [initial broad test results](unit-results.txt), [feather/profile checks](final-unit-results.txt), [final renderer contract](renderer-contract-results.txt), [browser acceptance](browser-results.txt), and [final Anchiornis check](profile-browser-results.txt). The large source-code diff in the initial unit failure log is omitted.

Browser checks cover six species, actual feather-root offsets, attachment ownership, symmetric row counts, visible projected vane area, opaque life materials, shared feather texture, shader compilation, finite geometry, full framing, mobile reflow, and fossil/life switching. A controlled clock test verifies that a tail fan's world-space roots move with its parent tail while their local attachment points stay fixed. Existing catalog/notebook workflows run alongside the new rendering tests.

Geometry tests cover orthonormal feather frames across three scales and both sides, parallel-axis fallbacks, and zero-length handling. Existing mesh, attachment, accessibility, evidence-data and interaction suites provide regression coverage.

Screenshots use local Three.js r128 and Chromium with software WebGL. Still captures use reduced motion; the live-motion test enables animation. These are procedural teaching reconstructions, and hardware performance was not benchmarked.

No deployment or push was performed.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_attachments.test.js tests/dinolab_3d_plumage.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-plumage.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-plumage/acceptance
~~~
