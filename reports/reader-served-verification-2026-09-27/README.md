# Reader release verification and integration handoff

2026-09-27. Track 01 added a read-only served-byte gate. It compares a frozen successful local manifest with the published host text and its exact reader URL, using both ordinary and revalidated GETs. No shared host, reader, module, catalog, build output, Git state or deployed state was changed by this pass. No other sessions were contacted.

## Baseline and observed deployment

Initial observed local HEAD was `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`. Another owner moved HEAD to `a63e347b7d193cbc95b5fc3a9fec844322f1f455` (squid arm/propulsion work) before the successful local snapshot. `local-baseline.json` records all source/output/host/tool fingerprints and stable start/end HEAD; a dirty checkout is permitted and is identified by its bytes.

| Artifact | Captured local snapshot | Public bytes observed |
| --- | --- | --- |
| Canonical host SHA-256 | `bee7bd183381e82e6c497b02b64ccf3c76f08a0198e2e86acdb5df0040340c66` | `64bbad9a3b19e8c01dda90416c35ff355fb79d5d380ac962626e90fb66148b81` |
| Reader SHA-256 | `8f2dd725870ef19789fbf158bafec389506d3c0075159ce5cd1f7293ce970dcb` | `81e5082fa287dd8a3203f327bd10ae4fc253c92940591775786ebe5bc1ddb3fc` |
| Reader loader pin | `8f2dd725` | `81e5082f` |

The local gate passed. The live comparison correctly exited 1: ordinary and revalidated public host responses both differed from the newer local host and used a different reader URL. The tool did not follow that unexpected URL. A separate explicit GET of the observed URL then compared it with the previously recorded release commit, using read-only `git show` blob reads.

**Both public files match commit `0cc63c58e949fe6ed4f6c245db0746354653872f` exactly**, including byte counts, in both request modes. Host observations were at approximately 17:57 UTC and module observations at 17:58 UTC. This identifies those two deployed artifacts; it does not certify the entire release or current browser caches. All local files monitored around the served-check command retained both hashes and modification times. Evidence: `served-comparison.json`, `recorded-release-comparison.json`, `cli-runtime-stability.json`.

## Ranked evidence and limits

| Rank / classification | Exact source evidence | Outcome |
| --- | --- | --- |
| P1 reproduced local failure, integration pending | `AlloFlowANTI.txt:23510` wraps the explicit reading envelope again; `:23512` marks it encoded. `tests/connected_delivery_offline_envelope.test.js:27` checks failed-decoding status; `:36` checks valid prose. | Current-host reproduction: eight failures, one structured-resource control passed. Invalid envelopes become described as ready; valid explicit text gains a quoting layer. No corrupt production packet or live saved-state failure was reproduced. |
| P1 verification gap, implemented tooling | `dev-tools/check_deployed_reader.cjs:25` validates the frozen local evidence; `:85` compares served host/reader bytes and parses the actual loader. | Matching HEAD or an eight-character URL pin cannot substitute for a full response hash. Wrong content behind a correct pin and ordinary-cache/revalidation disagreement are covered by faults. |
| P2 bounded network failure handling, implemented tooling | `dev-tools/check_deployed_reader.cjs:48` uses GET-only requests, manual redirect handling, deadlines, stream limits and full-byte hashes. | Unavailable, redirected, partial, oversized and wrong-content responses fail. No fetched application code runs. |
| P2 mutable evidence, implemented tooling | `dev-tools/check_deployed_reader.cjs:137` captures the manifest before requests and checks its file again afterward. | Replacing or removing the manifest during a check fails, while the report retains the captured manifest hash. |
| Unverified deployment surfaces | `docs/reader-release-verification.md`, served-check limits and recorded release report. | Compiled app shell, Canvas pastes, installed desktop app, service workers, browser journeys and other modules were not revalidated in this pass. |

Existing safeguards remain: the local checker compiles canonical reader inputs in memory, verifies both generated outputs and all three host pins, and rejects files/HEAD changing during inspection. Its 20 existing fault/compatibility tests still pass. The new network gate makes no clean-checkout or signed-attestation claim and cannot prove global CDN propagation from one observation point.

## Source-to-output and ownership ledger

