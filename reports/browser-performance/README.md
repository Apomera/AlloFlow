# Browser performance review — STEM first

This review changed the shared STEM runtime, shared 3D label rendering, and compact release coverage. It also checked the app's existing startup budgets. Work is local; no production deployment was made.

## Measured changes

| Area | Before | After | Measurement scope |
| --- | ---: | ---: | --- |
| Controller animation callbacks with no device | 266 | 0 | 4.4 seconds, production React in local Chromium |
| Controller callbacks after closing STEM | 152 | 0 | 2.2 seconds after unmount |
| Accessibility selector scans | 12 | 6 | 600-control fixture over 4.4 seconds; after is one initial audit |
| 3D label style recalculations | 25 | 2 | First label pass, 24 parts, actual shared projection/label code |
| 3D label layout passes | 1 | 1 | Layout count did not improve; style recalculation did |
| Label positions and dimensions | Reference | Identical | Exact comparison of every label; selected-label behavior checked |
| STEM asset gzip bytes | 23,248,810 | 18,430,584 | 151 scripts in the compact release measurement: 20.7% reduction |
| All compact-overlay gzip bytes | 38,017,489 | 30,629,161 | 430 scripts: 19.4% reduction |

The asset totals cover the entire measured collection. These assets are loaded as needed; the totals are **not** bytes downloaded on a single page visit. Compact assets are an optional release overlay, not the active deployment. Rebuild them from final source before publishing.

The label microbenchmark measured about 0.91 ms of style work before and 0.78 ms after on this machine. That small timing difference is noisy; the reliable result is fewer recalculations with unchanged geometry. No whole-app FPS gain is claimed.

Raw results: [before.json](before.json), [after.json](after.json), [label-layout.json](label-layout.json).

## Implementation

### Shared controller scheduling

The legacy adapter continued requesting animation frames even without a controller and after leaving STEM. Concurrent workspace work replaced that adapter with `StemInput` during this review. The final optimization is integrated into that current runtime:

- Sample only when a controller is connected, a tool or controls panel owns it, and the page is visible and focused.
- Restart from device, focus, visibility, scope, and settings events; stop on disconnect, blur, hiding, or releasing the owner.
- Preserve the current runtime's neutral-input gate, native Road Ready ownership, and saved controls.
- Compare control attributes before writing them, eliminating four repeated DOM mutations per unchanged controller frame.

The final Chromium lifecycle probe loads the current input runtime and sets/clears its actual scope. It does not merely test the removed adapter. Legacy tests from the initial implementation remain conditional; separate tests exercise the current API.

### Accessibility auditing

Replaced the two-second full-modal polling interval with a React-owned MutationObserver and a coalesced audit. Initial mounting, inserted elements, button-name changes, and relevant accessibility attributes trigger checks. Canvas painting, animation styles, and ordinary numeric readouts do not. Hidden tabs defer checks; unmount disconnects the observer and cancels scheduled work. Existing reporting and Close-button labeling remain available.

This changes the diagnostic scheduler, not the accessibility semantics of individual tools. Per-tool audits remain necessary.

### Shared 3D labels

The viewer now reads canvas dimensions once, completes label style writes, then measures labels in a separate pass. The previous per-label sequence interleaved DOM writes and reads. The actual browser comparison preserved positions, dimensions, and selection behavior. This follows the browser guidance to investigate and reduce repeated synchronous style/layout work. [Chrome performance documentation](https://developer.chrome.com/docs/devtools/performance).

The shared viewer serves tools including Heat Lab, Repair Bay, Tree Lab, Nutrition Lab, and others. Material animation and simulation behavior were not simplified.

### Compact release coverage

The compact builder previously discovered literal `loadModule()` calls but missed scripts named in lazy plugin manifests and dependency maps. It now also includes safe local JavaScript paths under `stem_lab/`, `sel_hub/`, and `arcade/`, while rejecting parent traversal and remote paths. Existing license/comment preservation and runtime-name preservation remain intact.

The generated directory is `scratch/performance-release/`. It is a partial overlay with a hash/size manifest, not a standalone deployable site. Canonical readable sources remain the authoring files.

## App-wide findings

The existing compiled shell passed size budgets: main JavaScript **646.3 KiB gzip**, CSS **79.6 KiB gzip**, initial Latin font **47.1 KiB**, and all self-hosted font subsets **300.5 KiB**. Optional fonts and several large helper libraries already load on demand. No new eager prefetch was added.

The budget checker still required the old one-file background pump expression. The current app already uses a tested adaptive pump: up to three background requests normally and one under input pressure or Data Saver/2G. The checker now recognizes that bounded implementation. The pump itself was not changed by this review.

The largest measured STEM scripts remain useful targets for future interaction-specific profiling:

| Tool | Readable source bytes | Compact source bytes | Gzip before | Gzip after |
| --- | ---: | ---: | ---: | ---: |
| Raptor Hunt | 3,418,114 | 2,521,231 | 798,480 | 688,330 |
| Solar System | 2,850,718 | 1,505,307 | 583,277 | 415,944 |
| Road Ready | 2,828,758 | 1,499,081 | 678,409 | 434,135 |
| Water Cycle | 2,403,780 | 1,314,904 | 462,567 | 337,069 |
| Optics | 2,350,883 | 1,691,995 | 519,169 | 445,387 |

These are transfer/parse candidates, not evidence that their individual simulation loops are slow. Splitting authored lesson data and optional modes should follow tool-open and interaction traces; off-main-thread work should target measured long tasks. [Long-task guidance](https://web.dev/articles/optimize-long-tasks).

## Validation and limits

- Local Chromium lifecycle probe: zero no-device animation callbacks while mounted and after closing; no page errors.
- Shared label probe: identical geometry and fewer style recalculations.
- Real-WebGL conformance: **15 tests passed**, five each for Heat Lab, Repair Bay, and Tree Lab. Checks cover live contexts, nonblank rendering, stable dimensions, keyboard reachability, and teardown.
- Final unit verification: **30 passed, 7 legacy-adapter cases skipped**, across current controls, scheduling, accessibility, plugin discovery, minification, and the adaptive background pump.
- App performance budget: passed after aligning the stale adaptive-pump assertion.
- The broader shared-scroll suite could not initialize because it requires `desktop/web-app/build/stem_lab/stem_lab_module.js`, which is absent in this checkout. Existing mirrors were used; no fake production build was created to satisfy that test.
- No field Core Web Vitals, whole-app LCP/INP/CLS baseline, real mobile GPU measurements, or physical-controller validation was obtained. The DevTools MCP browser had a profile conflict; isolated local Chromium provided the recorded evidence.
- Concurrent controller and app edits were preserved. A strict artifact check initially found source drift during those edits. The final incremental refresh verified all **430 source/output hash pairs**, plus Canvas, with **zero mismatches** at 2026-09-09T02:45:22.409Z. See [compact-verification.json](compact-verification.json). Later edits require regeneration.

Reproduce the runtime checks with `node dev-tools/stem_browser_performance.cjs`; reproduce label comparisons with `node dev-tools/stem_label_layout_probe.cjs` while the original source snapshot remains at `scratch/browser-performance/stem_lab_module.before.js`. Build compact assets with `npm run build:performance`, then check them with `npm run verify:performance-artifacts`.
