# First Response Lab — near arm posture and recovery framing

The near arm now has a bent elbow and a palm that faces up in the recovery sequence. The pose follows [St John Ambulance's recovery guidance](https://www.sja.org.uk/first-aid-advice/recovery-position/), checked on October 1, 2026. Both arm segments retain their resting lengths for adult, child and infant figures, and the hand remains clear of the mat through the roll.

A short cue helps learners inspect the elbow and palm, with a link to the guidance. It follows the pose being reviewed and stays available when WebGL is unavailable. Completed steps and the existing recovery instructions remain intact.

**Whole manikin** now frames the recovery figure itself, giving child and infant figures a useful size on screen. A separate camera target preserves the authored age scale, and a wider margin keeps the rolled figure inside the view. Keyboard `0` returns to the same view. The focus updates through pose review and contrast changes, and releases when learners switch to another activity.

This report records the earlier pass, which was kept uncommitted at the time. It builds on `6fda66cb561acd0be602e299da80231e8c19d93c`. The source and desktop module match. Both English catalogs have two new guidance labels.

## Validation

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --testTimeout=60000
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-arm-posture'
$env:FIRST_RESPONSE_LEG_REPORT = 'reports/firstresponse-arm-posture/regression'
npx.cmd playwright test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts --config reports/firstresponse-arm-posture/playwright.config.ts --workers=1
```

Unit checks measure arm lengths, elbow angles, joint continuity, palm direction and actual hand vertex clearance. They also check target availability by activity, cue visibility during review, the text fallback and existing geometry and clinical content.

Browser checks use actual WebGL geometry across ages and poses. They measure arm posture, camera framing and figure size, then check phone keyboard use, pose review, text spacing, forced colors, app contrast, accessibility and existing First Response workflows. Screenshots include the near arm and whole body before the roll, during the roll and at completion.

The final checks cover 233 unit tests and 25 distinct browser scenarios. The first browser run passed 21 cases; a leg test read the scene before its first rendered frame. Visibility polling now waits for rendering, and all four leg cases passed the follow-up run. `validation.json` records the runs and tested file hashes. Chromium uses ANGLE SwiftShader. Logs and temporary preparation files are ignored.
