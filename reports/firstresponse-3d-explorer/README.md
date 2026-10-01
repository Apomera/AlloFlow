# First Response Lab: 3D compression explorer

The **Body position in 3D → Depth + recoil** tab now includes an interactive compression model.

## What learners can explore

- Adjust simulated peak depth, the depression remaining at release, and animation rate. Adult, child, and infant references change with the selected manikin.
- Inspect the fully compressed or released position, or animate the cycle. Static controls work with reduced motion enabled.
- Compare full recoil with leaning while holding peak depth constant. The new profile graph shows both the chosen settings and a reference cycle.
- Use side and overhead camera presets, with closer views for the smaller manikins. The whole-manikin view restores the original camera.
- Show or hide the schematic anatomy overlay.
- Try leaning and shallow examples, then reset the settings. Existing technique examples and age guidance remain in an expandable section.

The manikin's chest deforms with its back fixed against the mat. The hand contact point and moving marker follow the front of the chest. A fixed teal guide shows resting height, and a second mark shows the model's depth reference. Controls update the existing scene without recreating the canvas.

On phones, the depth explorer stacks its controls near the viewer and keeps the manikin visible while the learner adjusts them. The static profile, labels, controls, and feedback also work when WebGL is unavailable.

## Teaching scope

Values are **illustrative settings**, not measurements of the learner's compressions. The schematic uses nominal chest dimensions to illustrate deformation; it does not simulate patient biomechanics, pressure, blood flow, or outcomes. There is no performance score for adjusting the model.

Adult guidance was checked against [AHA adult basic life support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support); pediatric guidance was checked against [AHA pediatric basic life support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/pediatric-basic-life-support). The interface retains the distinction between the adult depth range and the pediatric reference based on chest size.

The investigation prompt asks whether reaching the same lowest point guarantees full recoil. The leaning example demonstrates why depth and release need separate attention. Animation rate is separate from the existing timed CPR practice.

## Visual review

- [Adult compression from the side](compression-side-desktop.png)
- [Incomplete recoil](incomplete-recoil-desktop.png)
- [Anatomy from above](anatomy-overhead-desktop.png)
- [Infant compression](infant-compression-desktop.png)
- [Phone layout](explorer-phone.png)
- [Phone controls with the manikin visible](phone-live-controls.png)
- [Enlarged text spacing](phone-text-spacing.png)
- [Forced colors](phone-forced-colors.png)

## Validation

The geometry tests use the bundled Three.js build to check actual model positions: fixed back, hand contact, full versus incomplete recoil, age-specific references, cycle timing, reduced motion, and invalid settings. Interaction checks cover examples, resets, age changes, tab navigation, fallback controls, translation entries, and matching source/public copies.

**144 unit and regression checks passed.** After the phone refinement, all 11 explorer checks passed again using one thread worker (`explorer-retry-tests.log`). Earlier attempts hit setup or worker-startup timeouts before their checks ran; successful reruns are recorded alongside those logs. An older wording assertion was updated to accept the equivalent drowning instruction introduced in the previous First Action enhancement.

**11 browser checks passed.** A subsequent phone refinement keeps keyboard focus and its label below the pinned viewer. Its focused rerun passed, including backward keyboard navigation, enlarged spacing, and forced colors (`phone-tests.log`).

Browser checks inspect the live rendered Three.js scene, canvas continuity, native keyboard sliders, all three ages, camera views, reduced motion, 320px reflow, enlarged spacing, and forced colors. Axe checks cover the explorer and expanded guidance. The existing WebGL suite also exercises target picking, AED pads, recovery positioning, CPR sequences, and context release. Results are in `browser-tests.log`; this is automated accessibility coverage, not a manual screen-reader audit.

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1
npx.cmd playwright test tests/e2e/firstresponse-depth-explorer.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-3d-explorer/browser-artifacts
```

Both tool copies are synchronized. All 42 new English strings are registered in both catalogs; other-language translations have not been authored for this addition. Changes are saved locally.
