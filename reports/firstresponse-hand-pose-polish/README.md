# First Response Lab: hand poses and surface polish

The recovery figure now keeps its near palm facing up as the torso rolls. The far palm faces away from the head, placing the back of the hand against the cheek. Resting palms face the training mat. Each hand uses a complete orientation based on the forearm direction and the intended palm normal, rather than relying on the shortest rotation of the wrist axis.

The far hand's position comes from the actual posed head surface. Its back rests just outside that surface, and its fingers point along the cheek. The elbow is solved from the original upper-arm and forearm lengths, so reaching the cheek does not stretch either segment. This contact follows the head tilt and recovery roll.

**Hands + arms** now works in recovery as well as compression practice. In recovery it frames the manikin's arms and hands. Its angle changes after the roll so both support poses remain visible. The existing controls, button label, and clinical text are retained.

The hands have softly bent fingers, different finger lengths, nails on the back of the fingertips, and a subtle palm crease. The rescuer wrist has a rounded transition into the heel and palm. The thumb is tapered. The wrist addition remains above the chest contact plane and overlaps the forearm attachment.

The face has a continuous nose bridge and tip, small nostril details, shaped upper and lower lips, and ear recesses. A tapered neck joins the shoulder region to the head. Coincident vertex normals are averaged across seams on the rounded limbs, neck, head, and nose, keeping their lighting smooth.

## Verification

The unit checks use actual bundled Three.js geometry. New checks cover near-palm orientation before and after the roll, far-hand orientation toward the cheek, resting palm orientation, and wrist overlap and clearance. Ray checks verify that the hand back remains outside the posed head and close to its cheek surface. They also verify the original arm lengths at four recovery stages for adult, child, and infant models. Existing checks retain calibrated chest motion, coach contact, and recovery choreography.

Browser checks complete all eight recovery steps and inspect the near palm before the roll and both support hands afterward. Both wrists must fit the camera, and their projected separation must remain useful along either screen axis. Head and rescuer-arm close-ups retain their size and orientation checks. The broader suite covers AED picking, age scaling, coaching, camera lifecycle, mobile reflow, keyboard access, enlarged text spacing, reduced motion, and contrast modes.

All 201 unit checks passed. The full browser suite passed all 19 scenarios; the three affected manikin scenarios passed again after the recovery cheek-contact fix. Thirteen screenshots were reviewed. Results and run scope are recorded in [validation.json](validation.json). Normal axe contrast checks remain enabled. Forced-color audits use the existing [auditor diagnostic](../firstresponse-prediction-activity/forced-colors-auditor.json).

## Visual evidence

- [Whole manikin](whole-manikin.png)
- [Adult arms](adult-arms.png), [child arms](child-arms.png), [infant arms](infant-arms.png)
- [Adult face](adult-face.png), [child face](child-face.png), [infant face](infant-face.png)
- [Near palm before the roll](recovery-palm-up.png)
- [Both recovery support arms](recovery-arms.png)
- [Recovery face](recovery-head.png), [whole recovery pose](recovery-body.png)
- [Phone arms](phone-arms.png), [contrast arms](contrast-arms.png)

## Reproduce

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
$env:FIRST_RESPONSE_REALISM_REPORT = 'reports/firstresponse-hand-pose-polish'
npx.cmd playwright test tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-hand-pose-polish/browser-artifacts
```

Run the suites sequentially on a busy shared workstation.
