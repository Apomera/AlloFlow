# First Response Lab — continuous hands and fitted details

Fingers and thumbs now use closed, curved skin surfaces with tapered joints and rounded tips. The patient and rescuer hands mirror finger lengths and thumb position. Curved nails follow the finger surface; the patient palm folds follow the actual sculpted palm triangles.

The palm widens toward the knuckles and tapers toward the wrist. The existing wrist, heel and cheek contact anchors remain in place. The visible raised fingers still clear the chest throughout compression and release. Patient palm folds also mirror between the hands, and an optional fold is omitted if its surface fitting fails.

Continuous digits use fewer meshes and vertices than the previous cylinder-and-sphere fingers. Curve frames are computed once per skin ring. The production source and desktop mirror match. This pass uses the existing simulation controls and labels.

For the adult coach scene, total geometry fell from 88,662 to 57,846 vertices and from 145,862 to 97,686 triangles: 34.8% fewer vertices and 33.0% fewer triangles. These counts include all constructed geometry at the initial pose, in dark mode with contrast and shadows disabled.

## Validation

All **271 unit tests** and **32 browser scenarios** passed in the final full runs. All twelve final captures were visually reviewed.

`validation.json` records the final results, reviewed capture hashes and tested inputs. Geometry checks use actual ray intersections, closed-surface topology, mirrored vertices and chest clearance. Browser checks cover all ages, recovery cheek contact, compression and release, existing camera views, keyboard access, enlarged text spacing, system colors, app contrast and renderer cleanup.

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_hand_surface.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --maxWorkers=1 --testTimeout=120000
$env:FIRST_RESPONSE_HAND_REPORT = 'reports/firstresponse-hand-surfaces/regression/hands'
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-hand-surfaces/regression/realism'
$env:FIRST_RESPONSE_LEG_REPORT = 'reports/firstresponse-hand-surfaces/regression/legs'
npx.cmd playwright test tests/e2e/firstresponse-hand-surfaces.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts --config reports/firstresponse-hand-surfaces/playwright.config.ts --workers=1
```

Chromium uses ANGLE SwiftShader. Final captures show the chest hands, recovery hands and cheek support for each age, plus the phone chest, system-color and app-contrast views. Logs, temporary metadata and intermediate captures are ignored.
