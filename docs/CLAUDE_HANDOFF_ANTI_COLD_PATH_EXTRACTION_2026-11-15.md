# Claude Review & Handoff Plan: `AlloFlowANTI.txt` Cold-Path Extraction (2026-11-15)

**Status**: Plan only — **nothing in this plan has been executed yet**. Prepared for review and critique by Claude (or any next session) so implementation can proceed safely and incrementally.

**Builds upon**: `docs/anti_extraction_plan_2026-11-09.md`, `docs/sidebar_shell_extraction_2026-09-04.md`, `docs/persona_workspace_extraction_2026-09-04.md`, and `docs/flow_helper_extraction_2026-09-04.md`, updated with exact post-Wave-90 line numbers, current SHA-256 baselines, and new release/accessibility gates added between Nov 9 and Nov 15, 2026.

---

## 1. Current Baseline Snapshot (2026-11-15, Post-Wave 90)

- **Git `HEAD`**: `52bd738daaed2a6913b8f30545c582ee5ab4a654`
- **Working tree note**: ~780 modified/untracked files from multi-session Waves 1–90 sit uncommitted in the workspace. Per `AGENTS.md`, **never stage, commit, reset, or discard other sessions' uncommitted work** without explicit user authorization.
- **Host shell baseline (all 3 files byte-identical)**:
  - `AlloFlowANTI.txt`: `51,353` lines (`3,316,087` bytes / `3.32 MB`), SHA-256 prefix `e3289436a46e3f88`
  - `desktop/web-app/src/AlloFlowANTI.txt`: SHA-256 prefix `e3289436a46e3f88`
  - `desktop/web-app/src/App.jsx`: SHA-256 prefix `e3289436a46e3f88`
- **Embedded `_alloBrowserDeliveryManifest`**: releaseId `0b86b6a867287571b0dbbf48054ba928a3d84cd78fad46518611a0d79d75aeee` (`752` assets, `host current`).
- **Canonical reader (`view_simplified_module.js`)**: SHA-256 `c71de20ec0dc256e7d5c3c6cb001f6b7599c5780f44d75dbd3507a0c1e6c68fb` (`?v=c71de20e`), `node dev-tools/check_reader_release.cjs` = `PASS`.
- **Primary size hotspot**: `const AlloFlowContent = () => { ... }` spans **`L13577–L50795`** (`37,218` lines / `~2.38 MB`, ~72% of the file), causing Babel's `>500KB` code-generator deoptimization and increasing cold-boot parse/JIT cost on low-end Chromebooks.

---

## 2. Critical Post-Nov-9 Gotchas & Invariants (Read Before Editing)

Several repo gates and runtime contracts tightened after `docs/anti_extraction_plan_2026-11-09.md` was written. **Review these four points carefully before starting any cluster:**

### Gotcha 1 — Do NOT leave `node build.js --mode=dev --shell-only` output in `desktop/web-app/src/`
- `docs/anti_extraction_plan_2026-11-09.md` (Step 6) previously suggested running `node build.js --mode=dev --shell-only`.
- **Why that now fails**: `--mode=dev` rewrites `desktop/web-app/src/AlloFlowANTI.txt` and `desktop/web-app/src/App.jsx` with local `./*_module.js` URLs, which immediately fails `node dev-tools/check_reader_release.cjs` with `host-mirror-drift` and `reader-pin-mismatch`.
- **Current canonical host sync procedure**:
  1. Edit canonical `AlloFlowANTI.txt` (preserving `https://alloflow-cdn.pages.dev/...` URLs).
  2. Update `?v=<8-char-sha256>` loader pins in `AlloFlowANTI.txt` for every affected module in `build.js`'s `CONTENT_HASH_PINNED` set (currently 32 modules).
  3. Verify no concurrent session edited `desktop/web-app/src/AlloFlowANTI.txt` or `desktop/web-app/src/App.jsx`, then copy `AlloFlowANTI.txt` byte-for-byte to both files.
  4. Run `node dev-tools/build_browser_delivery_manifest.cjs --sync` across all 3 host files (which updates `_alloBrowserDeliveryManifest` identically in all 3 files).
  5. Run `node dev-tools/check_reader_release.cjs` and `node dev-tools/build_browser_delivery_manifest.cjs --check --host=AlloFlowANTI.txt` (both must exit `0`).

