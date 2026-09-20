# History contrast and reflow follow-up — September 19, 2026

This local follow-up fixes contrast in populated History states and mobile clipping in the new-unit form and resource titles. It extends the [sidebar audit](../sidebar-followup/README.md) and [current VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md). No deployment occurred.

## Verified changes

| Text/control | Before | After |
| --- | ---: | ---: |
| Light search and unit-name placeholders | 2.56:1 | 4.76:1 |
| Light new-unit Cancel | 4.25:1 | 6.78:1 |
| Light resource-type badge | 4.34:1 | 6.92:1 |
| Dark Save, default | 4.47:1 | 4.70:1 |
| Dark Save, hovered | 2.98:1 | 7.04:1 |

Values are rounded for display; verification uses unrounded ratios. Light secondary and placeholder text are darker. Dark primary-button text now uses black against the existing purple backgrounds. High-contrast theme colors are retained. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) includes placeholders and hover text within the criterion's scope.

The new-unit row wraps when necessary. Previously Cancel extended to approximately 348px in light/dark and 357px in high-contrast at a 320px viewport. The repaired layout has a 320px scroll width and keeps every sampled control in view. Resource-card rows also wrap, titles use the available width and may break long words, and the two-line clamp is removed. Both sample resource titles remain fully visible at 320px with enlarged text spacing in all three themes.

## Evidence and scope

- [Final browser evidence](results.json): six empty/populated theme-state axe scans have no A/AA violations. Six mobile layout samples cover light, dark and high-contrast with normal and enlarged spacing; control bounds and title content dimensions pass. The spacing sample confirms 14px text with 21px line height, 1.68px letter spacing and 2.24px word spacing after transitions settle.
- [17 regression assertions](final-regressions.json) pass across History theme, discovery and keyboard reordering tests.
- [Initial contrast baseline](baseline.json), [pre-repair form bounds](before-reflow-fix.json), and [pre-title-repair evidence](before-title-reflow-fix.json) retain earlier observations. Screenshots alongside this report show the final render.
- The live React fixture uses the canonical History module, AppStyles, compiled Tailwind stylesheet, English UI strings and two representative resources. It sets the real theme context. Icons are stubbed, so icon rendering/contrast is outside this sample. Data-changing handlers are fixture callbacks; complete save, rename, authentication and persistence workflows were not tested. This is component-level evidence, separate from the earlier full-app preview.

For three prior gradient-backed text review items (heading, saved status and empty-state message), computed foreground colors and composited backgrounds now provide supporting contrast evidence. The sampler evaluates two-stop gradients at 101 positions and composites translucent layers; it flags unsupported images, opacity and painted pseudo-elements. Images covered by a subsequent opaque surface are excluded from the background calculation. These calculations do not certify every pixel or every app surface.

Axe incomplete results remain in the evidence, including native-select background images, conditional Move-to-unit popup targets and additional gradient-backed/short-content nodes. Assistive-technology announcements, native browser zoom, real icon rendering, longer/localized datasets and complete app workflows remain open. VPAT ratings are unchanged.

The audit harness initially had a non-unique selector ([error](selector-error.json)). Its first spacing assertion also accepted a nonnumeric computed value; the [diagnostic](spacing-transition-diagnostic.json) exposed the transition timing. The final gate requires numeric effective spacing and waits for it before measuring. Earlier apparent spacing passes are not relied upon.

## Reproduce

```powershell
node reports/wcag-audit-2026-09-19/history-contrast/run-browser.cjs --verify
node node_modules/vitest/vitest.mjs run tests/history_panel_theme.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_reorder_a11y.test.js --maxWorkers=1 --testTimeout=60000
```

[Validation](validation.json) records source hashes, module mirror parity, syntax, document links and the VPAT criterion inventory.
