# AlloFlow stylesheet and goal-entry performance follow-up — 2026-09-04

This pass adds two runtime optimizations and a reproducible, isolated external-CSS experiment. Other agents' existing shared-tree work was preserved through narrow, checked replacements. No shared build, staging, commit, or deployment was performed.

## Runtime changes

- `app_styles_source.jsx` exports a memoized AppStyles component. Its four existing preferences remain props. Unrelated workspace updates no longer reconstruct the large interpolated CSS string and style-element tree. CSS rules and their order are unchanged. Only the corresponding root/public module pair was rebuilt.
- Assignment Directions keeps its unsubmitted goal text and resource selector in local component state. A host ref preserves both fields across close/reopen; adding a goal still updates the saved draft through the existing host action. Title/body editing, saved directions, generation, and pack persistence retain their existing host behavior. This deliberately isolates a small, verified boundary rather than moving the whole feature at once.
- Legacy goal value/setter props remain supported by the new composer module, so older shells can consume it. New shells pass the stable `directionsGoalEditorState` ref. Three shell copies received only these anchored state/prop edits. Canonical CDN pins were updated for the two changed modules; queryless local development URLs were retained.

## External CSS experiment

Run from the repository root:

```powershell
node dev-tools/build_external_styles_experiment.cjs
node dev-tools/build_external_styles_experiment.cjs --check
node dev-tools/benchmark_app_styles.cjs
```

The first command writes only `scratch/external-styles-experiment/`. It does not change normal builds, the compact performance release, or the public mirror. The editable AppStyles JSX remains the source of truth, preserving the docsuite theme generator and its tests.

The extractor selects large, unconditional template-literal style blocks without interpolations. It uses their cooked runtime text, preserving escaped selectors, and places the stylesheet link in the original cascade position. Conditional motion overrides and interpolated typography remain inline. CSS uses a filename derived from its exact SHA-256 content. URLs resolve beside the executing script; inline evaluation is deliberately unsupported by this experimental variant.

| Artifact | Bytes | Gzip bytes |
|---|---:|---:|
| Normal memoized AppStyles JavaScript | 264,712 | 29,678 |
| Experimental AppStyles JavaScript | 95,239 | 15,492 |
| Extracted CSS | 169,805 | 13,906 |
| Experimental combined payload | 265,044 | 29,398 |

JavaScript is about 64% smaller, but combined gzip transfer saves only 280 bytes, before request overhead. The useful possibilities are less JavaScript parsing and independent reuse of stable CSS. This does **not** reduce AlloFlowANTI.txt itself.

The experiment is **not enabled for production**. The missing-CSS browser probe reproduced a registered AppStyles module with no usable external stylesheet. Boot readiness currently tracks script registration, so a production rollout would need a coordinated stylesheet-readiness and failure-recovery change. The small transfer saving does not justify silently introducing that gap in the shared shell.

## Measured results

`dev-tools/benchmark_app_styles.cjs` starts a fresh Chromium instance and an ephemeral loopback server. It never attaches to a shared browser. The baseline and optimized variants are generated from the same current source, differing only in memoization; the experimental variant also extracts static CSS.

The benchmark uses the production profiling ReactDOM build, warms each variant, rotates their order across seven samples, and performs 100 synchronous unrelated parent updates per sample. It records raw samples, React Profiler durations, actual stylesheet render counts, computed styles, cache behavior, source hash, and browser version in `scratch/performance-next-pass/app-styles-benchmark.json`.

| Variant | Median 100-update batch | Median stylesheet Profiler time | Stylesheet renders per batch |
|---|---:|---:|---:|
| Inline baseline | 11.9 ms | 6.4 ms | 100 |
| Memoized inline | 8.6 ms | 0.5 ms | 0 |
| Memoized external CSS experiment | 7.4 ms | 0.5 ms | 0 |

These small component measurements include profiling overhead and shared-machine timing noise. They exclude the full AlloFlow tree, Canvas, real CDN latency, and tool startup. They are not Core Web Vitals or evidence of a 28% whole-app speedup. The deterministic result is that unrelated updates skip AppStyles, while a preference change still renders once.

The browser benchmark verified computed-style parity for light/dark/high-contrast themes, typography changes, reduced motion, and print styles; no overflow at 390 px with enlarged text; no page errors; and one cold CSS network request with zero requests on reload from the local cache. Mobile screenshots are saved beside the JSON report and were visually reviewed.

Directions tests verify that four goal text changes plus resource selection leave the host render count at one; reopening restores both fields; Enter adds the goal and clears the entry; blank goals are rejected; legacy setters remain usable; and draft editing, close/Escape, generation guards, and explicit shell wiring still work.

## Validation and release handling

- Focused stylesheet unit tests: 7 passed.
- Directions extraction/capability and root-boundary tests: 46 passed.
- Direct theme/reading-palette/App Lab contracts: 59 passed; one existing generated-theme drift assertion failed. The generated CSS block is byte-identical to the pre-edit snapshot (SHA-256 e06f318c57fca4574c87569dd850bdc6fef564b86824f7a3e914b391f6877bd6). Current shared-tree scanning expects one additional base utility and one state variant. No CSS rules were changed by this pass, and the unrelated generator output was not rewritten.
- Isolated browser benchmark and its behavior assertions: passed.
- Generated external experiment freshness: passed.
- Canonical source and desktop App.jsx JSX smoke checks: passed.
- Module registry: 209 consumers valid, zero missing or suspect-null producers.
- Scoped generated-pair and whitespace checks: passed.
- Representative Arithmetic Studio / Unit Converter focus checks: 5 passed, 1 failed on Unit Converter's high-contrast figcaption (text-slate-800 on black, reported ratio 1.43). The current and pre-edit AppStyles modules produce byte-identical rendered markup for default and enlarged-text/motion-disabled props. This unrelated tool contrast finding was recorded without changing another agent's tool.
- The optional broad STEM/SEL browser audit was stopped and replaced by that filtered run; it must not be counted as a completed full audit.
- Completed focused unit/browser suite totals: 117 passed and the two unrelated findings above; isolated benchmark assertions passed separately.

The updated AppStyles and Directions modules must be published before distributing the updated canonical Canvas source. Review/regenerate any earlier compact release snapshot from the chosen final release state; this pass intentionally did not overwrite that earlier snapshot while other agents continued working. External CSS experiment artifacts must not be mixed into a production release accidentally.
