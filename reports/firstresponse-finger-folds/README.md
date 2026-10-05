# First Response Lab: finger folds and observation

October 4, 2026. Parent: `c3b74a49f4395bb37a2eea9e361e166c12642759`. Branch: `codex/firstresponse-finger-folds`.

## What changed

Patient and rescuer fingers have shallow inward folds on their palm surfaces: two bands per finger and one on each thumb. Finer surface sampling and smooth normals make the relief easier to follow. The dorsal surface, side width, centerlines, fingertips and nail support retain their existing shape.

Patient wrists and rescuer wrist bridges have a shallow inward groove on the exposed upper surface. Their contact-facing undersides remain unchanged, as does the rescuer heel. The folds use the existing skin meshes and materials.

The recovery palm detail section asks learners to follow one finger toward the wrist and use the folds and nails to identify the upward-facing side before and after the turn. A native **Check your observation** disclosure reveals the answer. It appears from shown recovery pose 2, after the existing completion clamp. The text remains available during loading and in the diagram fallback. Opening the disclosure does not write learner data or storage; the comparison buttons retain their existing pose and completion behavior.

## Validation

- **388 unique unit cases passed in aggregate:** 387 passed in the complete eight-file run; its remaining case failed because a prior report's English-string fixture was absent from the sparse checkout. After restoring those existing fixtures, that unchanged case passed alone. The complete run exited 1, and the fixture rerun exited 0. Logs also retain an initial setup failure and a host memory failure before assertions. The 388-case result is aggregated across successful assertions.
- The new tests measure rendered finger triangles, mirrored anatomy, bounded inward relief, root and tip anchors, nail support, wrist undersides and heel contact clearance across adult, child and infant models. Existing camera, palm, compression and hook-order tests also ran.
- Observation tests cover completed-pose gating, native disclosure structure, fallback availability and retained learner state.
- **11 browser cases passed in one complete run:** five palm-detail cases, four hand-inspection cases and two native-disclosure/fallback cases, with one worker and zero retries. All 42 recorded inputs remained unchanged. The palm matrix covers 24 combinations of age, pose and guides.
- **13 final captures reviewed:** anatomy and wrist joins at all three ages, phone controls, native disclosure focus, enlarged text spacing, forced colors and app contrast. Their reviewed byte hashes are recorded in `validation.json`.

The first browser run exposed a transient null probe during viewport refitting. The inspection fixture now reads the scene and camera from one completed render on the current canvas and retains the successful snapshot; all assertions remain intact. The final complete run passed.

Browser checks use the app-created Chromium WebGL canvas with ANGLE SwiftShader. They assess rendering and interaction; hardware frame rates are outside this validation.

The live shared module was also audited against the tested parent. The Bay viewer and the complete remainder match after excluding only separate Beehive persistence and Perception catalog additions. Those peer changes are preserved.

## Reviewed captures

```text
adult-palm-detail-before-turn.png
adult-palm-detail-after-turn.png
child-palm-detail-before-turn.png
child-palm-detail-after-turn.png
infant-palm-detail-before-turn.png
infant-palm-detail-after-turn.png
phone-palm-detail-controls.png
phone-palm-detail-app-contrast.png
phone-hand-observation-closed.png
phone-hand-observation-open.png
phone-hand-observation-text-spacing.png
phone-hand-observation-forced-colors.png
phone-hand-observation-app-contrast.png
```

## Reproduce

Run from the repository root with the existing report string fixtures available:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_finger_folds.test.js tests/firstresponse_finger_observation.test.js tests/firstresponse_palm_detail.test.js tests/firstresponse_hand_surface.test.js tests/firstresponse_hand_inspection.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000

# The unchanged fixture case rerun:
node node_modules/vitest/vitest.mjs run tests/firstresponse_depth_explorer.test.js -t 'keeps both copies and the new English strings aligned' --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000

$env:FIRST_RESPONSE_FINGER_FOLDS_REPORT='reports/firstresponse-finger-folds'
$env:FIRST_RESPONSE_PALM_DETAIL_REPORT='reports/firstresponse-finger-folds'
$env:FIRST_RESPONSE_INSPECTION_REPORT='reports/firstresponse-finger-folds/regression/inspection'
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-finger-observation.spec.ts tests/e2e/firstresponse-palm-detail.spec.ts tests/e2e/firstresponse-hand-inspection.spec.ts --config reports/firstresponse-finger-folds/playwright.config.ts --workers=1
```
