# Recovery audit: Word Sounds-only saves and host dependency bindings

Read-only source audit on 2026-10-03. The fixture below is prepared but has not been run by this agent. Production changes and serialized runners belong to the parent task. Source line references describe the audited baseline; later integration can shift them.

## Confirmed source defects

The Canvas autosave effect (`AlloFlowANTI.txt:35914–36067`) depends on all eight saved Word Sounds state fields, but its meaningful-work gate (`35920–35927`) checks only general history, units, profiles, responses, text/topic and the guided brief. A workspace containing only Word Sounds progress therefore never reaches `buildCanvasWorkspaceSnapshot`, although that actual builder includes its history, families, audio library, badges, mastery, daily progress, confusion patterns and score (`35363–35372`), and recovery normalization accepts meaningful Word Sounds-only drafts (`7435`, baseline line). The lock handler repeats the narrower gate (`host_handlers_source.jsx:3540–3547`).

The generated HostHandlers runtime receives live host dependencies through `__d`. The host-only snapshot builder and reset are local `const` functions in `AlloFlowContent` (`AlloFlowANTI.txt:35239` and `35286`). They are not globals, not local functions inside `createHostHandlers`, and had no getters in the baseline dependency object. Nevertheless these actual source branches call bare names:

- `lockCanvasRecoveryVault`: bare builder at `host_handlers_source.jsx:3548`, bare clear at `3568`.
- `eraseAllCanvasRecoveryVault`: bare clear at `3680`, after the controller has erased and verified storage.
- `eraseCanvasRecoverySnapshot`: bare clear at `4017`, after deleting the current stored snapshot and changing its ID.

The first call prevents normal save-before-lock; the clear calls leave reset/UI completion incomplete after lock or committed erase. For Word Sounds-only work, the omission skips the attempted snapshot write altogether. This audit does not claim unrelated preference storage or every browser reload loses that work: it proves the recovery path omits it and the runtime dependency calls cannot resolve.

## Minimal compatible integration

Add a shared host-local `hasMeaningfulWordSoundsWorkspace` immediately before the actual snapshot builder. Meaningful values are nonempty history/families/audio/badges/mastery/confusion containers, daily `completed > 0` or `goalMet === true`, and a finite positive numeric score field. Use it in the autosave gate and the lock gate. Do not infer work from the daily date: the actual initializer has today's date with zero completion and a false goal (`16608–16622`). Empty score fields are all zero (`11281`), and default arrays/maps are empty (`11265–11285`).

Route the four host-only calls through `__d`. Add precisely three live dependency getters and manifest dependencies: `hasMeaningfulWordSoundsWorkspace`, `buildCanvasWorkspaceSnapshot`, `clearCanvasWorkspaceState`. Keep the current queue, quota fallback, token guards, tombstone behavior and protocol intact. Selective generated-handler rebuild, mirror sync and host content pin updates are parent-owned. The existing `tests/host_handlers_wave3_extraction.test.js` checks exact getter/read/manifest parity and byte-identical generation through `_build_first_wave_view_modules.js.buildFirstWaveModule('HostHandlers', source)`.

## Prepared behavioral regression

Files: `word-sounds-recovery.test.js` and the exclusive `word-sounds-recovery.vitest.config.js` in this directory. There are 17 intended cases: nine individual Word Sounds-only autosaves; untouched defaults, date rollover and student-entry controls; Word Sounds-only and normal lock/save behavior; empty lock/reset; and both committed erase/reset branches.

The fixture mounts the actual host recovery `useEffect` with React, evaluates the actual snapshot builder, uses actual recovery normalization/quota helpers and queue code, and evaluates empty-state initializers from the host. It executes the actual generated HostHandlers factory in an isolated VM, exposing live host dependencies only through `__d`; no bare builder/reset global can mask the extraction defect. Only the persistence adapter, controller and reset observation are controlled. The reset observation records call order and clears the fixture's Word Sounds state; it does not duplicate the production reset implementation.

Extraction boundaries are the unique actual recovery IIFE through `_alloGetCanvasDeviceStorage`, actual queue through its immediate visibility effect, snapshot builder through `restoreCanvasWorkspaceSnapshot`, and autosave effect through `getSkippedResources`. The new shared predicate is extracted when present immediately before the builder, so the current host implementation is exercised without injecting a replacement into baseline runs.

Baseline overrides are `ALLO_RECOVERY_HOST_CANDIDATE` and `ALLO_RECOVERY_HANDLERS_CANDIDATE`, both filesystem paths resolved from the repo working directory. Preserve both before bytes, use both overrides for the baseline, and unset both for current production validation. No other ALLO candidate environment variables affect this fixture.

Suggested parent-owned command: invoke the existing Vitest runtime with `run --config reports/classroom-reliability-next-2026-10-03/word-sounds-recovery.vitest.config.js --reporter=json --outputFile=<unique-report-output>`. Capture the runner exit immediately before any environment cleanup. No tests, build, browser run or production write was performed by this audit agent.