### Gotcha 2 — `_alloHostHandlers()` vs. `_alloHostHandlersOptional()` During Render
- `_alloHostHandlers()` returns `_alloHostHandlersPending` before `host_handlers_module.js` finishes loading. Every method on `_alloHostHandlersPending` returns a **Promise** (which is truthy in JS!).
- **Rule**:
  - Async event handlers (button clicks, menu actions) may use `const fn = (...__a) => _alloHostHandlers().fn(...__a);`.
  - Any helper called **synchronously during render** (e.g., `getTranslationBatchItems` at `L48751` or `getAnalysisSourceUndo`) **must** use `_alloHostHandlersOptional()?.fn(...)` with a deterministic synchronous fallback (`|| { items: [], kind: 'workspace' }`), never `_alloHostHandlers().fn(...)`.

### Gotcha 3 — Modal Accessibility Contract (Waves 73, 76, 85, 88, 89)
Any modal dialog extracted into a `view_*_source.jsx` module must either retain its host `useFocusTrap(ref, isOpen, onClose)` wiring **or** implement the full stacked-modal contract established across Waves 73–89:
- Ref-stabilize callbacks (`const onCloseRef = React.useRef(onClose); onCloseRef.current = onClose;`) with `[]` or `[effectiveDialogRef]` effect dependencies so parent re-renders **never** reset focus out of active `<input>` / `<textarea>` controls.
- Capture `initialOpenerRef` before mount if any child `useEffect` focuses an internal element on initial render.
- Register `{ root: dialog }` on `window.__alloFocusTrapStack` and yield `keydown` when another non-contained trap is on top.
- Walk ancestors from the modal's outer shell up to `document.body`, setting **both** `sibling.inert = true` **and** `sibling.setAttribute('inert', '')` (jsdom does not reflect `.inert = true` to the HTML attribute) plus `aria-hidden="true"` while skipping `SCRIPT|STYLE|LINK|TEMPLATE` (and skipping internal sibling overlays inside the same component shell).
- Coordinate `document.body.style.overflow = 'hidden'` via `window.__alloScrollLockState = { count, prev }`.
- Filter closed `<details:not([open])>` descendants (allowing only direct `:scope > summary`) and `getComputedStyle(el)` (`display === 'none' || visibility === 'hidden'`).
- Guard IME composition on `Escape` (`event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229`).
- Handle `Shift+Tab` when `document.activeElement === dialog` (`!dialog.contains(active) || active === dialog`).

### Gotcha 4 — `600+` Direct Source-Introspection Tests
- Over 600 test files read `AlloFlowANTI.txt` as text (e.g., `tests/anti_canvas_compile_clean.test.js`, `tests/host_handlers_wave3_extraction.test.js`, `tests/end_session_video_overlay_extraction_contract.test.js`, `tests/project_save_settings.test.js`, `tests/pass4_zero_ux_security.test.js`).
- **Rule**: Before moving any function or JSX block, grep `tests/` for the function name, `id=`, `data-help-key=`, and distinctive comments/strings. Update source-slicing unit tests to read the new `*_source.jsx` where appropriate while keeping host-wiring/shim contract assertions pointed at `AlloFlowANTI.txt`.

---

## 3. Recommended Extraction Clusters (With Verified Post-Wave-90 Line Numbers)

Do **one cluster at a time** (and ideally sub-slices within larger clusters), verifying all gates after each slice. Re-check exact line numbers right before editing in case another session has modified `AlloFlowANTI.txt`.

### Cluster 1 — Pure Zero-State Helpers (~110 KB, Lowest Risk)
All 15 helpers below were verified on 2026-11-15 to still be inline (`shim=false`) and read **zero** React component state/refs:

