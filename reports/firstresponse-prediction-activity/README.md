**First Response Lab: predict, inspect, and explain**

In **Body position in 3D → Depth + recoil → Compare two settings**, save A or choose **Try full recoil vs leaning**, then open **Predict and test**.

Learners predict which setting is more depressed at the deepest point and between pushes. **Check predictions** compares both answers with the current model values. Learners can revise an answer, inspect each position, and save a short explanation using evidence from both observations. Feedback describes agreement with the illustrative model; the written explanation is not graded.

The activity works with arbitrary saved/current depth and recoil settings, including identical conditions and comparisons where peak and release differ in opposite directions. Changing depth, recoil, saved A, or age clears the activity. Changing cycle position, rate, or anatomy preserves it. A signature also prevents restored or malformed feedback from being shown for another comparison. Reflection notes are bounded to 400 characters.

The desktop manikin remains pinned through the full height of the expanded activity. Keyboard input on the cycle inspector, depth controls, and prediction activity scrolls the focused control beneath the pinned phone viewer. Native radio groups, fieldset legends, a labeled text area, explicit focus indicators, and text evidence keep the learning workflow accessible with or without WebGL.

163 unit and regression checks and all 11 browser scenarios passed. They cover actual Three.js geometry, prediction evaluation, revision, inspection, reflection retention, stale records, age changes, localization, and source/public parity. Results and rendering configuration are summarized in [validation.json](validation.json). Detailed execution logs remain local.

The browser checks cover real WebGL marker positions, the pinned viewer, keyboard radio navigation, editable reflection notes, 320px reflow, reduced motion, enlarged text spacing, forced colors, and automated axe checks. The source/public copies are synchronized, and 19 new English strings are registered in both catalogs. Other-language translations have not been authored for this activity.

Normal rendering includes axe color-contrast checks. A [local diagnostic](forced-colors-auditor.json) found that axe mixed the authored foreground color with a system background in forced-color mode. That mode uses axe semantic checks, direct contrast calculations from computed system colors for the activity controls, and visual review of the screenshot.

Visual evidence:

- [Desktop evidence and reflection](inquiry-desktop.png)
- [Phone predictions](inquiry-phone-predictions.png)
- [Phone evidence and reflection](inquiry-phone-evidence.png)
- [Enlarged text spacing](inquiry-text-spacing.png)
- [Forced colors](inquiry-forced-colors.png)

Reproduce the checks from the repository root:

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=30000
npx.cmd playwright test tests/e2e/firstresponse-depth-comparison.spec.ts tests/e2e/firstresponse-cycle-inspector.spec.ts tests/e2e/firstresponse-depth-explorer.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-prediction-activity/browser-artifacts
```

The scoped commit includes the previously saved cycle inspector and A/B comparison, the prediction activity, their tests, and visual evidence. Shared catalogs include only First Response Lab changes in the commit. Unrelated staged work is preserved.
