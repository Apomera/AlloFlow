# Offline-media integration candidate

Prepared against local HEAD `1a5067ab673408d8bf33fc6998ab843696043859` and the current working files. No production file, generated output, Git state, build or test was changed or run by this audit. `source-test-tool.patch` applies strictly in memory, with zero fuzz; every result round-trips to the candidate hash in `manifest.json`. This is applicability evidence, not runtime validation.

Packaging correction: the initial added translation test used an unescaped replacement string, expanding two literal `$&` values into the patch anchor and causing a syntax error. The root integrator repaired those two production-test literals. This report candidate/patch was then corrected independently without touching production files; all seven final candidates pass static syntax parsing. That correction changes test packaging only.

The five isolated commits through `8bc25aebf8c07d1e4ce1029ca261a1edfbfe556d` are not all missing. Historical integration already included the changes through `8b26a875a948a1b70da948ad3d759b858db5f7e1`. Only `e47c7335d05585d2a3fcd2dc952460bfee6fec39` and `8bc25aebf8c07d1e4ce1029ca261a1edfbfe556d` supply the missing increments here.

## Candidate scope

- `read_aloud_artifact_audio_source.jsx`: requested provider/model identity remains separate from actual synthesis provenance, including fallback, fetched URLs, repeated preparation and existing teacher recordings.
- `AlloFlowANTI.txt`: one narrow `moduleValue.create` dependency supplies current provider/backend/model settings. Existing host changes and all loader pins are preserved. The integrator must synchronize this hunk to both desktop source hosts.
- `export_source.jsx`: picture recovery runs per reference on an export-owned copy, bypasses pictures for text-only exports, preserves available pictures/text after individual failures, checks cancellation, counts missing referenced pictures, and excludes invalid pictures from portfolio items.
- Three focused test files and `dev-tools/check_offline_storybook_recovery.cjs`: import the new owner coverage and browser check without discarding current shared assertions.

The shared `read_aloud_audio_service_source.jsx` contains newer Track02 profile/readiness safeguards and is intentionally absent from this patch. The shared exporter’s `__alloT` helper and nine translated/missing-key warning assertions are preserved. The assertions now include the new recovery detail, and an additional case covers translated counts and literal dollar content.

## Translation and regeneration

Existing key `export.storybook.pictures_not_embedded` remains intact. A new optional key is requested:

```json
{"export.storybook.pictures_recovery_detail":"{omitted} omitted; {external} require their original source. Keep this export and retry when the missing pictures are available."}
```

The same English text is a runtime fallback. Placeholder replacement uses a callback and does not interpret dollar sequences. No catalog files were changed by this audit. Add the English key through the normal catalog integration process; additional language translations remain unsupplied.

After reviewing/applying the patch, regenerate only these module families from combined source:

```text
node _build_read_aloud_artifact_audio_module.js
node _build_export_module.js
```

These commands write generated root/public modules. Derive `ReadAloudArtifactAudioModule` and `Export` content-hash pins from the resulting bytes and synchronize their precise loader references in all three hosts. Do not use the isolated branch’s pin values or generated files. Existing source builders and Storybook modal sources already contain the earlier integration and require no import from that branch.

## Focused acceptance commands

Not executed by this audit:

```text
node node_modules/vitest/vitest.mjs run tests/adventure_storybook_read_aloud_export.test.js tests/offline_media_recovery.test.js tests/offline_media_reader_integration.test.js tests/read_aloud_artifact_audio.test.js tests/read_aloud_artifact_host_integration.test.js tests/read_aloud_artifact_contract.test.js tests/persona_session_artifact.test.js tests/read_aloud_audio_service.test.js --maxWorkers=1
node dev-tools/check_offline_storybook_recovery.cjs
node dev-tools/check_reader_release.cjs
node dev-tools/check_deploy_mirror.cjs
```

Tests may write runner caches. The Storybook browser checker uses disposable browser data/IndexedDB and a temporary fixture, and writes its report/screenshot into the existing offline-media report directory; inspect or redirect that output before invoking it. It does not prove whole-app cold-start offline support. The release and deploy-mirror checkers are read-only. Preserve the owner’s limits: in-flight picture/summary work may only observe cancellation when its existing request settles; external/blob picture dependencies remain explicit.

## Other isolated work identified

The prepared-help branch `b0dced1a5` is already source-integrated in the shared dirty reader, confirmed by `reports/prepared-help-deep-2026-09-27/completion.json`; do not merge its older reader wholesale.

Completed but missing detached preview/Tree Lab patches all strictly apply to current shared files in memory (zero fuzz):

- `C:/Users/cabba/.codex/worktrees/reader-preview-isolation/UDL-Tool-Updated/reports/reader-preview-focus/host-focus.patch` and `validation-focus.patch`: request-scoped preview narration isolation. New tests extract actual canonical host code. Depends on existing provider AbortSignal support and reader preview lifecycle events.
- The same worktree’s `reports/reader-preview-scroll/reader-scroll.patch`: one `overscrollBehavior: 'contain'` style on the preview modal. Regenerate reader with current helper/compiler inputs after applying.
- The same worktree’s `reports/tree-lab-experience/tree-lab-experience.patch` and `validation.patch`: completed field-guide UI and optional model-grown starting tree. Synchronize canonical/public Tree Lab source, import the six-case test, and process the 16 English entries in `new-translation-keys.json`. Detailed controls now sit in a disclosure, so existing browser locators may need to open it first. Scientific/model sections remain unchanged per owner evidence.

The newer performance candidate is also absent and applicable, but explicitly has an open latency acceptance gate: `C:/Users/cabba/.codex/worktrees/reader-performance/UDL-Tool-Updated/reports/reader-performance-current/README.md`. Its `reader-performance.patch` touches reader cache/range tracking, immersive timing/crawl preparation and reading-place duplicate-write behavior; `focused-tests.patch` adds/updates five suites. Owner measurements reduce helper calls, but comparison p95 worsened from 40.1 to 43.2 ms and in a repeat from 79.7 to 197.8 ms. It is not a finished performance acceptance result. Review/profile separately; do not silently ship it as an established improvement. No performance candidate was included here.

The final Track04 draft-confirmation/current-support increment was also missing. Its separate current-source packaging is at `../draft-mutation-integration/README.md`. Import its source/tests only, without the isolated generated reader or stale pins.
