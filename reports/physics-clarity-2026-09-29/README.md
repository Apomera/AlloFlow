# Physics simulator: visual clarity

September 29, 2026. This pass builds on the [recorded-point inspector](../physics-inspection-2026-09-29/README.md). Changes remain local and uncommitted.

## What changed

- **Launch is above the scene.** Launch, Air Drag, and the estimate field share one compact toolbar. Keyboard order follows the visual order.
- **Phone guidance takes less space.** The title, launch count, and recommended action stay visible. An accessible Investigation guide opens the instructions and three-step learning pathway. Desktop guidance stays expanded.
- **Canvas readings identify their source.** Next launch, Current flight, and Recorded point distinguish editable settings from captured evidence. Selected position and velocity use two decimals, matching the inspector and graphs; a small vertical velocity near the highest point remains visible.
- **Energy has a clear meaning.** Initial energy labels the full budget. The footer identifies the selected point, current flight, latest impact, or last recorded state of an interrupted flight. The energy footer has its own space below the distance axis.
- **The plot key explains the marks.** The speed gradient applies to the latest trail; the white dashed curve is the vacuum reference. Older comparison trails retain their angle colors.
- **Phone measurements are easier to read.** A compact summary shows height, horizontal velocity, vertical velocity, and speed. The table explains sideways scrolling and keeps the time column visible. A new selection reveals its row inside the table while preserving focus, horizontal scroll, and page position.
- **Playback wording is precise.** The step button says “Step 0.035 s.” The ground-level condition is explicit in the younger learners’ maximum-range explanation.

## Verification

| Check | Result |
| --- | --- |
| Physics unit suite | **159 passed across 13 files** |
| Existing browser suite | **34 scenarios passed across 8 files** |
| New clarity browser suite | **3 scenarios passed**, retries disabled |
| Screenshot audit | **9 combinations passed**: 1100, 375, and 320 px in default, dark, and high-contrast themes |
| Collapsed phone header | **200–226 px** in the audited layouts |
| Launch position on phones | Fully visible above the scene; button bottom at **293–346 px** |
| Audited action, key, inspector, and table text | **12 px minimum**; contrast at least **5.20:1 default**, **5.90:1 dark**, **15.30:1 high contrast** |
| Horizontal page overflow | **Zero** in all nine layouts |

The new browser tests measure actual canvas glyph bounds at device pixel ratio 2, check a near-apex velocity of −0.03 m/s across views, and distinguish initial energy from the smaller remaining mechanical energy after a drag flight. They verify immutable flight evidence after inspection and changes to upcoming settings. Table checks measure the sticky column after scrolling and verify that timeline selection moves only the table's vertical scroll position.

The initial table-follow test sampled page position while the inspector's explicit opening animation was still scrolling. Its setup now uses reduced motion and a visible, focused timeline before measuring the subsequent selection. All scroll-preservation assertions remain in place.

The [screenshot audit](verify-clarity.cjs) records the source hash, measured contrast, layout bounds, and unchanged evidence in [clarity-results.json](clarity-results.json). The final images were visually reviewed. The local audit harness stubs icon components, so its Back button is blank in screenshots; the application retains its existing icon component.

The source and desktop copy are synchronized. All 21 new English labels are registered in both catalogs. Other language packs use the existing fallback until translated. The dedicated physics workflow includes the new browser suite. Validation ran locally.

## Previews

- [Desktop opening](clarity-default-1100-opening.png)
- [Phone opening](clarity-default-320-opening.png)
- [Expanded phone guide](clarity-default-320-guide-expanded.png)
- [Selected point and energy](clarity-default-320-selected-canvas.png)
- [Phone table after sideways scrolling](clarity-default-320-flight-table-right.png)
- [Next settings with latest-flight energy, high contrast](clarity-contrast-320-completed-current-settings.png)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/physics_ --maxWorkers=1 --pool=threads --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/physics-clarity.spec.ts --workers=1 --retries=0 --reporter=line
node reports/physics-clarity-2026-09-29/verify-clarity.cjs
```
