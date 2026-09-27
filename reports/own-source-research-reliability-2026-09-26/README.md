# Document research reliability follow-up

Local follow-up to the user's request to keep enhancing document research. No commit, push, deployment, live provider request or broad app build.

## Improvements

- A failed or corrupt library read is different from an empty library. The source panel and Quick Start provide a retry action and preserve saved selections and the last successfully loaded document list.
- Imports, replacements, removal and legacy active-flag changes cannot write over a library whose current contents could not be read safely. Older storage modules retain read compatibility but must be refreshed before mutation.
- First-import selection stays enabled while the saved-document list refreshes.
- Import feedback distinguishes saved files, replacements, skipped files and failures. Earlier successful saves are retained when a later file fails.
- Skip remains a no-op if another workspace removes a duplicate while its prompt is open. Successful removal returns the exact saved remaining list even if a subsequent storage read would fail.
- Old removal and import-refresh responses cannot overwrite a reopened panel. Enter uses the same generation guard as the button, and documents-only help appears only when that mode is selected.

## Storage contract

`createProjectStore.loadState()` returns `{ok, project, reason, medium}`. Any unavailable or corrupt configured backend makes a strict read uncertain; a readable copy may be older. Confirmed absence and saved clear tombstones return an explicit successful empty result. Strict reads opt into the existing host adapter's `throwOnError` option. Legacy `load()` retains its best-effort behavior for existing consumers.

`AlloOwnSources.readLibrary()` exposes `{ok, sources, reason}`. Research controls use this result without treating an error as zero selected documents. Mutations require the strict storage contract and perform no writes if it fails. Generated research still uses the existing web-query and citation paths; this pass changes no engine or host source.

## Verification and integration

Final verification: **249 passed, zero failed across 20 focused test files**, consolidated from the latest complete run per file in `verification-summary.json`. Tests cover storage uncertainty/corruption, import mutations, selection/retry lifecycle, strict excerpts, citations, query transport/privacy, research-before-writing and sidebar forwarding. A stale static Quick Start markup assertion in an intermediate run was aligned with the new condition; the final import suite and real confirmed-empty wizard behavior both pass.

**Six Chromium scenarios passed** against the final frozen module bytes with real browser IndexedDB/localStorage and injected read/write faults. They cover keyboard strict-mode guarding, failed initial load and Retry, failed import preservation, delayed first-import refresh, partial-save feedback and Quick Start recovery. All three mobile captures were visually reviewed; each had a 390px document width at a 390px viewport. There were zero page errors. `browser-reliability-result.json` records identical before/after/public module hashes.

All four changed root/public module pairs match. Scoped syntax/build and whitespace checks passed. `summarize-verification.cjs` records exact hashes and deduplicated test-file results without changing application files.

Only owned helpers, Quick Start and source-generation controls are changed. Shared host/reader/engine edits, global translations, manifests and final loader-pin updates remain with integration01. New fallback labels and module hashes are supplied separately for integration. Existing packaged app builds are not rebuilt here.

Integration should carry the helper, Lumen evidence and both controls together, along with current host storage-adapter bytes supporting `get(key, {throwOnError:true})`. The new helper deliberately refuses mutations through an older Lumen adapter without `loadState`; its message asks for a page refresh. Five optional translation fallbacks are listed in `controls-ui-notes.md`.

## Limits

These checks use controlled storage failures and mocked provider boundaries, not a live AI account. Cross-tab project writes retain the existing whole-project save behavior. Citation-cache retention and automatic recovery of citation inspection on another device are separate follow-ups; the exact passage appendix remains available in generated text.
