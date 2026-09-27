# Document research improvements

Implemented locally on 2026-09-26. No deployment, push, or commit was performed; the shared checkout contains other active project changes.

## Behavior

1. **Reliable storage recovery.** A successful fallback save now survives reload even when IndexedDB still contains an older copy. Recovery acknowledges fallback state; clear/save operations share a queue and clear records a durable tombstone. Older stored projects remain readable.
2. **Explicit duplicate imports.** Same-name files offer Keep both, Replace, or Skip. Keeping both creates distinct identities; replacement preserves restrictions and version history. Import results report partial failures accurately.
3. **Selections belong to the lesson.** Generate Source and Quick Start use document IDs rather than changing the shared library's active flags. Selections and mode are saved/restored with workspaces; an explicit empty selection stays empty. Web search remains independent.
4. **Documents only means exact excerpts.** This option selects and validates literal passages from the chosen documents. It performs no web search and adds no model-written factual prose. Missing evidence or altered quotes stop the attempt and retain the existing source. Reading level, tone, and length do not rewrite excerpts; the UI explains this.
5. **Inspectable document citations.** Document links open the generation-time passage with its title, location, and version. Supplied and actually cited passages are counted separately. Exact references travel with the text for export and review, and are preserved during adaptation when Keep citations is enabled. Replacing an original file does not change an older snapshot.

The coordinated web-search fix is also preserved: research uses the exact public topic, waits for useful grounded results, reports failure explicitly, and displays the real research phase instead of always saying Writing. See [the regression handoff](../source-research-phase-regression/README.md).

## Verification

**340 focused checks passed across the verification runs and rechecks, covering 29 test files.** The latest result per file is recorded in [verification-summary.json](verification-summary.json). This is a consolidated result, not a single full-repository run.

One unrelated, pre-existing host extraction assertion remains: it expects resetCanvasWorkspaceSettings to be a mandatory one-line shim. The guarded optional shim already appears in the saved pre-integration host. It was preserved. The host pin, dependency, and generated-artifact checks passed after their metadata was aligned.

The final owned-source run passed **76/76**, including documents-only validation, saved settings, the complete React sidebar prop chain, water-cycle/Canvas research behavior, query transport/privacy, and link controls. Earlier storage, duplicate-import, citation conservation, exact quote rendering, and Quick Start checks are included in the consolidated count.

[Chromium smoke results](browser-result.json): real TXT ingestion/retrieval, Keep both/Skip/Replace, library-selection independence, web-toggle preservation, mobile research status at 390px, and citation inspection after replacement. Zero page errors. The status fixture simulated generation; neither this smoke test nor the controlled provider regressions used a live Gemini account.

## Shared integration handoff

Canonical research changes and their owned mirrors are in place. Shared host, manifest, reader, and global-pin ownership was handed back to integration01 after the coordinator identified overlap. **Final assembled bundle/pin verification remains with that task.** The final engine build expects content pin `04a718b3`; its host pin was deliberately left for the integration owner after the ownership handoff.

Exact landed scope, dependency changes, and handoff constraints: [COORDINATION.md](COORDINATION.md). Point-in-time input/output hashes: [integration-hashes.json](integration-hashes.json). Do not replay the one-time transform scripts or overwrite shared files from an older snapshot.

The current storage design still uses whole-project last-write behavior across separate tabs. Citation snapshots live on the current device; exported/adapted text retains the exact reference appendix when citations are kept, so its evidence remains readable without that device's snapshot store.
