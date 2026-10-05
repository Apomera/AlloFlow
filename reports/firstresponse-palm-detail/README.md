# First Response Lab: recovery palm detail

Validated October 4, 2026. Parent: `b17690a07745f115c91a5ae29c160b5fd637794c`. Branch: `codex/firstresponse-palm-detail`.

## What changed

**Palm detail view** follows the actual near hand from its palm side with a slight outward angle. It makes the existing palm folds, fingers and nails easier to inspect, especially on the infant model. The camera fits the hand and the complete enabled orientation arrow. It refits after a change of shown pose, guides, age or viewer size, while retaining manual orbit between those changes.

**Inspect before the turn** and **Inspect after the turn** compare completed poses 4 and 5. The buttons change the shown pose and preserve recovery progress, age, depth settings and recorded inquiry. Observation text asks the learner to follow the same near palm as the torso turns. The original Palm close-up remains available.

The model geometry and medical protocol text are unchanged. This remains a visual model of position rather than a measurement of pressure or contact force.

## Validation

- **365 unit tests** passed across six files, including 59 new palm detail tests.
- **22 unique browser scenarios** passed in aggregate across six counted runs with one worker and zero retries: 13 leg/manikin scenarios from the initial run, four hand scenarios from the diagnostic clone, and all five new detail scenarios from the final run. The age matrix has a separate case for adult, child and infant.
- **Eight captures:** saved capture bytes were visually reviewed.
- Actual palm and arrow vertices remain framed across all 24 rendered age, pose and guide combinations. Palm-side alignment is above 0.92. Screen-space prominence compared with Palm close-up: adult: 0.98–1.66×, child: 1.37–2.33×, infant: 2.18–2.73×.
- Native desktop/phone resizing, completed-pose comparisons, learner-state preservation, keyboard operation at 320px, expanded text spacing, forced colors, app contrast, accessibility and WebGL cleanup passed.
- Root and desktop source copies match. Five new catalog keys match their fallbacks; the commit saves only those five additions to the parent catalogs.

The complete unit run used command-scoped `--experimental.viteModuleRunner=false --isolate=false` with one worker after worker startup timeouts. The six suites still ran their setup and cleanup hooks. Browser-only fixtures then corrected the expected angle, named digit groups, and viewer visibility after queued native scrolling. The detail matrix was split into three age cases. Its probe keeps the full palm vertices and world coordinates, limits repeated part projections to the 13 inspected names, and waits for completed body renders. All 67 assertion expressions match the prior fixture in order; both other test bodies match byte-for-byte. The patch note's count of 68 includes the imported `expect` name. These TypeScript fixtures are not loaded by unit tests. The report verifies the exact fixture snapshots, First Response production source and unit test file hashes.

The browser count combines unique scenario passes from actual logs. The initial run recorded 14 passes and six failures; this aggregate counts its 13 leg/manikin passes. The three desktop hand cases passed in separate diagnostic runs. Their temporary clone changes the default report destination and adds failure capture to the cleanup hook; the harness, probe, helpers and all test bodies match byte-for-byte. The recovery diagnostic also recorded a failed phone case; that case passed in the fresh phone-only run. The first five-case detail run recorded four passes and one failure because its probe returned `undefined` for an unavailable target while the existing assertion required `null`. After that exact serialization correction, all five final detail cases passed with unchanged assertions. [validation.json](validation.json) records the exact scenario titles, source locations, durations, log hashes, run summaries and fixture audit hashes, including the earlier failed attempt.

The final browser process passed all five cases with exit code 0. Its wrapper exited 1 because the shared module changed from raw hash `13e8858f…` to `d2f50622…`. The original 26-input run manifest and actual guard result are preserved. A guarded refresh updates only that module entry; the other 25 inputs retain their run hashes.

The shared module change is accepted under a **scoped current-versus-parent audit exception**. The current root and desktop copies match. Their complete content matches the parent after excluding only the explicitly marked Bee persistence helper and four exact Perception Lab additions. The complete makeBayViewer implementation retains its separately verified pre-run hash and matches the parent byte-for-byte; tool registration and the Bee state-bucket guards also match. These peer edits are outside this commit.

The original raw `13e8858f…` file was not recovered. The audit therefore cannot compare its complete remainder or every intermediate file served during the run. The native harness rereads the module for each test mount, so cases may have loaded different raw versions. The report preserves this limit, the actual five passing cases, the pre-run viewer evidence and the current-versus-parent scope proof.

Browser validation uses the app-created Chromium WebGL canvas with ANGLE SwiftShader. It verifies geometry, interactions and cleanup; it does not establish hardware frame rates. [validation.json](validation.json) also records the guarded final exit, geometry and capture hashes.

## Reviewed views

- [adult-palm-detail-before-turn.png](adult-palm-detail-before-turn.png)
- [adult-palm-detail-after-turn.png](adult-palm-detail-after-turn.png)
- [child-palm-detail-before-turn.png](child-palm-detail-before-turn.png)
- [child-palm-detail-after-turn.png](child-palm-detail-after-turn.png)
- [infant-palm-detail-before-turn.png](infant-palm-detail-before-turn.png)
- [infant-palm-detail-after-turn.png](infant-palm-detail-after-turn.png)
- [phone-palm-detail-controls.png](phone-palm-detail-controls.png)
- [phone-palm-detail-app-contrast.png](phone-palm-detail-app-contrast.png)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_palm_detail.test.js tests/firstresponse_hand_surface.test.js tests/firstresponse_hand_inspection.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
$env:FIRST_RESPONSE_PALM_DETAIL_REPORT='reports/firstresponse-palm-detail'
$env:FIRST_RESPONSE_INSPECTION_REPORT='reports/firstresponse-palm-detail/regression/inspection'
$env:FIRST_RESPONSE_REALISM_REPORT='reports/firstresponse-palm-detail/regression/realism'
$env:FIRST_RESPONSE_LEG_REPORT='reports/firstresponse-palm-detail/regression/legs'
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-palm-detail.spec.ts tests/e2e/firstresponse-hand-inspection.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts --config reports/firstresponse-palm-detail/playwright.config.ts --workers=1
```
