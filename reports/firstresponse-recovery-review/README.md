# First Response Lab — recovery pose review

Learners can revisit any completed recovery pose, compare adjacent steps and return to the latest pose. Reviewing preserves completion. Continuing the sequence returns to the new completed pose; starting again clears both progress and the review selection. The final positioning message appears when the completed final pose is shown.

The head, arms and legs camera presets use the pose being inspected. The review controls stay available in the text fallback, use a labeled native select and keyboard buttons, and announce the selected step and its explanation.

The mannequin has a fitted hip shell with a smooth outline from the waist toward the crotch. Tapered arms, legs and fingers use side normals that follow their contour, avoiding dark rings caused by blending hidden end caps into the limb shading. Joint centres, limb lengths, compression calibration and clinical instructions remain as before.

This pass builds on `4d71a4e0ebf95f84b1a4aa8fac6a97211161894b`. The source and desktop module match. Both English catalogs have eight new review labels.

## Validation

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --testTimeout=60000
$env:FIRST_RESPONSE_LEG_REPORT = 'reports/firstresponse-recovery-review'
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-recovery-review/regression'
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts --config reports/firstresponse-recovery-review/playwright.config.ts --workers=1
```

Unit checks cover review bounds, unchanged completion, resuming and resetting, closed hip geometry, outward normals, smooth limb seams and the existing compression, hand and recovery mechanics. Browser scenarios cover review across ages, the actual pose before and after the roll, retained canvas identity, camera framing, phone keyboard controls, enlarged text spacing, reduced motion, forced colors, app contrast, accessibility and existing First Response workflows.

The screenshots show all three ages before the roll, during the roll and at completion, plus leg close-ups and phone controls. `validation.json` records final results and tested file hashes. Chromium uses ANGLE SwiftShader for WebGL rendering. Logs and temporary commit metadata are ignored.
