# Explicit recovery media-removal intent at the omission cap

Status: read-only source audit and report-local test/candidate preparation. No test, build, browser or production-write run by this worker. The coordinator owns validation and application.

## Concrete defect

The omission manifest is bounded to 500 entries. A workspace can reach this bound through 500 session-only preview URLs while still retaining valid embedded image/audio. Choosing **Remove media** removes the current stored bytes and reports success, but both native mutation implementations stop appending omission entries at the bound. The host/vault helper does the same. Thus no `user-remove-media` entry survives. The next real `buildCanvasWorkspaceSnapshot` checks only that reason to preserve explicit teacher removal; it sees 500 historical session/quota entries and copies live embedded media back into the saved workspace.

Separate imported-store path: host normalization blindly takes the first 500 entries. If a later actual explicit entry exists beyond that prefix, normalization loses it. Native stripping also takes this prefix before recording further omissions. This repeats the same loss of intent even when the imported payload contained the relevant evidence.

Current boundaries in `AlloFlowANTI.txt`: snapshot normalization at 7395–7427 (prefix cap at 7421); omission tracker at 7561–7576 (append cap at 7573); `removeMedia` at 7643–7656; quota ladder at 7677–7702; actual snapshot construction at 35212–35307 (reason check at 35302–35304). Local native `stripRecoveryMedia`/`removeMedia` are at `allo_device_storage_module.js:389–510`; bridge equivalents at `storage_bridge.html:451–572`.

## Minimal compatible proposal

Keep the bounded manifest and existing schema. When a full manifest has no explicit-removal entry, replace its last detail with the first **actual** `user-remove-media` entry emitted while removing media. During host normalization and all stripping initialization, retain an actual later explicit entry from an over-cap imported manifest in that last slot. Never manufacture teacher intent from a session/quota omission. Text, remote URLs, pins, the 500-entry bound and existing quota ladder remain intact. This substitutes one detail within an already-truncated log; it does not increase the log limit or redesign historical omission labels.

The client module and bridge fetch versions advance to `ds6-media-removal-intent` through the existing `?v=` query. Only the three host client URLs and two client `DEFAULT_BRIDGE_URL` constants change. There is no new desktop bridge mirror; `desktop/web-app/public/storage_bridge.html` does not exist. The existing three literal expectations in `tests/device_storage_bridge.test.js:246`, `:249`, `:263` need the matching token update by the coordinator. Handshake, consent, atomic acknowledgement, compare-and-swap and storage policy behavior are outside the replacements.

The proposal does not reconstruct previously discarded intent or media. Unique omission counting beyond 500 retained details remains a separate limitation: deduplication cannot remember every truncated path across later saves. No change to counts is proposed here.

## Reproduction and extraction contracts

`recovery_media_intent.test.js` contains sixteen actual-source cases: capped removal and next-save behavior for host/vault, native local and native cross-origin mutations; below-cap controls; later explicit entries during each stripping path; host over-cap normalization; session/quota-only controls; and preservation through the actual quota ladder. Synthetic data includes 500 distinct blob previews plus two valid embedded media values, pinned teacher text and a remote link. Assertions test desired behavior; failing baseline cases must not be reported as passing characterizations.

Extraction is guarded against missing/duplicate start markers:

- Host recovery block: `const ALLO_WORKSPACE_RECOVERY = (() => {` through the next `\n\nconst _alloGetCanvasDeviceStorage`.
- Actual host snapshot function: `  const buildCanvasWorkspaceSnapshot = async ` through `  const restoreCanvasWorkspaceSnapshot`.
- Native local helpers: `  function storageError(code, message)` through `  // Mirrors the monolith's _isCanvasEnv hostname heuristic`.
- Native bridge helpers: `  var RECOVERY_NAMESPACE = 'workspace_recovery';` through `  function kvSet(ns, key, value)`.

The fixture calls production normalizers, remove/strip mutations and snapshot builder. Its supplied environment contains source/history/settings bindings only; it does not replace removal or quota logic. No IndexedDB, messaging, CAS or browser/consent guarantee is inferred from these pure-helper cases. Existing native acceptance remains a separate validation surface.

## Coordinator commands

From the repository root, default preparation writes frozen before/candidate bytes and guarded patches only under `media-intent/`. It checks syntax without executing application code, verifies unique anchors and exact reverse-byte equality, records HEAD/hashes, preserves EOL/BOM/final newline and checks host/client parity. `--apply` is reserved for the coordinator and rechecks every prepared/production hash and the unchanged HEAD.

```powershell
node reports/classroom-reliability-followup-2026-10-03/prepare_media_intent.cjs
npx.cmd vitest run --config reports/classroom-reliability-followup-2026-10-03/media-intent.vitest.config.js --maxWorkers=1 --reporter=json --outputFile=reports/classroom-reliability-followup-2026-10-03/media-intent-baseline.json

$env:ALLO_RECOVERY_HOST='reports/classroom-reliability-followup-2026-10-03/media-intent/candidate/0-AlloFlowANTI.txt'
$env:ALLO_RECOVERY_CLIENT='reports/classroom-reliability-followup-2026-10-03/media-intent/candidate/3-allo_device_storage_module.js'
$env:ALLO_RECOVERY_BRIDGE='reports/classroom-reliability-followup-2026-10-03/media-intent/candidate/5-storage_bridge.html'
npx.cmd vitest run --config reports/classroom-reliability-followup-2026-10-03/media-intent.vitest.config.js --maxWorkers=1 --reporter=json --outputFile=reports/classroom-reliability-followup-2026-10-03/media-intent-candidate.json
Remove-Item Env:ALLO_RECOVERY_HOST,Env:ALLO_RECOVERY_CLIENT,Env:ALLO_RECOVERY_BRIDGE
```

The environment overrides select actual frozen source partners, independently; leaving them set would invalidate a claimed production-source result. Retain failed baseline and intermediate reports, and run the unchanged fixture against current production after a guarded application. No current CI, full build, deployed-byte or manual assistive-technology claim follows from these commands.