| Helper | Current Line in `AlloFlowANTI.txt` | Scope | Notes / Target |
| :--- | :--- | :--- | :--- |
| `_alloNormalizeDirectionsData` | `L4966` | File-scope | Directions schema normalization |
| `_alloEvaluateObjectives` | `L5125` | File-scope | Directions objective evaluation |
| `ALLO_PDF_REMEDIATION_CACHE` | `L5348` | File-scope | IndexedDB/cache wrapper for remediated PDFs |
| `_alloParsePreviewMarkdown` | `L5594` | File-scope | Lightweight preview markdown parser |
| `_alloBuildDirectionsResultAdapter` | `L5659` (`~149` lines, `7.3 KB`) | File-scope | Pure adapter |
| `ALLO_GENERATION_METRICS` | `L9135` | File-scope | Local generation telemetry helper |
| `ALLO_STORAGE_INVENTORY` | `L9666` | File-scope | Device storage byte/entry inventory |
| `resolveSavedFollowUpLivePlanTarget` | `L10747` | File-scope | Pure follow-up target resolver |
| `getLiveOrganizerReadiness` | `L11023` | File-scope | Pure live organizer readiness check |
| `alloSanitizeRosterIdentityHistory` | `L11362` (`~232` lines, `11.9 KB`) | File-scope | Roster history sanitizer |
| `alloNormalizeRosterIdentity` | `L11594` | File-scope | Roster identity normalizer |
| `buildSchoolRewardsRecognitionWorksheet` | `L12186` | File-scope | Pure worksheet builder |
| `_compactBlueprintRunForStorage` | `L32146` (`~175` lines, `8.7 KB`) | Inside `AlloFlowContent` | Zero component bindings — can hoist + extract |
| `_compactFullPackRunForStorage` | `L32345` (`~218` lines, `11.6 KB`) | Inside `AlloFlowContent` | Zero component bindings — can hoist + extract |
| `chunkText` | `L35040` | Inside `AlloFlowContent` | Pure string chunking helper |

- **Important loader constraint for file-scope helpers**: Anything called synchronously during initial boot or top-level initialization **must** live in a `CORE_BOOT_MODULES` script (e.g., `utils_pure_module.js` or a new `host_pure_helpers_module.js` loaded in `CORE_BOOT_MODULES` with a thin fallback if needed), **not** a lazy-on-demand module.

---

### Cluster 2 — Remaining Inline Cold-Path Modals & `activeView` Branches (~52 KB, Low Risk)
Pure presentation JSX inside `AlloFlowContent`'s `return (...)` (`L44654–L50794`, currently `6,141` lines / `492 KB`) that only mounts when opened or when a cold-path resource type is active:

#### 2A. Inline Modals & Overlays (~28 KB)
1. **Teach Live Start & Lesson Prep Modals** (`L44946–L44996`, `~51` lines):
   - `showSessionStartOptions` (`sessionStartOptionsRef`) and `showLiveLessonPrep` (`liveLessonPrepRef`).
   - Natural home: `view_share_session_surfaces_source.jsx` (`ShareSessionSurfaces` in `_build_first_wave_view_modules.js`, which already owns `HomeworkQrDialogView` and `ClassMailboxSetupView` right adjacent at `L44933` and `L44998`).
2. **Save Project, Header Translate & Cloud Sync Warning Modals** (`L48686–L48851`, `~166` lines):
   - `showSaveModal` (`L48686–L48746`, `saveModalRef` — preserve `data-save-project-backdrop`, `data-autofocus`, and encryption password warning tested in `tests/project_save_settings.test.js`).
   - `isTranslateModalOpen` (`L48747–L48814`, `translateModalRef` — note synchronous `_alloHostHandlersOptional()?.getTranslationBatchItems` call; opportunity to upgrade inline `Escape` handler to full focus trap + `inert` isolation).
   - `showCloudWarning` (`L48815–L48851`, `cloudWarningModalRef` — opportunity to replace `role="button" tabIndex={0}` backdrop anti-pattern with proper `role="presentation"` backdrop + modal focus trap).
   - Natural home: extend `view_cold_path_surfaces_source.jsx` (`ColdPathSurfaces`) **or** add a new `ProjectTranslateModals` entry in `_build_first_wave_view_modules.js`.
3. **Cold-Path Live/Gallery Overlays** (`L45089–L45104`, `L48298–L48371`, `~90` lines):
   - `showSharedHostedActivity` (`L45089`), student `quizSharedResults` dialog (`L48298`), and teacher `storyForgeSubmissions` gallery (`L48349`, keep `!_isCanvasEnv` FERPA gate in host!).

#### 2B. Remaining Inline `activeView` Branches (~24 KB)
Every major `activeView` already delegates to `window.AlloModules.*View` except these five inline blocks:
- `activeView === 'directions'` wrapper (`L46816–L46857`, `~42` lines) → fold into `view_directions_result_source.jsx`
- `activeView === 'udl-advice'` (`L47028–L47049`, `~22` lines) → `ColdPathSurfaces` or `view_inline_resource_surfaces_source.jsx`
- `activeView === 'math-fluency-maze'` (`L47428–L47456`, `~29` lines) → `ColdPathSurfaces` or `view_inline_resource_surfaces_source.jsx`
- `activeView === 'stem-assessment'` (`L47457–L47501`, `~45` lines — saved assessment results/plan viewer; preserve "never re-grades on open" invariant) → `ColdPathSurfaces` or `view_inline_resource_surfaces_source.jsx`
- `activeView === 'gemini-bridge'` (`L47558–L47598`, `~41` lines) → fold into `view_gemini_bridge_source.jsx`

