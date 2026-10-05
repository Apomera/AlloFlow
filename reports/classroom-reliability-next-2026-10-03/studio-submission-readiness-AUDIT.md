# Studio submission readiness

Authored 2026-10-03. Source-backed finding; this worker has not run the regression or a browser. All fixtures are synthetic. No production files were edited.

`host_handlers_source.jsx:4167–4179` selects relevant resources, then filters out note-taking, anchor-chart, memory-aid, and applied-challenge when `window.AlloModules.StudioResponse` is unavailable. It also strips every raw `studio` response and restores bounded response entries only when the adapter exists. The resulting download/mailbox submission can therefore omit the learner's writing. The same handler still returns `{ ok: true, delivery: 'mailbox' }`, `{ ok: true, delivery: 'backup' }`, or `{ ok: true, delivery: 'download' }` at lines 4245, 4251, and 4260.

Repro: restore a synthetic studio portfolio with a nonempty `studentResponses[id].studio`, leave the studio adapter unavailable (for example a failed module load), then submit. The current handler emits a successful payload missing that studio resource and its writing. This is a direct code-path finding, not a browser-confirmed loader race. `AlloFlowANTI.txt:12819` excludes StudioResponse from core boot readiness; StudentInteraction and StudioResponse are loaded separately at lines 14535 and 14884.

`student_interaction_source.jsx:328–335` awaits `onSubmit`, treats `false` or `{ ok: false }` as unsuccessful, and closes the modal on success. Its `finally` block resets `submitting` at lines 337–339. A minimal handler guard can therefore keep the existing modal open for retry, use the existing loading toast, and return `{ ok: false, retryable: true }` before sanitization, provenance work, download, or upload. Ordinary submissions without studio resources remain available. The readiness check should require callable `supports`, `toSubmission`, and `toResponseEntries`, not merely a truthy module object.

`studio-submission-readiness.test.js` uses the full actual editable HostHandlers factory and shipped HostHandlers module, with the real StudioResponse adapter. For each of four studio types and both download/mailbox boundaries, it requires a retryable missing-adapter result without delivery or mutation, then verifies a retry preserves sanitized learner writing. Ordinary quiz controls require delivery without the adapter. A truthy partial adapter missing `toResponseEntries` must also block delivery. Twenty-four cases are defined; execution is reserved to the coordinator. This lane controls download/mailbox boundaries and does not certify external Drive delivery, mailbox chunk retries, or full browser loader/modal behavior.

The coordinator reproduced the initial baseline: sixteen studio loss cases failed the desired assertions; four ordinary-submission controls passed. This worker has not run the test. For candidate validation, set `ALLO_STUDIO_HOST_HANDLERS_SOURCE` and `ALLO_STUDIO_HOST_HANDLERS_MODULE` to the report-local source and rebuilt module paths. Both defaults remain the production files. The runtime bytes are evaluated directly in an isolated function against the test window, without the shared setup loader cache.

Coordinator invocation from repository root:

```powershell
node node_modules/vitest/vitest.mjs run --config reports/classroom-reliability-next-2026-10-03/studio-submission-readiness.vitest.config.js --maxWorkers=1
```

The runtime cases require rebuilding `host_handlers_module.js` after any source fix. Preserve a failing baseline before integration when feasible.
