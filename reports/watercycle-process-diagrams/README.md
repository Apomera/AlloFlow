# Water Cycle process figures and scene context

This pass makes the Before/After comparisons easier to scan and gives precipitation and collection distinct visual stories. Changes are left uncommitted.

## What changed

- **Precipitation:** cloud water or ice becomes falling water or ice. Gravity arrows show transport while the text retains both possible physical states.
- **Collection:** incoming liquid water or ice moves into storage. The store shows liquid and ice, and the existing note explains that freezing and melting are separate processes.
- **Comparison layout:** Before/After captions now appear above 64px figures, followed by the physical-state description. Both states have equal space, including on a 320px phone viewport.
- **3D context:** an inactive preview follows the selected process even when a previous parcel position was saved. Active scene captions, the camera dock, and view status use the existing names, including Plant uptake, River runoff, and Aquifer flow.

The existing phase descriptions, energy model, comparison answer logic, saved writing, and journey data remain unchanged.

## Matched visual review

The baseline is commit `78e13faae`, runtime SHA-256 `3b733011f6f4842a41572ac605e2db17b2b7791cbea724f9e81bf78c154e620b`. Each pair was captured with the same viewport and light theme.

| View | Before | After |
| --- | --- | --- |
| Condensation / precipitation, phone | [320px baseline](before-condensation-precipitation-light-320.png) | [320px revised](condensation-precipitation-light-320.png) |
| Condensation / precipitation, desktop | [1280px baseline](before-condensation-precipitation-light-1280.png) | [1280px revised](condensation-precipitation-light-1280.png) |
| Infiltration / collection, phone | [320px baseline](before-infiltration-collection-light-320.png) | [320px revised](infiltration-collection-light-320.png) |
| Infiltration / collection, desktop | [1280px baseline](before-infiltration-collection-light-1280.png) | [1280px revised](infiltration-collection-light-1280.png) |

Scene review: [collection preview on a phone](collection-preview-light-320.png), [collection preview on desktop](collection-preview-light-1280.png), [Plant uptake on a phone](plant-uptake-scene-light-320.png), [Plant uptake on desktop](plant-uptake-scene-light-1280.png).

## Verification

The focused unit suites passed **132 tests**: 109 comparison, camera, host accessibility, and 3D handoff regressions, plus 23 scene-context tests. Scene-context tests execute the renderer's actual derivations, cover all six previews with remembered inactive states, and verify active names and saved-data preservation.

The browser harness uses a frozen runtime, an owned ephemeral localhost server, and isolated Chromium. It exercises native comparison controls and keyboard focus, preserves written explanations and a paused parcel, checks actual SVG geometry and physical-state text, and checks active and inactive scene labels. Coverage spans 320px and 1280px in light, dark, and forced-colors modes. SVGs are decorative; visible text supplies their meaning.

The completed browser run passed **232 checks** across 90 rendered cases, with **18 clean scoped accessibility audits**, zero runtime errors, and both owned resources closed. The report explicitly records completion and reports interrupted runs as failures.

Visible-bounds checks exclude the intentionally clipped `.sr-only` connector spans; these remain in accessibility audits. The [initial diagnostic](results-initial.json) recorded 18 flags for those hidden spans before that assessment was corrected.

Raw results: [unit regressions](regression-results.json), [scene-context tests](scene-context-unit-results.json), [browser checks](results.json), [baseline capture metadata](baseline-results.json).

The [verification summary](verification-summary.json) confirms distinct unit suites, successful browser completion, source/public parity, resource cleanup, and an empty staged diff for this pass.

Tested source and public mirror SHA-256:

```text
2ab8cb80d55de3063122677d50df18c4047ab1ad41fc198b86d5093ae9c83ccf
```

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/watercycle_process_compare.test.js tests/watercycle_camera_mode.test.js tests/watercycle_host_surface_a11y.test.js tests/watercycle_3d_handoff.test.js tests/watercycle_scene_context.test.js --maxWorkers=1
node dev-tools/watercycle_process_diagram_qa.cjs --baseline
node dev-tools/watercycle_process_diagram_qa.cjs
```

Browser checks use a separate server and close their own browser and server afterward. They do not operate learner tabs or the existing preview at port 8770.
