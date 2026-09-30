# Physics investigation evidence

## Changes

- Every selected run can now be compared with the first selected reference run. Previously, the notebook showed only the first two selections, although the saved report included all selected runs.
- Range, maximum height above ground, and flight time have responsive measurement cards. Each shows recorded values, a signed difference, a percent change, and the comparison/reference ratio. Solid and striped bars share a zero baseline within each measure.
- Changed settings show their exact before/after values. A keyboard accessible disclosure lists settings held constant. Model provenance and multiple-variable warnings remain visible for each pair.
- Saved investigations use the same comparison view with their copied observations. Clearing the recent log, editing launch controls, and restoring the session preserve archived evidence and the plain-text export.
- Zero references display an unavailable ratio. Tiny positive or negative differences retain their sign and use a bound instead of rounding to zero.

The view reuses the existing evidence validators and comparison helpers. Numerical integration, recorded results, archive schema, and report formatting are unchanged. Choosing a displayed comparison is local view state; it does not edit the recorded measurements or exported report.

## Validation

- **179 distinct unit contracts verified.** The full suite passed all 149 contracts outside the two affected UI suites. After their element-tree fixtures were updated to resolve React component boundaries, all 30 affected contracts passed. Actual comparison interactions are tested with real React in the browser.
- **74 browser checks passed**, including 13 new evidence checks, the three existing investigation checks, and all 58 remaining flight, mission, history, graph, energy, and layout regressions.
- **Nine visual configurations passed:** default, dark, and contrast themes at 1100, 375, and 320 pixels. No page errors or horizontal overflow; checked text is at least 12 px with a minimum measured contrast of 12.275:1.
- Bar widths agree with recorded values within 0.05 px. Ratios agree with independently divided measurements. Viewing another comparison and changing current controls preserve complete flight evidence.
- Archived comparisons were verified after clearing the recent log in every visual configuration. Browser checks also verify session restoration and unchanged copied report text.

The capture fixture launches three real flights at 15, 30, and 45 m/s with all other settings held constant. It records source and evidence hashes and fails if source changes during the audit.

## Artifacts and reproduction

- `investigation-before-*.png`: original desktop and phone view.
- `investigation-{default,dark,contrast}-*.png`: nine enhanced views.
- `investigation-archive-*.png`: desktop and phone archive views after log clearing.
- `investigation-results.json`: layout, contrast, evidence, and source audit.
- `verify-investigations.cjs`: run with `node reports/physics-investigation-evidence-2026-09-29/verify-investigations.cjs`.

Run the new automated checks with:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/physics-investigation-evidence.spec.ts tests/e2e/physics-investigations.spec.ts --workers=1 --retries=0
node node_modules/vitest/vitest.mjs run tests/physics_ --maxWorkers=1 --pool=threads --testTimeout=30000
```

The complete browser suite is listed in `.github/workflows/physics.yml`.
