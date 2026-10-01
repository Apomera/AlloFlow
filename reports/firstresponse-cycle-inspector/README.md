# First Response Lab: inspect one compression cycle

The **Body position in 3D → Depth + recoil** activity now lets learners hold any point in a compression cycle and connect the manikin's position to the graph.

## What changed

- A keyboard-accessible cycle slider selects any position from 0% to 100%. Five stage buttons provide an easier route through the demonstration.
- The model, outlined graph marker, and numeric depression reading use the same sampled position.
- A blue 3D arrow distinguishes pressing down from releasing. It disappears at the start, deepest point, and end, where the model changes direction or is between pushes.
- Each stage provides a short observation prompt. Comparing 25% and 75% shows the same chest height with opposite movement directions. Inspecting the end after adding leaning shows why peak depth alone does not establish full recoil.
- Manual inspection works with reduced motion and without WebGL. The graph and textual explanation remain available when the 3D view cannot load.
- The manikin remains visible while using the inspector on desktop and phones. Keyboard focus brings the control and its label below the viewer.
- The existing depth, leaning, rate, camera, and anatomy controls continue to work. Inspecting a different moment updates the same scene and canvas.

## Teaching scope

Cycle percentages refer to position within one illustrative cycle, not percentage depth or a performance score. The smooth waveform demonstrates relationships; it is not a measured patient waveform or a biomechanics simulation. The added arrow represents chest movement, not applied force.

The explanation of recoil is consistent with the [AHA adult basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support), checked September 28, 2026. Existing age-specific references and practice limits remain in the activity.

## Visual review

- [Pressing down](pressing-desktop.png)
- [Releasing at the same chest height](releasing-desktop.png)
- [Desktop with the manikin and controls visible](inspector-live-desktop.png)
- [Phone keyboard inspection](inspector-phone.png)
- [Enlarged text spacing](inspector-text-spacing.png)
- [Forced colors](inspector-forced-colors.png)

## Validation

**150 unit and regression checks passed** (`unit-final.log`). These include real Three.js geometry checks for all ages, fixed chest back and hand contact, opposite movement directions at equal heights, static inspection across elapsed time and rate changes, invalid saved values, reduced motion, fallback controls, graph selection, navigation, localization, and source/public parity.

The first unit run exposed an unsupported arrow helper in the existing recovery-position probe. The final arrow uses the same mesh primitives as the manikin, and the recovery-position checks now pass. That earlier run also recorded setup/test timeouts. The first browser attempt exceeded its context-teardown timeout and was interrupted before the full suite finished; its log is retained.

**All 6 browser checks passed** in the complete rerun (`browser-final.log`). The browser suite checks live geometry and graph agreement, canvas continuity, all ages, reduced motion, keyboard sliders, focused-control visibility, 320px reflow, enlarged text spacing, forced colors, and automated axe accessibility checks. This does not substitute for a manual screen-reader audit.

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=15000
npx.cmd playwright test tests/e2e/firstresponse-cycle-inspector.spec.ts tests/e2e/firstresponse-depth-explorer.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-cycle-inspector/browser-final-artifacts
```

Both application copies are synchronized. All 21 new English strings are registered in both catalogs; additional language translations have not been authored. Changes are saved locally.