| Source / evidence | Output / consumer | Owner / dependency |
| --- | --- | --- |
| `reader_place_store.js`, `reader_support_drafts.js`, `view_simplified_source.jsx` | Pure compiler -> root/public `view_simplified_module.js` -> three host loader pins | Existing helper owners; track 10 currently owns bounded reader integration. Track 01 checks completed output. |
| `AlloFlowANTI.txt` | `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx`; later compiled app shells | Track 01 host/build integration; track 10 reader/pin work remains active. Track 11 released its completed engine/pin work during this pass; preserve and recheck it before broad synchronization. |
| Successful `check_reader_release.cjs --json` output | Frozen UTF-8 local manifest | Track 01; recapture only after the intended release inputs settle. |
| `dev-tools/check_deployed_reader.cjs` + supplied manifest + explicit HTTPS host-text URL | JSON evidence on stdout; no implicit artifact writes | Track 01 tooling, depending on the existing local checker/parser and pure compiler helper. No new packages. |
| `tests/deployed_reader_verification.test.js`, verification docs and this report | Fault regression and reviewable handoff | Track 01 only. |
| Track 13 `hydration-host-integration.patch` | Minimal serializer delta, then exact host mirrors and affected module pins | Pending track 01 integration; track 13 hydration modules are prerequisites and its retry lifecycle work is active. |

The initial planning-only restriction was superseded by the user's earlier approval, as recorded in the existing integration ownership ledger. The continuing scope remains local improvement and validation; no deployment, push, Git mutation or app-data operation was performed.

## Ordered integration queue

1. Preserve active track 10 reader/pin and track 13 retry/module work, plus the newly completed track 11 engine/pin work. Read current completion records and refresh baseline fingerprints; do not infer release from older handoffs.
2. Apply the existing bounded track 13 autosave patch only after the shared host window is free. Preserve explicit `json-text/v1` strings and their marker instead of wrapping them again. The same serializer covers ordinary and image-stripped quota saves. Preserve all unrelated host edits and require the three host copies to match before applying.
3. Change the candidate test to run the actual production serializer unconditionally after integration. Its current default applies the pending patch in memory; a green candidate run is not proof of an integrated fix. Run repeated full/quota save/reopen cases for malformed envelopes, valid quoted/JSON-looking/numeric/null prose, supported-original designation, immutability and structured resources. Refresh only completed dependencies' pins from their actual bytes.
4. Run focused assembled runtime checks, exact mirror/pin checks and the local reader gate against a stable snapshot. Capture release-specific source/output and compiled-shell manifests after the relevant builds; builds remain separate writing operations.
5. After separately authorized deployment, pass the frozen local reader manifest to the new served-byte command. Compare the actual compiled shell/other changed assets separately, then run affected journeys using served bytes and a normal service-worker reload. Any mismatch is investigated against the recorded release bytes, not assumed to be a defect in the latest local source.

## Validation and command side effects

48 tooling tests passed across two files: 28 new network/manifest/CLI cases and 20 existing compiler/local-verifier cases. Syntax/help and scoped whitespace checks passed. Fault fixtures make no live network requests. Real byte verification used four GETs in total: two host requests through the command against the new local baseline and two reader requests when reconciling the earlier release. The existing host observations were reused for that comparison. No live app operation or browser profile was used.

Autosave baseline evidence is separate: the first attempt could not start a Vitest worker and ran no tests; the isolated retry ran all nine cases, with eight expected defect reproductions and one control pass. The existing patch then passed all nine candidate cases in memory. See `autosave-baseline.json`, `autosave-baseline-retry.json` and `autosave-candidate.json`. This is a tested proposed fix, not an integrated production change.

```powershell
# Read/compile in memory; no files, network, Git or app-state writes.
node dev-tools/check_reader_release.cjs --json

# Four GETs at most; server logs/cache revalidation are possible. JSON to stdout.
node dev-tools/check_deployed_reader.cjs `
    --manifest reports/reader-served-verification-2026-09-27/local-baseline.json `
    --host-url https://alloflow-cdn.pages.dev/AlloFlowANTI.txt --json

# Writes ordinary test caches and the explicitly requested report; synthetic HTTP only.
node node_modules/vitest/vitest.mjs run tests/reader_release_verification.test.js tests/deployed_reader_verification.test.js --maxWorkers=1
```

The documented live command currently fails against this newer local manifest by design; the public host is a different captured version. Redirecting JSON to a file is an explicit shell write. The new verifier never builds, repairs pins, changes Git, deploys or copies fetched bytes into the workspace.
