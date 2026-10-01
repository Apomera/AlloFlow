# Scale Explorer: specimen inspection

## Changes

- Rebuilt the honeybee with separate body regions, fine hairs, antennae, jointed legs, pollen baskets, and four translucent, veined wings. Its abdomen uses a generated texture so the bands stay smooth during close inspection.
- Rebuilt the ladybird with a curved red shell, dorsal seam, surface-conforming spots, antennae, and six legs. Dust mites have four pairs of legs and fine bristles.
- Giraffes have a long tapered neck, patterned coat, slender jointed legs, ossicones, mane, and tail. T. rex has a horizontal body, balancing tail, two hind legs, small two-fingered arms, and a toothed jaw.
- Added **Inspection zoom**, from 1× to 2.5×, with keyboard support, mobile pinch gestures, and **Fit object**. The camera moves closer while the scientific scale and model dimensions stay unchanged. Selecting another specimen resets the inspection distance.
- Added a mitochondrion cutaway toggle. Opening its upper membrane reveals the inner folds; closing it restores the envelope. Both views retain the same normalization and dimensions.
- Measurement guides remain visible over the ground. The desktop copy and all four interface string catalogs are synchronized.

These are educational illustrations. Anatomical details and colors are approximate. The catalog continues to distinguish object dimensions from distances and conceptual models. Inspection magnification is a camera control, separate from traveling through powers of ten.

## References

The T. rex stance follows the horizontal body and tail arrangement described by the [American Museum of Natural History](https://www.amnh.org/exhibitions/permanent/saurischian-dinosaurs/tyrannosaurus-rex). The museum's [T. rex questions and answers](https://www.amnh.org/explore/ology/paleontology/ask-a-scientist-about-t-rex) also discusses its two-fingered arms. Existing planetary and human surface credits are documented in the [previous realism pass](../scale-explorer-realism/README.md).

## Verification

Final results: **89 / 89 unit checks** and **5 / 5 real-browser scenarios passed**, without retries. The browser run completed in 2.6 minutes. Syntax and whitespace checks also passed. Earlier concurrent runs hit timing limits; the final suites ran sequentially with their original timeouts.

Run from the repository root, with the unit and browser suites sequentially:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
npx vitest run tests/scale_explorer.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --reporter=json --outputFile=reports/scale-explorer-inspection/unit-results.json
npx playwright test tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list --output=reports/scale-explorer-inspection/test-results
```

The inspection browser tests verify nonblank models, actual camera distance, unchanged model scale, cutaway geometry visibility, keyboard controls, genuine two-contact touch input, phone layout, and context disposal. The existing atlas suite covers all destinations, asset loading, fallback behavior, orbiting, comparisons, and resource limits.

Screenshots in this directory include the new specimens, a close-up bee, open and closed mitochondria, and phone inspection. The local preview is at [127.0.0.1:54391](http://127.0.0.1:54391/).
