# First Response Lab: graph inspection and accurate motion cues

The depth graph now acts as another way to inspect the compression model. Click or drag to a moment, or use the keyboard; the graph, phase slider, 3D chest and direction arrow follow the same selected phase.

## Changes

- Added a centimetre scale, grid lines and a guide through the selected chest depth. Scale labels adapt to adult, child and infant models, including exact midpoint values.
- Added A/B readings and their difference beside the graph, keeping observations close to the plotted curves.
- Added a keyboard-accessible graph slider: arrows move 1%, Page Up/Down move 10%, and Home/End select start/release. Touch interaction preserves vertical scrolling and permits pinch zoom.
- Corrected the valid zero-travel case: matching peak and release depths keep the chest still, hide the movement arrow and explain why. Saved predictions and notes survive phase inspection.
- Refined focus-outline spacing and verified graph focus remains below the pinned phone viewer.

## Validation

**130 unit tests passed:** 115 existing depth-explorer cases, 11 new geometry/UI cases and four hook-order checks. Only touch-action and spacing CSS changed after those runs; the final browser checks used the final source.

**Two native browser workflows passed twice, without retries or skips.** The first run informed spacing and screenshot refinements. The final run covered actual 3D rendering, pointer drag, touch tap, keyboard controls, all ages, A/B state retention, the stationary case, 320px layout, text spacing, contrast modes, accessibility and WebGL cleanup.

The canonical and desktop public copies match SHA256 `9231fee2cc147d13d23f2dd8872354cd6968939f24236d182c12f54e07c76e36`. The changes remain **uncommitted and unstaged**, as requested. No push or deployment was run.

Eight new English fallback messages are collected in [the localization delta](ui-strings.delta.json); translations remain pending integration. GPU performance and native pinch magnification were not measured. The previous arm/sleeve speckles were not changed in this pass.

## Visual evidence

[Desktop graph](adult-graph-releasing.png) · [Manikin](adult-manikin-releasing.png) · [Phone](phone-graph-zero-travel.png) · [Forced colors](phone-graph-forced-colors.png) · [App contrast](phone-graph-app-contrast.png)

Phone captures show the real viewport with the pinned viewer and focused graph. [Validation details](validation.json) and [rendered scene measurements](graph-metrics.json) record the test conditions.

## Reproduce

Run from the repository root:

```powershell
foreach ($suite in @('firstresponse_graph_inspection','firstresponse_depth_explorer','stem_firstresponse_hook_order')) {
  node node_modules/vitest/vitest.mjs run "tests/$suite.test.js" --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
  if ($LASTEXITCODE -ne 0) { throw "Suite failed: $suite" }
}
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-graph-inspection.spec.ts --config=reports/firstresponse-graph-inspection/playwright.config.ts --project=chromium
```
