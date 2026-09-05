# Generator and source-input shell CDN extraction — 2026-09-04

The generator/tool sidebar and source-input shell now live in the existing SidebarPanels CDN module. The host keeps its state, refs, effects, named actions, teacher/Create visibility conditions, and persistence. The extracted JSX receives explicit dependencies instead of closing over AlloFlowContent.

## Size and loading

| Measure | Bytes |
|---|---:|
| Canonical AlloFlowANTI.txt reduction from this pass | 67,210 |
| Reduction in each desktop shell copy | 67,211 |
| Original generator action block | 53,874 |
| Original source-input block | 24,320 |
| Updated compiled SidebarPanels module | 352,512 |
| Updated module gzip size | 61,571 |

Savings are calculated from the exact applied patches, including the new gate/prop wiring, loader wrapper, pin, and scoped whitespace cleanup. Whole-file snapshot differences also include concurrent work and should not be used to attribute this pass.

The module remains one existing request. Its SidebarPanels registration is now a truthy object exposing GeneratorActionsView and SourceInputShellView; all previous flat panel exports and the duplicate-load sentinel remain. Both views use the existing CDNModuleGate with a dotted module key and the shared __alloEnsureSidebarPanels loader. Missing modules show an inline loading surface; failed registry entries expose Retry. The loader uses the existing deduplication and failed-request recovery path. Host data remains available during retries.

The outer sidebar chrome now waits for the existing SidebarPanels module, whereas that chrome was previously inline. This is an explicit loading boundary, covered by fallback/retry checks. It does not introduce another network request or change the existing eager loading schedule. This reduces shell parsing/authoring size; it is not a measured full-app speedup or a claim that total downloaded bytes fall by the same amount.

## Preserved behavior

- Direct-child tool IDs, source input IDs, help keys and selectors remain, preserving the DOM structure used by tours, filtering and voice controls.
- GeneratorActionsView receives 413 explicit dependencies; SourceInputShellView receives 100. Existing panel components and FullPackRunView are reused.
- Catalog search, grouping, disclosure, Guided Mode restrictions, teacher actions and generation callbacks remain.
- Source upload controls retain the host file ref and busy guards. The existing inline PDF project callback moved with the view: its 64 MB limit, sanitizer requirement, asynchronous HTML binding, project/document epochs, stale-result checks, incomplete-project resumption and verification honesty are preserved. State and epoch ownership remain in the host.
- The extracted JSX matches the pre-edit snapshot after normalizing whitespace and two small accessibility safeguards: explicit type="button" on formerly implicit buttons and reduced-motion classes on animations/transitions. These maintain the sidebar module's existing accessibility contracts.
- Recovery dialogs, storage recovery and startup error handling remain inline.

## Build integration

The sidebar builder was missing from build.js COMPILE_PAIRS. It now exports the pure buildSidebarPanelsModule(source) function, and a narrow compile-pair entry invokes it. This avoids a future normal build updating a URL while leaving the extracted implementation stale. Requiring the builder does not rebuild files. Only the focused sidebar builder was executed during this pass.

```powershell
node _build_view_sidebar_panels_module.js
```

The canonical sidebar content pin is a23dbf56b3. Desktop URLs remain local and queryless. Publish the updated sidebar module before distributing the updated canonical shell. Existing shells remain compatible with the preserved flat exports and truthy registration. New shells require the new view exports.

## Validation

- 177 focused tests verified across completed runs: nine existing suites passed 166 tests; the new extraction suite passed all 11 on its final standalone run.
- Coverage includes source dependency closure, deterministic builder output, old exports/public mirror parity, direct-child IDs, host toggle/catalog callbacks, Guided Mode, upload guards, superseded readers, late verification after document changes, untrusted imported completion scores, missing sanitization, and gate failure/retry/latest props/timer cleanup.
- Existing sidebar WCAG, root-boundary, catalog, PDF verification, History navigation, Guided Mode completion, standards and math bridge suites passed. Presentation assertions now read the extracted source while host-policy assertions remain on the host. A stale Full Pack assertion also now reads its already-existing view module.
- One full-suite run hit the default 10-second beforeAll limit in the new fixture while parsing the full shell on the busy machine. The setup was reduced to the actual gate snippet, with a bounded 60-second hook deadline; its 11-test rerun passed. The 11 skipped tests from the timed-out run are not counted as passes.
- Isolated Chromium used local React, the actual compiled SidebarPanels module and CDNModuleGate, the existing compiled application stylesheet, and AppStyles. Pre-edit and extracted DOM matched except explicit button types/reduced-motion classes. Catalog typing/collapse/reopen, the real AnalysisPanel generation callback, source upload, busy locking, failed-module retry and retained host state passed with no page errors.
- Desktop and 390 px mobile screenshots were captured. The styled mobile screenshot was visually reviewed; the mobile fixture had no document-level horizontal overflow. The initial partial-stylesheet fixture was corrected before the final browser result.
- All three final shell files passed JSX parsing. The pure builder reproduces the checked-in module exactly; root/public bytes and canonical pin match. Scoped whitespace checks passed.
- Registry verification found all 186 scanned consumers valid, zero missing and zero suspect-null producers. The count decreased because existing panel call sites moved out of the host into their module; this is not a removal of panel exports.

Browser fixtures use controlled host callbacks and simulated CDN failure. These are focused integration checks, not live CDN availability, full-app Core Web Vitals or a comprehensive accessibility audit.

Evidence lives in scratch/sidebar-shell-extraction: exact patch manifests and snapshots, views.json, tests-final.log (166 passes plus the setup timeout), tests-extraction-final.log (11 passes), browser-check.cjs, browser-check.json, desktop/mobile screenshots and final-checks.json.

Shared-tree edits used fresh reads, exact anchors, and native .NET write handles. No snapshots were restored, no unrelated source files were regenerated, and no broad build, staging, commit or deployment was performed.
