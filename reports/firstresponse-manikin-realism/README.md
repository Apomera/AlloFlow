# First Response Lab: manikin realism and arm views

The manikin has a continuous torso with shoulder and waist contours. Tapered arms and legs replace uniform cylinders. The resting arms sit closer to the training mat, with oriented palms, separate fingers, and thumbs. The head has a narrower jaw, a nose bridge and tip, closed eyelids, and a neutral mouth. More detailed head geometry and averaged seam normals keep the surface smooth in close-ups.

The rescuer rig has shaped wrists, forearms, upper arms, sleeve cuffs, and fingernails. Stacked hands share a level elbow line while keeping separate forearm axes. The coach now places the lower heel on the actual animated chest surface during compression and release. The breathing phase retains its existing hand lift.

Two camera buttons make the details easier to inspect:

- **Hands + arms** frames the hand contact, straight arm axes, elbows, and sleeves. It is available in depth, placement, and coaching. Placement enables it after the supported chest region is selected; hiding hands in the depth explorer disables it.
- **Head close-up** is available in the breathing gate, coaching, and recovery. After the recovery roll, its angle faces the turned head so the mouth and airway pose remain visible.

The new camera targets are registered with the shared viewer without adding quiz regions. Two English strings are synchronized in both catalogs. Other-language translations have not been authored for these strings.

## Verification

The focused unit suite covers actual Three.js geometry: chest contact across ages, fixed back plane, tapered forearms, separate arm axes, level elbows, fixed segment lengths, face attachment, and coach hand contact. Existing recovery checks caught and helped correct an arm reference that would have stretched during the roll.

Browser checks require useful close-up sizes as well as visible bounds. The head checks also require the face to point toward the camera. Recovery coverage completes all eight steps and verifies that the mouth moves before checking the rolled head view. Coverage includes WebGL rendering, compression and release, camera controls, placement gating, a 320px phone layout, reduced motion, app contrast, and system colors.

All 192 unit checks and 19 browser scenarios passed, with no retries in the final runs. Eleven screenshots were reviewed. Results are recorded in [validation.json](validation.json). Forced-color axe checks omit the color-contrast rule because of the existing [auditor diagnostic](../firstresponse-prediction-activity/forced-colors-auditor.json); normal contrast checks remain enabled.

The full-arrest browser input loop now spaces each tap from the previous input. An anchored schedule could catch up after a software-rendering delay by issuing a burst, causing the existing double-click guard to reject an input and leave the scenario at 29 of 30 compressions. The test still sends exactly 30 inputs and verifies the complete assessment, call, breaths, AED, and resume sequence.

## Visual evidence

- [Whole manikin](whole-manikin.png)
- [Adult arms](adult-arms.png), [child arms](child-arms.png), [infant arms](infant-arms.png)
- [Adult face](adult-face.png), [child face](child-face.png), [infant face](infant-face.png)
- [Recovery head](recovery-head.png), [recovery body](recovery-body.png)
- [Phone arms](phone-arms.png), [contrast arms](contrast-arms.png)

## Reproduce

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
npx.cmd playwright test tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-manikin-realism/browser-artifacts
```

Run the unit and browser suites sequentially on a busy shared workstation.
