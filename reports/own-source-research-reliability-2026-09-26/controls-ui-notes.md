# Research controls reliability follow-up

Source panel and Quick Start now prefer the explicit `AlloOwnSources.readLibrary` result. A failed read preserves the most recently loaded list and the current lesson selection, displays a Retry action, and never presents a failed read as an empty library. Legacy `listSources` remains supported when `readLibrary` is absent. Independent web research remains available; documents-only generation waits for a successful document read.

The first successful import keeps document research enabled while its follow-up read completes. Import feedback reports saved, replaced, skipped and failed counts, with per-file failure messages. Source-panel Enter uses the same allowed predicate as its Generate button. Closing the panel releases a pending removal's busy state; an old removal response cannot replace a newer snapshot after reopening. A rejected old post-import refresh cannot publish feedback into a reopened panel or wizard. The detailed documents-only explanation appears only when that mode is selected.

Only `view_misc_panels_source.jsx`, `quickstart_source.jsx`, their root/public built modules and focused controls tests were changed for this follow-up. No engine, host, manifest or global translation file changes were made by the controls agent.

## Translation keys for integration

Both surfaces use these fallback labels when translations are missing. Interpolation for the import summary is performed by the component after translation lookup.

| Key | English fallback |
| --- | --- |
| `input.my_sources_import_summary` | `Saved {saved} document(s), including {replaced} replacement(s). Skipped {skipped}; failed {failed}.` |
| `input.my_sources_load_failed` | `Saved documents could not be loaded. Your selections have been kept. Retry loading, or continue with web search.` |
| `input.my_sources_last_loaded` | `Showing the last successfully loaded document list.` |
| `input.my_sources_retry_loading` | `Retry loading documents` |
| `input.my_sources_import_interrupted` | `Import could not finish. Retry loading documents to check which files were saved.` |

## Regression coverage

`tests/own_source_library_recovery_controls.test.js` renders the real built React controls and covers explicit empty selections, saved selections, failed reads and Retry, last-good snapshots, strict versus web generation, first-import delayed refresh, partial saves, stale removal after reopening, empty-library import, and truthful mode copy. Existing lesson controls, module load timing, helper import contracts and real sidebar prop-chain tests are run with it.

The builds use the existing source-specific build scripts. Their root modules and `desktop/web-app/public` mirrors are verified byte-identical.

Verification: the five-file controls/import/prop-chain suite passed 64 checks before the final rejected-refresh guard. After that guard, the dedicated recovery suite passed all 15 checks, including both newly added stale-rejection regressions. Focused `git diff --check` passed.

Final SHA256 values:

- `view_misc_panels_module.js`: `71c38634b235e48f8e6619ef7ab77b00ef89c781e409f9155133e172f1c4f7d6`
- `quickstart_module.js`: `ac2eb44c91e92588055d6629fee5583182ffd8a7311b9f094132a653bd472c62`
