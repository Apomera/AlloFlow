# First Response Lab — recovery leg inspection

The recovery manikin now bends its knee using each age's resting thigh and shin lengths. The lower leg settles near the mat during the roll. Footwear has a rounded heel, a wider toe box, soles and overlapping ankle cuffs, and turns with the shin.

The **Legs + feet** camera frames the hips, knees, ankles and toes. Its raised-knee view shows the lever leg; its view after the roll makes the final support position easier to inspect. Learners can rotate the view and return to the whole manikin.

The source and desktop module match. Both English catalogs include the camera label. This pass builds on `c44bc4635bf6324990d5bc5cad0c1e849f13c929`.

## Visual evidence

There are fifteen screenshots in this folder:

- Adult, child and infant: resting legs, raised knee, final support leg and whole recovery pose.
- A phone view, system forced colors and the app's contrast mode.

## Validation commands

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --testTimeout=60000
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-leg-inspection/regression'
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts --config reports/firstresponse-leg-inspection/playwright.config.ts --workers=1
```

The geometry checks cover fixed limb lengths, shoe orientation, closed surfaces and foot clearance at the resting, raised-knee and rolled poses. Browser checks cover framing across ages, keyboard rotation, phone reflow, enlarged text spacing, reduced motion, both contrast modes, accessibility, compression mechanics, AED picking, recovery order, coaching and canvas lifecycle.

Results and the tested file hashes are recorded in `validation.json`. Browser checks use Chromium WebGL with ANGLE SwiftShader. Test logs, regression captures and temporary commit metadata stay outside the saved change.
