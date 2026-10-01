# First Response Lab: child hand techniques

**Body position in 3D → Hand placement** now shows a hand demonstration after the supported chest region is chosen. Other selections retain their feedback and hide the demonstration. **Chest close-up** is also available on the placement tab. Its anatomy overlay shows breastbone and rib landmarks, keeping the contact point clear of the heart and lung illustrations.

On a child manikin, **Compare child hand techniques** offers one hand or two stacked hands. The lower heel stays in the same region while the upper hand appears or disappears. The choice carries across placement, depth/recoil, and the coach. Adult and infant examples keep their own hand arrangements.

The switch updates live scene props without rebuilding the chest or hands. Each hand is positioned from its heel, keeping the lower heel centred on the chest marker and the upper heel directly over it. Chest depression, release height, movement measurements, saved A/B settings, predictions, and reflections stay in place. A short explanation distinguishes the hand illustration from the separately chosen depth and recoil settings. The selector becomes disabled while rescuer hands are hidden and retains the choice when they are shown again.

The options follow the [AHA pediatric BLS guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/pediatric-basic-life-support), checked September 29, 2026. It permits either a one-hand or two-hand technique for children. The display illustrates hand arrangements and does not predict a learner's force, depth, or clinical performance.

## Verification

Actual Three.js checks cover contact at all ages, visible hand counts, invalid choices, fixed arm lengths, stable scene objects, and unchanged chest movement. React control checks cover tab navigation, retained predictions, disabled controls, and the complete lesson without WebGL. Both module copies and 11 new English strings are synchronized. Other-language translations have not been authored for these strings.

Browser checks cover real WebGL picking, placement, the child comparison, all-age close-up framing, AED targeting, recovery, 30:2 coaching, keyboard radios, 320px reflow, enlarged spacing, reduced motion, forced colors, and axe semantic and normal contrast checks. Forced colors use the existing [auditor diagnostic](../firstresponse-prediction-activity/forced-colors-auditor.json) and computed system-color checks.

All 181 unit checks and 13 browser scenarios passed. After the final heel alignment and landmark changes, all five affected inspection scenarios passed again. Six screenshots were reviewed. Results are recorded in [validation.json](validation.json).

## Visual evidence

- [Two hands during child depth inspection](child-two-hand-inspection.png)
- [Child placement demonstration](child-placement-demonstration.png)
- [One-hand placement](child-one-hand-placement.png)
- [Phone keyboard choices](phone-hand-choices.png)
- [Phone with enlarged text spacing](phone-hand-text-spacing.png)
- [Phone with system colors](phone-hand-forced-colors.png)

## Reproduce

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
npx.cmd playwright test tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/24-firstresponse-body-gl.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-child-hands/browser-artifacts
```

Run these suites sequentially on a busy shared workstation.
