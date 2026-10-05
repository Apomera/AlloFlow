Saved-reading comparisons now include **Swap order**, so students can reverse first and second in one action. The readings, signed changes, saved-note cards and evidence preview all follow the selected order. Keyboard focus stays on the button, and a polite announcement identifies the new order.

Each comparable measurement now pairs its signed change with **Increased**, **Decreased** or **No change**. The labels use the unrounded calculation, including signed negative probe voltages. A short explanation makes the rounding behavior clear. Saturated lamp current can correctly show no change while base current increases; readings from different probe connections remain separate.

Swapping changes only the local comparison selection. It preserves the live circuit, saved observations, authored explanation, existing evidence, writing selection, writing size and history. The action is disabled for missing selections or the same observation selected twice. Removing or replacing a selected observation still requires an explicit new choice.

Verification: **132 tests passed across 9 files**, including 15 new direction and navigation cases. Native Chromium checks cover Enter and Space, repeated swaps, invalid selections, removal and reselection. Six visual states cover desktop, phones, saturation at 320 px, enlarged text with expanded labels, forced colors and an RTL layout with negative probe readings. All seven captures were reviewed at original resolution. Automated accessibility checks found no violations in the comparison; forced-color contrast was checked using actual computed colors because axe uses authored colors in that mode. These browser checks use a local synthetic CircuitTool host and do not exercise deployment.

The initial focused run passed 13 of 15 cases. Two new assertions assumed different spacing/precision for voltage text. They were corrected to match the existing formatter; product formatting was unchanged. The first result is retained in `targeted-tests.json`, and the exact assertion corrections are recorded in `test-fixture-correction.json`.

- [Desktop comparison](direction-desktop.png)
- [Reversed phone comparison](direction-phone-reversed.png)
- [Saturation readings](direction-narrow-saturation.png)
- [Enlarged text](direction-doubled-text.png)
- [Forced colors](direction-forced-colors.png)
- [RTL and negative probe readings](direction-rtl-negative-probe.png)
- [Keyboard focus](keyboard-swap-focus.png)
- [Final verification](validation.json)
- [Grouped test receipt](regression-receipt.json)
- [Browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Source preservation](source-preservation.json)

Source and desktop mirror are identical. The seven scoped source fragments reverse byte for byte to the previous verified version. Changes remain uncommitted and unstaged.
