# Storm signals at three moments

“Compare three moments” now brings the activity and ground-response readings into two aligned charts. Learners can compare all three moments within each track, switch ground metrics, and inspect one selected scene. The selected column is highlighted in both charts.

The compact stage controls label model positions explicitly. The selected scene includes both “now” and “so far” readings. The practice question sits immediately beneath its evidence. Solid and patterned bars distinguish the tracks in addition to color; zero readings keep zero-height bars, and unavailable readings remain separate from zero.

## Validation

- 74 focused helper and rendering tests passed on the final runtime, including new chart, selection, zero, and unavailable-reading coverage.
- 1,981 browser assertions passed across five precipitation scenarios, all five ground metrics, three stages, actual bar geometry, keyboard focus, practice feedback, and independent live-timeline behavior.
- Four scoped accessibility audits found no violations. Eight screenshots cover desktop, 320/390-pixel phones, dark mode, forced colors, app contrast, and zero ground readings.
- Both shipped runtimes match and parse. Reversible deltas and independent AST review confirm changes are limited to the renderer, its stylesheet, and one adjacent blank line. Model and helper code remain unchanged.

The test run intentionally excluded 30 historical source-preservation cases tied to an older baseline. The current change has its own exact scope proof. A forked unit run stalled before completing; the final single-thread run completed successfully in 13 seconds. Only final-hash successful evidence is included here.

Browser validation used the local 2D fixture. Unavailable readings are covered by unit tests rather than injected browser scenarios. Zero ground readings and virga were checked in the browser.

Source SHA-256: `03874d513249cf4aa85947ee51b05e8aca9317d9a1191642cc573ab2775710b8`.

From the repository root:

```sh
node reports/watercycle-storm-signals/verify.cjs
node node_modules/vitest/vitest.mjs run --config reports/watercycle-storm-signals/vitest.config.mjs
```

The browser harness is preserved as `browser-finish.cjs` with its local dependency paths. It accepts the expected runtime hash as its first argument and creates a fresh timestamped output directory.

No commit was created.
