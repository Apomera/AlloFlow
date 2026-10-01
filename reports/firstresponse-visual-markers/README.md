# First Response Lab: scene and marker clarity

The 3D manikin now uses quieter highlights, a cooler shirt surface, and gentle fill light. A rounded rectangular training mat with an inset seam gives the body a clearer setting. The larger, darker floor removes the bright floor edge from chest close-ups. The whole-manikin camera is pulled back and centred along the body so the feet remain in frame.

Teaching markers use materials that keep their colors consistent under lighting. A new **Read the 3D markers** key sits below the camera controls. It pairs resting height with a line, reference depth with a bar, the current chest height with a dot, saved A with an outlined square, movement per push with a bracket, and direction with an arrow. The saved marker and measurement entries follow the selected controls and manikin age. Contrast mode uses white markers with these distinct shapes; system colors apply to the key.

In app contrast mode, the floor is black and the torso is dark, keeping the white hand contact and teaching guides visible. Gray trousers distinguish the legs from the mat. These surfaces use lighting-independent materials to prevent white surfaces merging under the scene lights.

The visual change preserves the hand contact point, chest depression, recoil, limb lengths, recovery choreography, AED targets, and learner comparisons. Eight English strings are synchronized in the source and public catalogs. Other-language translations have not been authored for these strings.

## Verification

All 183 unit checks and 16 browser scenarios passed with no retries. After the contrast surface fix, the unit suite and all three affected visual scenarios passed again. Seven screenshots were reviewed. Results are recorded in [validation.json](validation.json). The recovery pose harness now uses bundled Three.js instead of a partial geometry mock. Existing contact and pose checks run against the actual geometry APIs.

Browser coverage includes saved comparison state, actual WebGL rendering, phone layout, enlarged text spacing, normal contrast checks, system colors, and app contrast mode. Forced-color checks use computed system colors and the existing [axe auditor diagnostic](../firstresponse-prediction-activity/forced-colors-auditor.json).

## Visual evidence

- [Whole manikin and training mat](whole-manikin.png)
- [Adult chest and marker comparison](adult-marker-comparison.png)
- [Child placement close-up](child-placement.png)
- [Phone marker key](phone-marker-key.png)
- [Phone enlarged text spacing](phone-marker-spacing.png)
- [Phone system colors](phone-marker-system-colors.png)
- [Contrast marker shapes](contrast-marker-shapes.png)

## Reproduce

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
npx.cmd playwright test tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-visual-markers/browser-artifacts
```

Run these suites sequentially on a busy shared workstation.
