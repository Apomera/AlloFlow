# Runtime and PDF security follow-up — 2026-10-26

Status: source hardening validated; generated publication remains held. No full application build, deployment, push, or existing public-module synchronization ran in this pass. The isolated DuckDB transform created only its new content-addressed asset.

## Changes

Runtime acquisition now cancels and aborts rejected responses before trying an approved fallback. Cleanup promises cannot hold rejection open. The existing 60-second acquisition deadline now bounds fetching, reading and hashing independently of whether the underlying operation responds to abort. A deadline ends that preparation; a later completion cannot execute code or populate the failed session. An explicit retry starts fresh.

Module imports hold temporary asset leases until they settle. Closing a session prevents a queued import, rejects an import or configuration result arriving after close, and defers URL revocation while an operation or another consumer still holds a lease. Concurrent loads share one configuration operation. The host also marks pending preparations as closing immediately, preventing their queued asset/worker requests from creating activity after a close request.

The closure scanner now rejects computed browser capabilities and simple Worker/importScripts aliases. This caught a real omission in DuckDB's original module: an exported worker helper acquired native Worker through a CommonJS adapter. A reproducible builder verifies the unchanged original source pin and makes exactly two AST-selected substitutions, binding that adapter and its worker-code fetch to the verified graph. The graph selects a new content-addressed module under `runtime_assets/data-kernel/`; original DuckDB files remain unchanged. Root and public copies were created exclusively, with conflict checks before any write.

The publication gate now also rejects dynamic imports, `Object.assign(..., {src: ...})`, and `Reflect.set(..., 'src', ...)` inside the reviewed classic loaders. A signed primary path cannot use those forms to conceal an unsigned fallback. These checks supplement reviewed hashes and source inspection; they are not an arbitrary-JavaScript sandbox or a claim of complete application-wide coverage.

Two independent PDF paths now use the reviewed PDF.js 3.11.174 library/worker pair: Compare obtains verified code and a worker lease through its same-origin opener, and Lumen loads the reviewed pair through the trusted host dispatcher. Both disable evaluation, applying [Mozilla's documented workaround for CVE-2024-4367](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq). Both reject unsigned fallback code, clean up on failure/pagehide, and protect replacement loads from late cleanup belonging to an older load. Compare now embeds the bounded timeout helper its popup actually calls.

## Validation

- 236 focused runtime, host, loader, document, data, optional-library and publication regressions passed.
- A final 24-case PDF/popup-XSS run passed, covering the final popup helper; it overlaps the preceding regression group.
- 22 release-builder, closure/provenance and source-adapter checks passed.
- 22 workflow security checks passed. The blocking workflow requires the new lifecycle/PDF tests and the reproducible closed-DuckDB check.
- 50 native browser cases passed with no skips and sandboxing explicitly requested. These cover the preserved real ONNX backends, Piper phonemization, Tesseract initialization, DuckDB queries and its exported worker-factory denial, recursive worker guards, resource cleanup/deadlines, real pending ES imports, PDF rendering/text extraction, tamper rejection, and lease cleanup.

The new PDF harness uses actual popup utilities rather than a synthetic timeout stub. Its receipt confirms that Chromium was launched without `--no-sandbox`, the captured owned browser process exited, and the fixture server closed. Test cleanup uses the browser-server owner and only its captured process handle; unrelated browser processes are not touched. Historical receipts remain separate from this pass's evidence.

Host memory pressure caused browser startup and test-worker allocation failures during intermediate runs. The affected checks passed on isolated recheck using the installed matching headless Chromium build, with sandboxing retained. A shell-startup timeout in the workflow fixture also passed on recheck without relaxing its assertions. These intermediate failures were not counted as passes or hidden by a sandbox fallback.

Native validation ran on Windows Chromium. Full voice/GPU model inference and OCR with downloaded traineddata remain outside this pass. No student data, production content, model weights or traineddata were downloaded or uploaded for validation.

## Publication and remaining coverage

The gate checks 19 canonical targets, with no canonical source errors. The stale compiled Compare module and public Lumen mirror remain blocked until coordinated regeneration. Generated App.jsx and public module mirrors were not refreshed here; the canonical host's owned runtime-policy block was updated.

Further execution boundaries remain outside the reviewed subset, including Harper and eSpeak import graphs; some document/export classic loaders and MathML conversion; and selected STEM paths such as Leaflet/globe, Aladin and Meshopt. They are follow-up work, not implicitly approved by the current inventory. Cross-platform browser acceptance and the coordinated generated-artifact/release checks must still precede deployment.

Evidence and current source hashes: `tmp/runtime-security-20261026/final-security-receipt.json`. Native PDF evidence: `tmp/pdf-private-runtime-security-20261026/browser-results.json`. The receipt records exact publication holds and individual test groups rather than summing overlapping suites.
