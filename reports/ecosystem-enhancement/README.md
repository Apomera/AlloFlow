# Ecosystem tool enhancement

Implemented in `stem_lab/stem_tool_ecosystem.js` and synchronized to `desktop/web-app/public/stem_lab/stem_tool_ecosystem.js`.

## Findings and changes

| Finding | Change |
| --- | --- |
| Two sampling paths mixed `{p, f}` and `{prey, pred, vegHealth, dayPhase}` records in the same array. Phase detection and charts could receive undefined values. | One simulation-tick history now feeds telemetry, phase detection, and the mini-chart. Repainting while paused does not create samples. |
| Two mini-charts painted over the same corner. | Removed the duplicate and kept one larger chart with a solid prey line and dashed predator line. Its caption describes samples rather than an inaccurate wall-clock duration. |
| Canvas dimensions were cached only at mount. | The bitmap follows container size and device scale, preserving entity positions and population state. |
| Rolling ground exposed transparent gaps below the sky. | The sky now paints behind the entire landscape. A browser pixel test checks that the canvas is opaque. |
| Tiny HUD labels and overlays crowded narrow scenes. | Larger text, opaque dark panels, more scene height, a wrapping header/control bar, and fewer in-scene overlays on mobile. Full telemetry remains available below the scene. |
| Bright ground competed with animals. | Softer meadow greens improve visual separation. |
| The goal text and Conservation difficulty selector had foreground/background mismatches. Observation text periodically faded. | Corrected foreground colors and removed the observation callouts' pulsing opacity. Phase cards retain dark text on their pale backgrounds. |
| Live graph series depended on color and lacked a readable scale. | Theme-aware colors, solid/dashed lines, circle/square endpoint markers, a matching legend, numeric scale labels, and Earlier/Now labels. Removed overlapping endpoint numbers; exact counts remain in telemetry. |
| Phase-card styling did not recognize several emitted phase names. | Collapse, rebound, released, decline, and pressure now map to the appropriate status treatment. |
| A comparison evidence button appeared inside a table and comparison figures lacked keys. | Moved the button outside the table and keyed the figures. |

## Verification

- Ecosystem unit suite: 21 files / 78 tests passed.
- Browser coverage: 23 checks passed across the main run and focused reruns, covering text contrast, control boundaries, focus, keyboard sandbox controls, offscreen suspension, and the new live-data/resize/visual regression.
- The canvas text contrast check samples actual rendered backgrounds across a day/night swing, including the enlarged HUD and chart caption.
- The new browser regression verifies finite telemetry, finite SVG points, distinct line/marker encodings, frozen history while paused, responsive bitmap sizing, no mobile horizontal overflow, both study scenarios, and an opaque canvas background.
- Syntax and scoped diff whitespace checks passed. Source and desktop copies are identical.
- One focused unit retry encountered local worker startup/setup timeouts. Switching to Vitest's thread pool allowed the comparison tests to complete successfully.

The stochastic scene and deterministic analytical model remain separate teaching representations. Their equations and ecological parameters were not changed. No deployment was performed.

## Screenshots

- [Before: simulation](before-simulation.png)
- [After: desktop simulation](after-simulation.png)
- [After: mobile meadow](after-mobile.png)
- [After: mobile kelp forest](after-kelp-mobile.png)
- [After: dark theme](after-dark.png)
- [After: high contrast theme](after-contrast.png)
- [After: overview](after-overview.png)

## Repeat the checks

```powershell
npx vitest run tests/ecosystem --pool=threads --maxWorkers=1 --hookTimeout=60000
npx playwright test tests/e2e/ecosystem-live-visuals.spec.ts tests/e2e/50-ecosystem-contrast-theme-offscreen.spec.ts tests/e2e/51-ecosystem-canvas-keyboard.spec.ts tests/e2e/52-ecosystem-canvas-text-contrast.spec.ts --workers=1 --retries=0
```
