# First Response Lab: saved depth and recoil comparison

In **Body position in 3D → Depth + recoil**, open **Compare two settings** to save the current depth and recoil as A. The manikin remains current B while the saved marker and graph curve preserve A.

## Learning workflow

1. Save a setting as A, then change depth or recoil for B. Matching curves overlap until the settings differ.
2. Use **Try full recoil vs leaning** for a controlled comparison. It preserves the chosen peak depth, rate, and anatomy setting, saves A with full recoil, and gives B 1 cm of depression remaining at release.
3. Choose **Inspect peak** and **Inspect release**. The selected cycle position is shared by both conditions.
4. Compare the graph, the 3D markers, and the table. With equal peak depths, the two conditions meet at the deepest point and differ at release.
5. Replace A explicitly or clear it. Neither operation resets current B.

The graph uses a dashed line for A and a solid line for B. In 3D, the saved violet outline and current amber dot share a vertical guide. This prevents camera perspective from distorting their height comparison; both remain distinguishable at the same height. Textual values and a labeled table provide the same evidence without relying on color or WebGL.

## Scope and saved state

A stores peak depth, depression remaining at release, and the selected age. It follows the current cycle position and animation rate, keeping timing fixed while comparing depth and recoil.

Only one A is stored. Switching to another age hides an incompatible A; returning to its age restores it until it is replaced or cleared. Invalid saved values are rejected or bounded before they reach the model.

The values describe an illustrative manikin. They do not measure learner performance or predict patient outcomes. Existing age guidance remains in place. The recoil explanation follows the [AHA basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) already checked for the cycle inspector.

## Visual review

- [Same peak depth](same-peak-desktop.png)
- [Different recoil](different-recoil-desktop.png)
- [Phone keyboard controls](comparison-phone.png)
- [Enlarged text spacing](comparison-text-spacing.png)
- [Forced colors](comparison-forced-colors.png)

## Validation

**156 unit and regression checks passed** (`unit-tests.log`). Coverage includes the actual Three.js marker positions for all three ages, shared cycle timing, static inspection, invalid and incompatible references, independent saved values, replacement and clearing, graph agreement, existing recovery-position behavior, localization, and synchronized source/public copies.

The initial browser run passed the three cycle-inspector checks and the first comparison check before a local tool timeout interrupted the run (`browser-tests.log`). Visual review then identified and corrected perspective distortion from offset markers. The markers now share x/z coordinates, and the saved marker uses a hollow outline. All 23 focused geometry and interaction checks passed again (`marker-tests.log`).

All three comparison browser checks passed after the visual correction (`browser-final.log`). The existing explorer suite initially hit a context-teardown timeout, including on an isolated retry (`explorer-retry.log`); the browser log also reported GPU command-buffer errors. All three explorer checks then passed in 55.8 seconds with explicit SwiftShader software rendering and video/trace recording disabled (`software-browser.log`). Test assertions and timeouts were unchanged. The task-specific configuration is saved below; the global browser configuration is unchanged.

In total, all nine distinct browser scenarios passed across these runs: three comparison, three cycle-inspector, and three explorer checks. Coverage includes real WebGL geometry, canvas continuity, native keyboard interaction, reduced motion, 320px reflow, enlarged text spacing, forced colors, and automated axe checks. It is not a manual screen-reader audit.

```powershell
npx.cmd vitest run tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --maxWorkers=1 --pool=threads --hookTimeout=30000 --testTimeout=15000
npx.cmd playwright test tests/e2e/firstresponse-depth-comparison.spec.ts tests/e2e/firstresponse-cycle-inspector.spec.ts tests/e2e/firstresponse-depth-explorer.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/firstresponse-depth-comparison/browser-artifacts
npx.cmd playwright test tests/e2e/firstresponse-depth-explorer.spec.ts --config reports/firstresponse-depth-comparison/playwright-software.config.ts --workers=1 --retries=0 --reporter=list
```

Both application copies are synchronized. All 25 new English strings are present in both catalogs; other-language translations have not been authored for this addition. Changes are saved locally.
