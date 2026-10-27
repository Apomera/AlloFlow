# Original finding: clinical AI permission at dispatch

October 26, 2026. **Status: corrected in local source; release verification remains required.** The [implementation follow-up](clinical-ai-dispatch-followup.md) records the correction and current evidence. The sections below preserve the original finding, baseline and proposed correction; their open-status language describes that earlier checkpoint. This finding is separate from the completed [clinical lock-boundary correction](clinical-lock-followup.md). No real prompt, credential, provider account or external request was used.

## Reproduced behavior

Report Writer checks the protected session and clinical external-AI permission before and after editable prompt review, then calls the provider. The provider's managed request guard checks connection policy and credential identity. That guard does not also recheck the clinical feature's permission.

The proof uses the actual Report Writer wrapper, identifier-review gate, protected workspace and Gemini provider. It pauses the provider's asynchronous credential digest after prompt approval, removes `report-writer` from clinical `allowExternalAi` while leaving managed connection policy unchanged, and resumes. The synthetic transport invokes the actual provider `beforeRequest` callback, accepts one synthetic prompt and returns its result. The expected denial fails. A control which revokes the permission while editable review is still open correctly blocks the provider call.

The rerun produced **one passing control and one failing security expectation**. It invokes an injected transport rather than native fetch, so it proves the application's guard composition without sending data to a provider. Evidence and exact source hashes are in `tmp/clinical-ai-20261026/current-receipt.json`, `current-results.json` and `current.log`; the original baseline evidence is retained separately. The current service hash is `62b7adf8881cf8f18b7c0d2f3cdd1c385b0c9d9d5c6201e74f64c2f52ab4f489`.

## Scope and implementation points

| Source | Relevant boundary |
| --- | --- |
| `report_writer_module.js:3175` | Clinical permission before provider invocation; the result check verifies workspace/case identity, not current AI permission. Runtime reproduction covers this path. |
| `behavior_lens_module.js:101` | Similar pre-provider clinical check; timing risk is based on source review only. |
| `dynamic_assessment_module.js:6473` | Editable review and pre-provider clinical checks; timing risk is based on source review only. |
| `gemini_api_module.js:149` | Request snapshots and managed connection authorization. |
| `gemini_api_module.js:181` | Existing per-attempt `beforeRequest` composition. |
| `utils_pure_module.js:1038` | Synchronous check immediately before native fetch on retries. |
| `ai_backend_module.js:3671` | Corresponding local request context and transport guard. |
| `AlloFlowANTI.txt:3292` | Local text bridge does not forward additional request controls. |

Dynamic Assessment's current host/component blocks parent image/directive callbacks at lines 6592 and 6611. Dormant branches in its generic wrapper are not demonstrated active vulnerabilities. The proof does not show that managed endpoint or credential policy was bypassed, that a password was bypassed, or that the encrypted store was exposed.

## Required correction and verification

Introduce explicit immutable request controls, separate from Gemini's private branded request state. Capture a synchronous guard over the original workspace epoch, case/version, abort signal and clinical transmission permission. Forward it through the cloud and local host bridges, compose it with existing managed connection checks immediately before each native transmission, and preserve it through retry delays, model fallback, JSON repair and local fallback. Any later re-enabled directive/media path must explicitly inherit those controls. Permission denial must be terminal; it must not trigger retry or a different provider. A mutable global callback would mix concurrent requests and is unsuitable.

Also recheck before accepting a result; that can prevent stale UI updates but cannot undo a transmission. Tests must turn the digest-pause reproduction into a passing denial and cover retry/fallback revocation, independently scoped concurrent requests, host forwarding, text/vision/media routing, response-time revocation and a permitted unchanged request. Existing endpoint/key controls must remain effective.

## Current mitigation and ownership

Keep clinical `allowExternalAi: []` and Canvas real-record access disabled unless separately approved and configured. The default denial prevents this explicitly enabled clinical-AI path from starting. Where clinical AI is enabled, do not rely on a later permission revocation to stop an already approved request until dispatch propagation is corrected. A local lock, a post-response check or prompt review alone is not that correction.

This pass records the finding and proposed contract without changing shared provider/release code while the other security chat is reconciling those files. No deployment or PPS compliance claim follows from this evidence. Coordinate the subsequent request-boundary change with the release owner and validate the exact district deployment before sensitive-record use.
