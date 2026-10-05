# First Response Lab: smoother responder arms

Validated on October 5, 2026, against the First Response runtime in `8ea9f0ff2`.

The responder arms now have oval cross-sections, softer muscle contours and matching skin surfaces at the elbows. Removing the exposed round elbow joints reduces the bead-like appearance. The wrist transitions and sleeves follow the same oval profile. The straight arm axes, hand placement, compression movement and age-specific hand options are preserved.

## Validation

- **261 unit cases passed** across the new contour suite and the existing depth explorer, body and hook-order suites, each in a fresh process.
- **Two native browser workflows passed without retries or skips.** They cover all ages, child hand choices, compression/release, arm and side views, 320px keyboard use, forced colors, app contrast, text spacing, accessibility and WebGL cleanup.
- **24 scene/frame comparisons found no unintended changes.** Patient, head, hands, fingers, heels, recovery poses and materials retain 4,644 identical object snapshots. The change removes 1,904 mesh triangles for adult/child scenes and 952 for infant scenes.
- **Six captures were visually reviewed.** The arm silhouette is smoother and the contact cue remains visible. A few small pale speckles remain on shaded surfaces; the captures do not establish their rendering cause. Hardware GPU performance was not measured.

The canonical and desktop public copies match SHA256 `2ab3e962db7192a555b31799ac920ef939236cbe545f310fe01f5c843b98ccd2`. No clinical copy, localization keys or learner-state behavior changed. No deployment was run in this pass. Other agents' work and the shared coordination note remain outside the scoped commit.

The preserved native audit notes its interrupted count-only rerun. The completed original comparison remains valid; aggregate counts that included line geometry were omitted.

## Reproduce

Run from the repository root:

```powershell
foreach ($suite in @('firstresponse_rescuer_arm_contours','firstresponse_depth_explorer','firstresponse_body_3d','stem_firstresponse_hook_order')) {
  node node_modules/vitest/vitest.mjs run "tests/$suite.test.js" --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
  if ($LASTEXITCODE -ne 0) { throw "Suite failed: $suite" }
}
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-arm-contours.spec.ts --config=reports/firstresponse-arm-contours/playwright.config.ts --project=chromium
```

## Captures and evidence

[Adult arms](adult-arms-compression.png) · [Adult side](adult-side-compression.png) · [Child](child-arms-compression.png) · [Infant](infant-arms-compression.png) · [Phone](phone-arms-compression.png) · [Phone contrast](phone-arms-app-contrast.png)

[Validation](validation.json) · [Preservation comparison](preservation.json) · [Browser measurements](geometry-metrics.json)
