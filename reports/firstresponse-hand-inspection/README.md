# First Response hand inspection

Validated October 3, 2026. Parent: `39babc09420cdba39d09ac759239e7be5b6fdfa2`. Branch: `codex/firstresponse-hand-inspection`.

## What changed

The new **Inspect the hands** panel adds hand contact and recovery palm close-ups. It directs attention to the wrist heel, raised fingers, palm folds and nails. In the depth explorer, **Inspect released contact** and **Inspect deepest contact** change only the inspected phase and motion mode. Depth, lean, rate, anatomy, measurements, visible hands, child-hand choice and recorded inquiry stay intact.

The contact camera fits the actual visible surfaces across the configured compression cycle. It stays still between release and peak, then refits when depth, lean, the child-hand choice or viewer size changes. A small chest neighborhood remains in view around the heel. The invisible focus target is a unit-scale group containing a scaled bounds mesh, so shared viewer normalization preserves the fitted box. Camera coordination stays outside the pure geometry builder.

The recovery camera follows the near palm as the mannequin turns. With guides enabled, it fits the complete palm orientation arrow while keeping the elbow arc outside the close-up. It is available once the shown pose includes the near-arm step. Inspection resets when its hand is hidden or the next activity or pose has no target.

The observation text explains that visible contact alone does not establish full recoil, and points to the resting-height line and graph. The view illustrates position; it does not measure pressure or contact force. Existing medical protocol content is unchanged.

## Validation

- **306 unit tests** passed across five files, including 35 new inspection checks.
- **36 browser scenarios** passed across seven files with one worker and zero retries.
- **12 captures** were visually reviewed after the final browser run.
- All **24 recorded inputs** stayed unchanged through the browser run. The unit run verified the same 24 recorded inputs.
- Actual palm, heel, wrist, digit and nail vertices stay within the close-ups at each age. Contact prominence compared with **Hands + arms**: adult: 3.46×, child: 3.93×, infant: 4.80×. These are screen-space framing measurements, not performance measurements.
- Keyboard operation at 320px, expanded text spacing, forced colors, app contrast, panel accessibility, drawn context ownership and context cleanup passed.
- Root and desktop source copies match exactly. Ten new catalog labels match their source fallbacks. The saved catalogs contain only those additions to the parent.

The ordinary Vite module-runner workers timed out before collecting tests in this Windows session. The complete unit run used the command-scoped `--experimental.viteModuleRunner=false` option for native JavaScript imports. The final run also used --hookTimeout=120000 after an earlier run stopped one existing face test in its default 10-second setup hook. Unit and browser runs were then performed separately. Repository configuration and dependency code were unchanged.

Browser validation uses the app-created Chromium WebGL canvas with ANGLE SwiftShader. Software rendering confirms geometry, camera behavior, interactions and cleanup; it does not establish hardware frame rates. [validation.json](validation.json) records exit results, geometry measurements, input hashes and capture hashes.

## Reviewed views

- [adult-contact-close-up.png](adult-contact-close-up.png)
- [child-contact-close-up.png](child-contact-close-up.png)
- [infant-contact-close-up.png](infant-contact-close-up.png)
- [child-one-hand-peak.png](child-one-hand-peak.png)
- [child-two-hands-peak.png](child-two-hands-peak.png)
- [adult-recovery-palm-rolled.png](adult-recovery-palm-rolled.png)
- [child-recovery-palm-rolled.png](child-recovery-palm-rolled.png)
- [infant-recovery-palm-rolled.png](infant-recovery-palm-rolled.png)
- [phone-contact-spacing.png](phone-contact-spacing.png)
- [phone-palm-app-contrast.png](phone-palm-app-contrast.png)
- [desktop-contact-controls.png](desktop-contact-controls.png)
- [phone-contact-controls.png](phone-contact-controls.png)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_hand_surface.test.js tests/firstresponse_hand_inspection.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/24-firstresponse-body-gl.spec.ts tests/e2e/firstresponse-chest-inspection.spec.ts tests/e2e/firstresponse-hand-surfaces.spec.ts tests/e2e/firstresponse-hand-inspection.spec.ts tests/e2e/firstresponse-leg-inspection.spec.ts tests/e2e/firstresponse-manikin-realism.spec.ts tests/e2e/firstresponse-visual-markers.spec.ts --config reports/firstresponse-hand-inspection/playwright.config.ts --workers=1
```
