# Vitest recovery investigation

Vitest did not recover. No test assertions failed: the single Ponzo suite reached `RUN v4.1.5` but did not collect tests before the 90-second driver guard terminated it.

The installed runtime is Node 24.11.1 arm64, Vitest 4.1.5, jsdom 29.1.0, and Undici 7.28.0.

## Established boundaries

- A minimal Node worker thread came online, returned `4`, and exited in 901 ms (`thread-smoke.json`).
- A worker imported Vitest's installed `dist/workers/threads.js` entry in 3,518 ms. Importing jsdom immediately afterward did not finish within 30 seconds (`entry-smoke.json`).
- A separate worker requiring jsdom stopped producing module trace entries after Undici's `lib/dispatcher/client` requested `../core/util.js`. The final trace entry was `BEGIN ../core/util.js` (`jsdom-module-trace.log`, `jsdom-trace.json`). This is an observed initialization boundary, not proof of a specific Undici defect.
- Directly reading Undici's `util.js` took 31 ms; compiling its 26,027 bytes with `new Function` took 2 ms (`undici-inspect.cjs`, saved `undici-util.js`).
- A copy of the 39 installed jsdom dependency packages in a task-local directory also failed to load jsdom within 30 seconds (`jsdom-closure.json`, `local-jsdom-smoke.json`). No dependencies were installed or upgraded. Relocation did not recover startup.
- `NODE_OPTIONS`, `NODE_COMPILE_CACHE`, and `NODE_DISABLE_COMPILE_CACHE` were unset. A memory snapshot showed approximately 3.1 GB free out of 16.8 GB (`resource.json`). These checks do not establish a memory-exhaustion cause.

Several basic shell and process-inventory diagnostics stalled. Four diagnostic shell sessions owned by this investigation were canceled by their exact tool session IDs. No unrelated processes were stopped; ownership of any older orphan workers could not be verified.

One escalated read-only diagnostic request timed out during automatic permission review. The same diagnostic then completed using the default sandbox, so that review timeout did not block the investigation.

No product, dependency, or repository test configuration was changed. No commits were made. The unresolved verification limit is jsdom/Undici initialization in the installed worker runtime, before test collection.
