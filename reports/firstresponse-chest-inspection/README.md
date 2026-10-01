# First Response Lab: chest inspection and movement

Open **Body position in 3D → Depth + recoil**. **Chest close-up** centres the camera on the chest and contact point. **Whole manikin** restores the original framing. The camera uses the existing viewer shell and changes its target without rebuilding the scene.

The rescuer now has rounded palms, separate heels, raised fingers, thumbs, wrists, elbows, and connected straight arms. The adult model shows two stacked hands. The child and infant models illustrate the existing one-hand example. The heel follows the chest throughout the cycle, and arm lengths stay fixed. **Show rescuer hands and arms** can be turned off to inspect chest motion without obstruction.

**Measure movement between release and peak** adds centimetre ticks to the 3D guide and a white bracket between the released and deepest heights. The bracket remains fixed while the amber marker moves. Its length comes from the same model dimensions as the chest and graph. A text panel shows peak depth, depression at release, and their difference. For example, 5.5 cm peak depth with 1 cm remaining depression produces 4.5 cm of movement. With full recoil, peak depth and movement match.

When A is saved, the panel also compares movement for A and B. Changing the visual aids preserves predictions and reflections. Visual preferences survive tab navigation and model examples. The numbers and explanation remain available when WebGL cannot load. These are illustrative distances; the model does not measure force, blood flow, or hands-on performance.

The hand examples remain consistent with the [AHA adult BLS guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) and [AHA pediatric BLS guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/pediatric-basic-life-support), checked on September 29, 2026. The pediatric guidance permits one or two hands for children and describes heel-of-one-hand and two-thumb encircling techniques for infants. The illustration represents one example of those choices.

## Validation

Actual Three.js geometry checks cover heel contact, finger clearance, fixed arm lengths, each ruler graduation, bracket endpoints and length, and zero movement after input clamping. Control checks cover the calculation, A/B movement, display preferences, prediction retention, and WebGL fallback. Browser checks use real WebGL with software rendering and cover close-up framing at all ages, scene identity, keyboard input, 320px reflow, enlarged text spacing, reduced motion, forced colors, and axe accessibility checks.

All 172 unit checks and 14 browser scenarios passed. An overlapping unit run timed out before workers started; a later run passed 171 checks but exceeded the hook-order test's 20-second limit. That test file passed all four checks when rerun alone in 2.89 seconds. Execution results are recorded in [validation.json](validation.json).

Thirteen English strings are registered in both catalogs; other-language translations have not been authored. Source and public modules are identical. Forced-color tests use the existing [auditor diagnostic](../firstresponse-prediction-activity/forced-colors-auditor.json), semantic axe checks, and actual computed black-on-white measurement text.

## Visual evidence

- [Adult contact close-up](adult-contact.png)
- [Child contact close-up](child-contact.png)
- [Infant contact close-up](infant-contact.png)
- [Chest and movement explanation](movement-inspection.png)
- [Phone keyboard controls](phone-controls.png)
- [Phone with enlarged text spacing](phone-text-spacing.png)
- [Phone with system colors](phone-forced-colors.png)

## Reproduce

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
npx.cmd playwright test tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-depth-comparison.spec.ts tests/e2e/firstresponse-cycle-inspector.spec.ts tests/e2e/firstresponse-depth-explorer.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-chest-inspection/browser-artifacts
```

Run the unit and browser suites sequentially on a busy shared workstation.
