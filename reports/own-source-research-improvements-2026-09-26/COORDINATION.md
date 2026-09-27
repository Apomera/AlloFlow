# Research integration handoff

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.

The five user-authorized document research improvements are implemented locally. No deployment or push was performed. The coordinator's water-cycle/Canvas web-search fix is preserved: exact topic query transport, useful grounded research before writing, explicit exhausted-research failure, and visible generation progress.

## Changes already applied

- Storage: versioned primary/fallback snapshots, fallback acknowledgment, queued saves/clear tombstones, legacy compatibility. Root/public Lumen evidence files match.
- Imports: explicit Keep both/Replace/Skip decisions, per-file save outcomes, unique retained copies, restriction-preserving replacement, fresh reads after prompts.
- Selections: source panel and Quick Start pass explicit document IDs. An empty array means none; selection never mutates the shared library's active flags. Both surfaces retain an independent web setting.
- Host: selectedOwnSourceIds and documentsOnly state; SourceInputShellView -> SourceInputPanel -> SourceGenPanel forwarding; wizard override forwarding; normalized lesson snapshot/autosave/reset/restore fields. Successfully imported legacy project files reset research preferences. Failed imports preserve them.
- Generation: Documents only selects exact excerpts and rejects altered/misattributed quotes. No search calls or extra factual prose are permitted in that mode; insufficient evidence leaves existing text intact. Empty selection and out-of-selection retrieval fail closed, including with a stale helper. Standards-only requests retain the standards goal.
- Citations: immutable supplied-passage snapshots, title/page/slide/version inspector, local links separate from web numbers, supplied-versus-cited counts, exact reference appendix. The appendix and links survive adaptation with Keep citations on and are removed when off. Reader links have correct dialog labels/targets, and escaped punctuation/entities remain literal.
- Status: SourceGenPanel receives generationStep and announces the current stage; mobile visibility was checked at 390px.

## Shared files already touched

AlloFlowANTI.txt and its two source mirrors; host_handlers_source.jsx/module/public mirror; view_sidebar_panels_source.jsx/module/public mirror; phase_o_misc_handlers_source.jsx/module/public mirror; phase_n_misc_helpers_source.jsx/module/public mirror; view_simplified_source.jsx/module/public mirror; content_engine_source.jsx/module/source mirror/public mirror; generate_dispatcher_source.jsx/module/public mirror; dev-tools/host_handlers_wave3_manifest.json.

The host dependency bag gained setSelectedOwnSourceIds and setDocumentsOnly; setUseOwnSources is now used by reset/restore as well. Unused value getters useOwnSources, selectedOwnSourceIds, and documentsOnly were removed from __alloHostDeps (the host still keeps and passes their state directly). The manifest dependency list was regenerated from actual __d reads. That includes persistOrganizerProgress, an already-present dependency from concurrent work, without changing its implementation.

Ten loader pins were updated to built content hashes: own_sources, content_engine, quickstart, view_misc_panels, view_sidebar_panels, phase_o_misc_handlers, phase_n_misc_helpers, host_handlers, generate_dispatcher, and view_simplified. The engine subsequently received the small standards-only prompt correction and was rebuilt; integration01 must recompute its final pin and all assembled pins.

## Ownership after coordinator message

Shared host/manifest/reader/global-pin edits and builds are now handed back to integration01. **Do not rerun finalize-host-contract.cjs or overlapping shared builders concurrently with integration01.** The prepare-integration script records already-applied one-time transforms; it is not an idempotent whole-workspace updater.

Source input/output hashes and mirror checks are recorded alongside this handoff. Preserve completed shared changes instead of replacing files with an older snapshot. Other chats' audio, preview, reader-place, dictionary, and delivery implementations were preserved.

## Validation

- Chromium: real TXT ingestion/retrieval, all three duplicate choices, selection independence, web state preservation, mobile stage display, and a citation snapshot after the file was replaced. Zero page errors. No live AI request was made.
- Independent run: 190/191 passed initially; its obsolete Quick Start import fixture was corrected to use the real helper contract, and all five Quick Start cases passed on recheck.
- Integrated run: 181/186 passed initially, including all behavior/query/privacy cases. Three legacy UI assertions and host build metadata needed alignment. Follow-up evidence is saved in the JSON reports.
- One pre-existing host extraction assertion expects resetCanvasWorkspaceSettings to be a mandatory one-line shim. The guarded optional shim already existed in the pre-integration snapshot and was preserved; that unrelated assertion is not claimed green.

Final counts and limitations are summarized in README.md after the last owned-source validation completes.