---

### Cluster 3 — Project Save/Load, History Restore & Word Sounds Hydration (~125 KB, Medium Risk)
All confirmed still inline (`shim=false`) inside `AlloFlowContent`, suited for `host_handlers_source.jsx` (`createHostHandlers(__d)`) or a dedicated `word_sounds_sync_handlers` / `project_history_handlers` module:

- `hydrateWordSoundsFromSync` + companion readiness/sync helpers: **`L25180–L26112`** (`933` lines, `63.5 KB`)
- `saveProjectToFile`: **`L37046–L37221`** (`176` lines, `12.5 KB` — currently wrapped in `React.useCallback`; keep a stable `useCallback` wrapper in `AlloFlowContent` delegating to `_alloHostHandlers().saveProjectToFile(...)`)
- `_maybeSaveIncompleteProject`: **`L37236`**
- `_syncBuilderEditsToRemediation`: **`L38245`**
- `getExportPreviewHTML`: **`L39498`** (check if called synchronously during render — if so, use `_alloHostHandlersOptional()`)
- `executeSaveFile`: **`L39710`**
- `handleLoadProject`: **`L39887–L40072`** (`186` lines, `8.5 KB`)
- `recheckSourceAnalysis`: **`L40120`**
- `handleOpenHistoryResource`: **`L40214–L40961`** (`748` lines, `41.2 KB`)

---

### Cluster 4 — Generation, Blueprint, Reading-Support & Local-AI Runners (~70 KB, Medium Risk)
All confirmed still inline (`shim=false`) inside `AlloFlowContent`, suited for `host_handlers_source.jsx`:

- `applyAIConfig` (`L34612–L34788`, `177` lines, `8.9 KB`)
- `_sdTurboTryLocal` (`L34806`) & `callImagen` (`L34876`)
- `playSequence` (`L35463`)
- `_sendUdlToChat` (`L42297`)
- `handleExecuteBlueprint` (`L42734`)
- `_alloRunGenerate` (`L43015–L43260`, `246` lines, `8.5 KB`)
- `handleSubmitOrganizerReflection` (`L43446`)
- `handleReadOriginal` (`L43988`)

---

### Cluster 5 — Large `useEffect` Bodies (~280 KB, High Care — Design & Pilot Separately)
- Do **last**, after Clusters 1–4 are stable and committed.
- **Recommended pattern** (confirming `docs/anti_extraction_plan_2026-11-09.md` Option B): Keep every `React.useEffect(() => { ... }, deps)` hook call site unconditionally in `AlloFlowContent` so React hook indices never change, and delegate only the effect body to a module helper.
- **Async load subtlety for Claude to verify**: If the target module has not loaded yet when the effect first runs on mount, a naive `_alloHostHandlersOptional()?.runMyEffect(__d)` would silently no-op and **not** re-run when the module finishes loading unless the effect listens for `'alloflow:module-registry-changed'` (or awaits the lazy loader promise with a `cancelled` flag for cleanup!). Pilot on one small non-boot effect (~13 KB quiz-rules effect) with an explicit unmount-before-load cancellation test.

---

## 4. Explicit "Leave Inline" Keep-List

Do **not** extract any of the following from `AlloFlowANTI.txt`:
1. **Boot & module-delivery machinery**: `_alloCreateRuntimeGraphDeliveryPolicy` (`L287`), `_alloInstallRuntimeGraphHost` (`L735`), `_alloBrowserDeliveryManifest` (`L2336`), `CDNModuleGate` (`L6891`), `_AlloRecoverableLazyView`, `AlloFlowErrorBoundary`, and the startup module-loader effect (`L16655–L17195`).
2. **Pre-module recovery & credential gates**: `ALLO_WORKSPACE_RECOVERY` (`L9230`), `renderCanvasRecoveryLockedScreen`, `renderCanvasRecoveryProtectionSection`, `renderEducatorAccessCodeSection`.
3. **Core hooks, state, refs & dependency bags**: `useTranslation` (`L8042`), `useFocusTrap`, all `useState` / `useRef` / `useMemo` declarations, `__alloHostDeps` (`L13582`), `_alloPhaseOHandlersDeps` (`L15111`), `_alloPhaseKHelpersDeps` (`L26777`), `_alloGenerationHelpersDeps` (`L33289`).
4. **Boot-critical session transport adapters**: `_applyMbSessionAdapter` (`L1494`), `_applyLanSessionAdapter`, `writeToSession` (`L12340`).

