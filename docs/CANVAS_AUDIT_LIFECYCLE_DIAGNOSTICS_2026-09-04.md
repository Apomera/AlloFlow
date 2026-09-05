# Canvas audit lifecycle diagnostic capture

Status: instrumentation prepared locally; no production deployment or live Canvas audit performed by this task. Throttle settings, provider timeouts, ownership gates, and root mounting behavior are unchanged.

## What changed

- AlloFlowANTI.txt records bundle execution, Canvas root creation attempts, root-boundary errors/restarts, host mount/unmount, committed document epochs, invalidation, and rejected/self-healable epoch mismatches.
- view_pdf_audit_source.jsx and its rebuilt module record modal mount/unmount. AuditGate and EpochGate records carry host/modal identity and both host epoch values.
- New IDs are diagnostic only. Effect replays retain their instance ID and increment an effect cycle, so StrictMode replay is distinguishable from a new instance.
- [Lifecycle] entries enter the existing exportable diagnostic log and a separate 200-entry buffer at window.__alloLifecycleDiagnostics.events. Realm IDs distinguish separate frames/navigations; bundle IDs distinguish execution within one realm.
- Root tracking observes calls through the Canvas bootstrap. A root created externally by the platform is not directly observed; host/modal lifecycle events still apply.

## Before a field run

Use the normal release process to deliver BOTH the changed host and the rebuilt audit module. A new host with an old CDN module supplies host events only; a new module under an old host deliberately keeps working without lifecycle events. Merely refreshing the current deployed app will not load these uncommitted local changes.

The workspace is shared with other active sessions. Review/stage specific changes; do not publish the entire worktree as a shortcut. In particular, AlloFlowANTI.txt also contains concurrent work unrelated to these diagnostics.

The existing builder does compile the view from JSX: build.js contains the PdfAuditView COMPILE_PAIRS entry. The handoff's claim that build.js excludes it is incorrect. The dedicated view builder was used and all three runtime mirrors were checked for exact parity.

## Capture protocol

1. Fully load the instrumented Canvas app, attach the same PDF, and verify file intake completed. An empty deterministic input invalidates the run.
2. Open Network before starting, preserve its log, and select “Run fresh (skip cached results).”
3. Keep Canvas in the foreground throughout the run.
4. Run Make Accessible and retain the complete application diagnostic log, including final ThrottleSummary if produced.
5. For failed provider requests, retain HTTP status and response body, model, start time, and duration. Do not share API keys, authorization headers, or the base64 document payload.
6. Save the lifecycle buffer before navigating/reloading. In the app iframe's DevTools execution context:
   JSON.stringify(window.__alloLifecycleDiagnostics?.events, null, 2)

## Reading the trace

| Signature | Interpretation |
| --- | --- |
| Same realm, new bundleId, “bundle executed” | The host bundle executed again. |
| “root creation requested” with a previousRootId | This bootstrap previously created/requested a root for the same container. It is a lead, not proof of the incident's cause. |
| Same hostId/modalId, effect cycle increases | Effect replay using the same retained instance identity. |
| Same hostId, new modalId | Modal replacement/remount within that host. |
| New hostId, refEpoch and renderEpoch reset to 0 | Fresh host state. Use bundle/root/boundary events to investigate why. |
| “host epoch mismatch”, canHeal:true | Incoming epoch matches the authoritative ref but the render mirror differs. |
| “host epoch mismatch”, canHeal:false | Incoming epoch differs from this host's authoritative ref; retain ownership rejection. |

Unmount cleanup reads the most recent snapshot instead of the original mount closure. A missing CLOSED record is no longer used as evidence that no unmount occurred.

## Validation

- 54 tests passed across 8 focused suites, including 6 new runtime tests.
- Tests exercise repeated bundle execution, actual React StrictMode effect replay, modal replacement, host remount with epoch reset, older-host compatibility, bounded/exportable logging, and repeated root creation.
- Host and view JSX syntax checks passed. Runtime module syntax and check_render_refs passed.
- Legacy check_free_vars cannot parse the host .txt as an ES module and reports the already documented NodeFilter/g findings on the modal; it is not a clean gate for these inputs.

Live capture remains pending: native/browser computer control failed to initialize, and the DevTools browser connection repeatedly reconnected with only a blank tab.
