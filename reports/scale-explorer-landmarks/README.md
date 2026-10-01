# Scale Explorer: landmarks and habitats

## Experience

- Fifteen selectable landmarks across the honeybee, ladybird, T. rex, mitochondrion, red blood cell, and DNA model.
- Selecting a marker or its named button moves the camera toward that feature. Orbiting then keeps the feature at the center of the view. **Fit object** and **Reset camera** return to the whole specimen.
- Markers use each model's local coordinates, including its normalization and rotation. They move with the model during navigation and never change its scientific dimensions.
- The mitochondrion opens for the inner membrane and closes for the outer membrane. Its two views share the same physical dimensions.
- Notes include a primary science source. Named keyboard controls provide the same navigation as the canvas markers. Markers can be hidden; their descriptions remain available.
- Honeybees and ladybirds have a leafy habitat with curved, veined foliage, droplets, contact shadows, and restrained plant movement. The habitat uses a centimetre reference, so the same leaf appears larger beside the smaller insect.
- Reduced motion skips camera interpolation and plant movement. When ambience is paused, a camera movement can still finish and then stop rendering. Phone selections return an offscreen canvas to view.

## Scientific references

The models remain educational illustrations. The notes use these sources:

- Insect body regions, legs, and beetle wing cases: [Natural History Museum teaching resource](https://www.nhm.ac.uk/schools/teaching-resources/key-stage-1/animal-and-human-bodies/parts-of-an-insect.html).
- Wing cases protecting flight wings: [Natural History Museum beetle guide](https://www.nhm.ac.uk/discover/uk-beetles-british-most-spectacular-and-beautiful.html).
- T. rex posture and skeletal reconstruction: [American Museum of Natural History](https://www.amnh.org/exhibitions/permanent/saurischian-dinosaurs/tyrannosaurus-rex).
- Inner mitochondrial membrane folds and ATP production machinery: [National Library of Medicine](https://www.ncbi.nlm.nih.gov/mesh/68051336).
- Flexible red blood cells and oxygen-carrying hemoglobin: [NHLBI](https://www.nhlbi.nih.gov/health/sickle-cell-disease).
- DNA strands and backbones: [NHGRI glossary](https://www.genome.gov/genetics-glossary/Deoxyribonucleic-Acid-DNA). Base pairing: [NHGRI fact sheet](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet).

## Verification

The focused unit suite passed **89 / 89 checks** (`unit-final.json`). This run used a 30-second per-test allowance after five checks exceeded the initial five-second allowance on the shared host. The new landmark browser suite passed **2 / 2 scenarios** without retries in 3.0 minutes.

The existing atlas and inspection suites also passed **5 / 5 scenarios** without retries in 3.9 minutes (`compatibility-results`). That gives **7 passing browser scenarios** on the final implementation, including all catalog destinations, asset fallback, pinch gestures, cutaway controls, and graphics cleanup. Source syntax, desktop parity, and whitespace checks passed.

Run the unit and browser suites sequentially to avoid competing with the software GPU:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
npx vitest run tests/scale_explorer.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=30000 --reporter=json --outputFile=reports/scale-explorer-landmarks/unit-final.json
npx playwright test tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list --output=reports/scale-explorer-landmarks/test-results
```

Landmark browser checks inspect the actual camera direction, unchanged model scale, marker projection after orbit, cutaway geometry visibility, source links, keyboard operation, phone layout, and WebGL context release. Screenshots cover focused specimens, the feature notes, and the phone experience.

[Open the preview at the honeybee](http://127.0.0.1:54391/?tool=scaleExplorer&focus=honeybee&v=landmarks).
