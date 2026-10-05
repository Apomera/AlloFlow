# First Response Lab — facial detail and head framing

The mannequin has softer brow and cheek contours, a tapered jaw, and age-specific head proportions. Thin closed-eye seams and raised eyelid edges follow the actual skin surface through head movement. Ear rims, inner folds and the shaded recess also follow the ear surface, giving the ears a joined outline.

**Head close-up** now fits the full head bounds, including the ears, across desktop and phone layouts. It follows the head during recovery review and keeps the supporting hand and cheek visible together.

Enabled recovery arm guides use a little extra camera padding so the palm arrow has room at the phone viewport edge.

The face uses the existing head pivot and materials. App contrast uses flat white skin with gray facial details. The geometry checks cover eyelid clearance, ear contact, smooth surface normals and cheek contact at every age. Browser checks cover projected feature bounds, keyboard viewing, enlarged text spacing, forced colors, app contrast and renderer cleanup.

This follows the arm positioning guides saved in commit `0b272547b`. The First Response source and desktop mirror match. This pass adds no interface labels.

## Validation

All **248 unit tests** passed in the final run. **29 distinct browser scenarios** passed across the regression run and the final nine-case mannequin recheck: 20 unaffected regression cases plus nine mannequin cases, with six overlapping the initial run. The initial regression had 26 passes, one phone guide framing failure and two skipped cases. Extra guide camera padding fixed that failure, and all nine mannequin cases then passed with the original visibility assertions. All ten final screenshots were visually reviewed.

`validation.json` records the final test results, reviewed screenshots and tested file hashes. The focused visual review caught cropped ear detail in the fixed-distance child view; the head camera now uses the viewer's fit calculation. Ear rays sample between triangle seams to avoid numerical misses at duplicated sphere vertices. The contrast check verifies the viewer's existing renderer replacement, old-context release and one remaining live canvas.

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --maxWorkers=1 --testTimeout=120000
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-face-detail/regression/realism'
$env:FIRST_RESPONSE_LEG_REPORT = 'reports/firstresponse-face-detail/regression/legs'
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts --config reports/firstresponse-face-detail/playwright.config.ts --workers=1
npx.cmd playwright test tests/e2e/firstresponse-manikin-realism.spec.ts --config reports/firstresponse-face-detail/playwright.config.ts --workers=1
```

Chromium uses ANGLE SwiftShader. The ten captures show each age before and after recovery, the phone face view, forced colors, app contrast and the phone arm guides. Logs, temporary helpers and regression captures are ignored.