---

## 5. Open Design Questions for Claude's Review

Before starting implementation, Claude should review and recommend answers on these four questions:

1. **Commit/Checkpoint First vs. Extract on Current Dirty Tree?**
   - `docs/anti_extraction_plan_2026-11-09.md` noted: *"Start after the current uncommitted work is committed and deployed, so each move is measured from a clean baseline."* With ~780 uncommitted paths currently in the working tree from Waves 1–90, should the user authorize a clean Git commit/release checkpoint **before** Cluster 1 begins so rollback/diffing of `AlloFlowANTI.txt` is trivial?
2. **Bundle Granularity in Cluster 2 (Extend Existing vs. New Modules)**:
   - Extending `ShareSessionSurfaces` (`view_share_session_surfaces_source.jsx`) and `ColdPathSurfaces` (`view_cold_path_surfaces_source.jsx`) avoids adding new `<script>` requests, loader stubs, and `build.js` entries, at the cost of slightly larger cold-path bundles (~20–30 KB each). Does Claude prefer extending those two existing `_build_first_wave_view_modules.js` entries or creating dedicated `view_project_translate_modals_module.js` / `view_inline_resource_surfaces_module.js` files?
3. **Destination for Cluster 1 File-Scope Pure Helpers**:
   - Should file-scope pure helpers (`L4966–L12186`) join `utils_pure_module.js` (already boot-loaded early) or a new `host_pure_helpers_module.js` added to `CORE_BOOT_MODULES`? (Note: `host_handlers_source.jsx` is lazy/deferred, so anything called before `HostHandlers` loads cannot go into `HostHandlers` without a synchronous fallback.)
4. **`host_handlers_module.js` Growth Ceiling**:
   - `host_handlers_source.jsx` is already substantial (`~11,600+` lines). For Clusters 3 & 4 (~195 KB combined), is it cleaner to split out a second lazy handler bundle (e.g., `project_history_handlers_module.js` or `word_sounds_sync_handlers_module.js` using the same `__alloHostDeps` bag) rather than putting all 195 KB into `host_handlers_source.jsx`?

---

## 6. Copy-Pasteable Build & Verification Checklist Per Slice

Whenever a slice is implemented, run these exact commands (respecting `AGENTS.md`: **1 Vitest process at a time**, `--maxWorkers=2`, never full `node build.js`, never `git add` / `git commit` without user approval):

```powershell
# 1. Build only the touched module(s), e.g.:
node _build_first_wave_view_modules.js ColdPathSurfaces ShareSessionSurfaces HostHandlers

# 2. Verify all 4 mirrors match (., desktop/web-app/public, desktop/app-build, desktop/web-app/build)
#    (_build_first_wave_view_modules.js writes all 4 automatically; custom builders may only write 2!)

# 3. Update any changed ?v=<8-char-sha256> pins in AlloFlowANTI.txt for modules in build.js CONTENT_HASH_PINNED,
#    copy AlloFlowANTI.txt -> desktop/web-app/src/AlloFlowANTI.txt & desktop/web-app/src/App.jsx,
#    and synchronize _alloBrowserDeliveryManifest across all 3 host shells:
node dev-tools/build_browser_delivery_manifest.cjs --sync --host=AlloFlowANTI.txt
node dev-tools/build_browser_delivery_manifest.cjs --sync --host=desktop/web-app/src/AlloFlowANTI.txt
node dev-tools/build_browser_delivery_manifest.cjs --sync --host=desktop/web-app/src/App.jsx

# 4. Run release, manifest, and translation gates (all must exit 0):
node dev-tools/check_reader_release.cjs
node dev-tools/build_browser_delivery_manifest.cjs --check --host=AlloFlowANTI.txt
node dev-tools/check_translation_keys.cjs

# 5. Run targeted Vitest suites sequentially (1 process at a time, maxWorkers=2):
npx vitest run --maxWorkers=2 --testTimeout=20000 tests/anti_canvas_compile_clean.test.js tests/host_handlers_wave3_extraction.test.js tests/browser_delivery_loaders.test.js
# ...followed by the slice's new extraction contract test + feature-specific suites.

# 6. Confirm shared Git index remains untouched:
git diff --staged --stat
```
