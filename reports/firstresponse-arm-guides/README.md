# First Response Lab — arm positioning guides

Recovery review includes optional 3D guides at the near elbow and palm. A curve follows the elbow bend, and an arrow follows the actual rendered palm direction through the roll. The text key uses the same two shapes. This helps learners connect the pose to the elbow and palm cues in [St John Ambulance guidance](https://www.sja.org.uk/first-aid-advice/recovery-position/), checked on October 1, 2026.

**Show arm positioning guides** appears from the near-arm step onward. The preference survives pose review and activity changes, and the text key works in the fallback view. **Hands + arms** uses a slightly lower viewing angle with guides enabled before the roll, making the palm arrow easier to see.

The guides use the existing joint positions and palm normal. Geometry checks confirm that showing them leaves the mannequin pose unchanged. Both guides use white materials in app contrast mode, and the curve and arrow keep distinct shapes. The toggle and text key support phone keyboard input and enlarged text spacing.

This update includes the earlier bent-elbow pose, preserved arm lengths, improved whole-body camera framing and guidance cue documented in [the arm posture report](../firstresponse-arm-posture/README.md). The First Response source and desktop mirror match. Both English catalogs have three new guide labels, alongside the two labels from the arm posture pass.

## Validation

All **239 distinct unit tests** and **27 distinct browser scenarios** passed across the full runs and focused rechecks. The final unit run passed 233 cases; six geometry cases timed out during a slow host run. A focused run with a 120-second limit passed all 12 selected geometry cases, including those six, with unchanged assertions.

The full browser run passed 26 scenarios. Its CPR coach test used an absolute tap schedule that could send catch-up taps after host delays. The test now spaces each tap from the previous one and passed separately, retaining the count, breath, timing, persistence and single-canvas assertions.

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --testTimeout=60000
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js --testNamePattern='bends the near elbow while|settles the resting and support feet|keeps both leg segments|places the far hand back' --maxWorkers=1 --testTimeout=120000
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-arm-guides/regression/realism'
$env:FIRST_RESPONSE_LEG_REPORT = 'reports/firstresponse-arm-guides/regression/legs'
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts --config reports/firstresponse-arm-guides/playwright.config.ts --workers=1
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts --grep 'the 30:2 coach reaches breaths' --config reports/firstresponse-arm-guides/playwright.config.ts --workers=1
```

Unit checks cover guide anchoring, palm direction, pose preservation, visibility by activity and step, contrast materials, saved preference, progress and fallback text. Browser checks measure actual rendered guide bounds and arrow length on screen, then check all ages, review, canvas identity, phone keyboard controls, enlarged text spacing, forced colors, app contrast, accessibility and the existing First Response workflows.

`validation.json` records the final results and tested file hashes. All 14 final guide screenshots were visually reviewed. They show all ages before the roll, during the roll and at completion, plus phone guides and the text key. Chromium uses ANGLE SwiftShader. Logs, temporary helpers and regression captures are ignored.
