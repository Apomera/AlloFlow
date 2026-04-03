---
name: roadmap
description: "Master roadmap for AlloFlow local app, Ollama model management, and modular architecture. Use when: planning features, making architectural decisions, or working on admin/local-app code"
applyTo: ["admin/**", "local-app/**", "src/**", "build.js", "AlloFlowANTI.txt"]
---

# AlloFlow — Master Roadmap & Architecture Plan

## PART A: Ollama Model Management (Admin + Teacher)

### Phase A1 — Fix Setup Wizard Model Flow (v0.2.24)

| Task | Detail |
|------|--------|
| **A1.1** Fix `admin/public/preload.js` | Expose `ollama` namespace: `onNoModels()`, `selectModel()`, `onPullProgress()`, `getInstalledModels()`, `getAvailableModels()`, `pullModel()`, `checkStatus()`, `checkUpdates()`, `onUpdateAvailable()` |
| **A1.2** Add model selection step to `admin/src/pages/SetupWizard.jsx` | New step between service selection and deployment: detect if Ollama is selected → show available models → let admin pick 1+ models → models get pulled during deployment phase |
| **A1.3** Fix deployment timeout | Remove 30s auto-default in `main.js`. The wizard explicitly sends the model selection before triggering deployment. The deployment pipeline reads the selection from `setupData.selectedModels` instead of waiting for an IPC event |
| **A1.4** Show pull progress in wizard | Wire `ollama:pull-progress` events to a progress bar in the deploying step |

### Phase A2 — Admin Model Manager (v0.2.25)

| Task | Detail |
|------|--------|
| **A2.1** Add navigation to `App.jsx` | Add sidebar/tab nav: Dashboard, Models, AI Config, Services. Route to the existing orphaned pages |
| **A2.2** Activate `Models.jsx` page | Wire to preload APIs. Admin can browse, pull, view, delete models |
| **A2.3** Activate `AIConfig.jsx` page | Admin sets default backend, models, TTS/image providers — writes to `~/.alloflow/ai_config.json` |
| **A2.4** Model status on Dashboard | Installed models count, active model, Ollama status indicator, update badge |

> ⚠️ **Note**: PocketBase is no longer used. Database layer uses **built-in SQLite** on the backend (Express/Node server bundled with the app). See Part C for local data architecture.

### Phase A3 — Teacher Model Selection (v0.5.0)

| Task | Detail |
|------|--------|
| **A3.1** Teacher AI Backend Modal | Enhance `showAIBackendModal` in web app to auto-detect installed Ollama models, let teacher set "default for content generation" and "available for students" |
| **A3.2** Teacher model preferences | Store per-class in SQLite (local) or Firestore (cloud): `{ teacherModel: 'mistral:7b', studentModels: ['neural-chat:7b'] }` |
| **A3.3** Student model restriction | Student's AIProvider only sees teacher-whitelisted models |

### Phase A Dependency Order
```
A1.1 (preload) → A1.2 (wizard step) → A1.3 (deployment fix) → A1.4 (progress)
                                                                       ↓
                                         A2.1 (nav) → A2.2 + A2.3 → A2.4
                                                                       ↓
                                                    A3.1 → A3.2 → A3.3
```

---

## PART B: Modular Local App + Sync System

### Phase B1 — Architecture Design (planning, no code)

| Task | Detail |
|------|--------|
| **B1.1** Define module boundaries | ✅ Done — 30 `@section` markers cataloged (see Module Map below). 6 already fully extracted standalone files (no @section left in monolith). 6 CDN-stubs (section still present but content already in separate CDN module file). 18 sections are new to local app. Grouped into 17 logical modules |
| **B1.2** Design module registry | ✅ Done — `window.AlloModules.ModuleName` (matches existing CDN pattern). `moduleLoader.js` lazy-injects `<script>` tags; modules signal load via `window.AlloModules.__loaded` registration |
| **B1.3** Define shared dependencies | ✅ Done — `sharedContext_local.js`: React, `ai` (Ollama-only), `t(key)` (localization), `db` (SQLite REST client), `user` (local auth state), `isTeacherMode`, `audioBank`, `globalMuteEnabled`, `onMute` |

### Module Map (verified from 30 @section catalog)

| Module File | @Sections Included | Line Range | ~Lines | CDN Module | Load Trigger |
|------------|-------------------|-----------|--------|------------|--------------|
| `core/bootstrap.js` | *(pre-core — no @section)* | 1–285 | 285 | New | Always |
| `core/utilities.js` | GLOBAL_MUTE | 286–310 | 25 | New | Always |
| `core/audio.js` | LARGE_FILE_HANDLER | 311–664 | 354 | New | Always |
| `core/safety.js` | SAFETY_CHECKER | 665–780 | 116 | New | Always |
| `modules/word_sounds.js` | WORD_SOUNDS_STRINGS, PHONEME_DATA, WORD_SOUNDS_GENERATOR, WORD_SOUNDS_REVIEW | 781–4399 | 3619 | ✅ WordSoundsModal | Word Sounds opened |
| `modules/visual_panel.js` | VISUAL_PANEL | 1439–2677 | 1239 | New | Lesson has diagrams |
| `modules/analytics.js` | STUDENT_ANALYTICS, CHARTS, LEARNER_PROGRESS | 4400–5788, 11782–11913, 13533–14082 | 2070 | ✅ StudentAnalytics | Teacher opens analytics |
| `modules/student_interaction.js` | STUDENT_SUBMIT, MISSION_REPORT, STUDENT_QUIZ, DRAFT_FEEDBACK | 5789–6042, 8599–9236 | 893 | New | Student submits work |
| `modules/allobot.js` | SPEECH_BUBBLE, ALLOBOT | 6043–8598 | 2556 | ✅ AlloBot | Bot activated |
| `modules/teacher.js` | TEACHER_GATE, TEACHER_DASHBOARD, QUICKSTART_WIZARD | 9237–9601, 14083–16478 | 2863 | ✅ TeacherModule + QuickStartWizard | Teacher mode active |
| `modules/adventure.js` | ADVENTURE_SYSTEMS, ADVENTURE_UI | 9602–10584, 10906–11781 | 1858 | New | Adventure Mode |
| `modules/games.js` | INTERACTIVE_GAMES | 10585–10905 | 321 | ✅ GamesBundle | Game launched |
| `modules/escape_room.js` | ESCAPE_ROOM, ESCAPE_ROOM_TEACHER | 11914–12704 | 791 | New | Escape Room |
| `modules/live_quiz.js` | LIVE_QUIZ | 12705–13532 | 828 | New | Live Quiz |
| `modules/cast.js` | CAST_LOBBY | 16621–23673 | 7053 | New | Cast/multi-device |
| `modules/reader.js` | IMMERSIVE_READER, READ_THIS_PAGE, BILINGUAL_RENDERER | 16479–16620, 23674–25900+ | ~2350 | New | Reader activated |
| `app/main.js` | *(main app shell — after BILINGUAL_RENDERER)* | 25900+–end | ~3000+ | New | Always |

**Already fully extracted (no @section in monolith — separate standalone files):**
`stem_lab_module.js`, `behavior_lens_module.js`, `report_writer_module.js`, `symbol_studio_module.js`, `sel_hub/sel_hub_module.js`, `story_forge_module.js`

> ⚠️ **Note on overlapping ranges**: VISUAL_PANEL (1439–2677) falls inside WORD_SOUNDS_STRINGS+ block. In the monolith, visual_panel is nested. During extraction, use its explicit `@section` markers as the split boundary regardless of surrounding section.

> ⚠️ **CRITICAL NOTE on BILINGUAL_RENDERER size**: AlloFlowANTI.txt is **68,853 lines** total (verified). BILINGUAL_RENDERER starts at line 25865 and extends to line 68,820 (≂42,956 lines). Most of the main app JSX components live in this section. Only the final 33 lines (`function App()` / export) split off as `__main_app__`. The `modules/reader.js` group therefore includes the bulk of the app UI. In B4/module-splitting, BILINGUAL_RENDERER will likely need manual subsectioning.

### Phase B2 — Extraction Tooling (✅ Complete)

| Task | Detail |
|------|--------|
| **B2.1** `scripts/extract_modules.js` | ✅ Done — Reads AlloFlowANTI.txt, splits 30 @sections + pre-core + main-app into 32 tagged files in `local-app/modules/raw/`. SHA-256 hashes per section in `manifest.json` |
| **B2.2** `scripts/extract_modules_local.js` | ✅ Done — Same + C1 cloud stripping (block-comment replacements to avoid breaking arrow functions). Outputs `local-app/modules/local/` with `manifest_local.json`. 134 cloud replacements across 6 sections |
| **B2.3** `local_build.js` | ✅ Done — Assembles all local sections in SECTION_ORDER into `local-app/src/LocalApp.jsx` (69,222 lines / 4574 KB). Compiles with esbuild JS API (not CLI, NodeJS v25 compat). Output: `local-app/build/app.js` (2574 KB minified) |
| **B2.4** `local-app/` scaffold | ✅ Done — `public/index.html` (React CDN + CSP + Ollama health check), `package.json`, `moduleLoader.js` (B4.1 stub), `sharedContext_local.js` (B4.2 impl), `server.js` (dev server), `src/bootstrap_local.js` (override stub) |

### Phase B3 — Sync System (v0.3.0)

| Task | Detail |
|------|--------|
| **B3.1** Section fingerprinting | Each module file stores a hash of the source section (in a comment header). Sync script detects which sections changed |
| **B3.2** Build `sync_from_monolith.js` | Reads AlloFlowANTI.txt, extracts to **web app modules** (cloud-enabled). Compares sections against module hashes. For changed sections: extract, transpile JSX, wrap in IIFE, update module file |
| **B3.3** Build `sync_from_monolith_local.js` | Reads AlloFlowANTI.txt, extracts to **local app modules** (cloud-stripped). Uses `extract_modules_local.js` to remove cloud code during sync |
| **B3.4** Diff reporting | Before syncing: "3 modules changed, 12 unchanged, 1 new section detected" with per-module diffs (separate for web vs local) |

### Phase B4 — Local App Runtime (v0.4.0)

| Task | Detail |
|------|--------|
| **B4.1** Module loader | `moduleLoader.js` — lazy loads modules when features activate. Uses `<script>` injection with `window.AlloModules` registration |
| **B4.2** Shared dependency context (Local-Only) | `sharedContext_local.js` — React context providing `{ ai, t, user, isTeacherMode, ... }` — NO Firebase, NO Gemini, NO cloud providers. Only Ollama chat + Piper TTS + SQLite data layer |
| **B4.3** App shell | `local-app/app.js` — minimal shell: header, sidebar, dynamic module mounting. Same UI as monolith but loading only local modules and without cloud features |
| **B4.4** Admin integration | Admin Electron app serves local app via webAppServer. Modules loaded from local filesystem (`local-app/modules/`) instead of CDN |
| **B4.5** Local-only AIProvider | Modified `ai.js` for local app: Ollama is the ONLY chat backend (no Gemini fallback), Piper is the ONLY TTS (no cloud fallback), no image generation defaults |

---

## PART C: Local-Only Deployment (v0.3.0 - Parallel with B2/B3)

### Phase C1 — Code Stripping & Cloud Removal

| Task | Detail |
|------|--------|
| **C1.1** Strip Gemini imports | Remove all `@google-cloud/generative-ai` imports, Gemini API calls, and Gemini fallback logic from local modules |
| **C1.2** Strip OpenAI imports | Remove all `openai` imports, OpenAI API calls, and OpenAI TTS/image endpoints from local modules |
| **C1.3** Strip Firebase imports | Remove Firebase auth, Firestore listeners, and cloud listeners. Keep local data persistence only (IndexedDB, localStorage) |
| **C1.4** Remove hybrid provider patterns | Delete all "try cloud API, fallback to local" code. Make local backends the ONLY option |
| **C1.5** Remove WebSearchProvider | Search features only in web app. Not in local app |

### Phase C2 — Local Backend Enforcement

| Task | Detail |
|------|--------|
| **C2.1** AIProvider for local | `ai.js` variant: Chat → Ollama only (HTTP `localhost:11434`), TTS → Piper only (WASM `window._piperTTS`), Images → none (disable feature) |
| **C2.2** Database provider | **Built-in SQLite** (bundled with backend server, no external process). No PocketBase, no Firebase option |
| **C2.3** No cloud auth | Token-based auth via the local SQLite backend. No Google/email cloud auth, no PocketBase auth |
| **C2.4** Offline-first by default | All data persists to SQLite (backend) and IndexedDB (frontend cache). Local-only. No cloud sync |

### Phase C3 — Configuration Management

| Task | Detail |
|------|--------|
| **C3.1** Local config file | `~/.alloflow/local_config.json` defines Ollama host, Piper settings, SQLite DB path, data paths. No cloud API keys, no external database service |
| **C3.2** Admin overwrites defaults | When admin installs via setup wizard, values written to `local_config.json` (not cloud sync) |
| **C3.3** Runtime validation | If a local service is missing (Ollama, Piper, or the bundled backend), show clear error with setup link. No automatic fallback to cloud |

### Phase C Dependency Order
```
C1.1 → C1.2 → C1.3 → C1.4 → C1.5 (all stripping)
                                  ↓
        C2.1 → C2.2 → C2.3 → C2.4 (enforce local only)
                                  ↓
        C3.1 → C3.2 → C3.3 (config & validation)
```

---

## Application Outputs (Final State)

### Web App (CDN)
- **Source**: AlloFlowANTI.txt + prismflow-deploy/
- **Build**: `build.js` → prismflow-deploy/public
- **Runtime**: Firebase + Cloud APIs (Gemini, OpenAI, Firestore)
- **Fallbacks**: Hybrid (cloud → local → browser)
- **Deployment**: CDN served, cloud-backed
- **Status**: Unchanged (keep existing)

### Local App (Modular)
- **Source**: AlloFlowANTI.txt (extracted via `extract_modules_local.js`)
- **Build**: `local_build.js` → local-app/build/
- **Runtime**: Local only (Ollama + Piper + built-in SQLite backend)
- **Fallbacks**: None (local-only, fail-fast if service missing)
- **Deployment**: Served by Admin Electron app
- **Status**: NEW (parallel to web app, separate codebase after extraction)


---

## Execution Priority

> **Versioning rule (roadmap phases only)**: **Do NOT build the installer during active roadmap phase work (B1–C3).** Version bumps and installer builds for these phases happen once at the end when all roadmap phases are complete, implemented, and tested. This rule applies to the modularization and local-only deployment work only — it does not apply to admin app feature work (Phase A) or hotfixes.

| Priority | Phase | Target Version | Effort | Status |
|----------|-------|----------------|--------|--------|
| **1** | A1 — Fix Wizard Model Flow | v0.2.24 | Small | ✅ Complete |
| **2** | A2 — Admin Model Manager | v0.2.25 | Medium | ✅ Complete |
| **3** | B1 — Architecture Design | — (planning) | Planning | ✅ Complete |
| **4** | B2 + C1 — Extraction Tooling + Cloud Stripping | v0.3.0 | Medium | ✅ Complete |
| **5** | B3 + C2 — Sync System + Local Enforcement | v0.3.0 | Medium | ⏳ After B2/C1 |
| **6** | B4 + C3 — Local Runtime + Config | v0.4.0 | Large | ⏳ After B3/C2 |
| **7** | A3 — Teacher Model Selection | v0.5.0 | Medium | ⏳ After local app stable |

### Key Decision: Two-App Strategy (Starting v0.3.0)

Once B2 extraction begins, **two separate applications branch from the same source**:

1. **Web App** (CDN, cloud-enabled)
   - Build: `build.js` → prismflow-deploy/ (existing, no changes)
   - Runtime: Firebase + Gemini + OpenAI (hybrid with cloud fallback)
   - Deployment: Hosted CDN
   
2. **Local App** (Modular, local-only)
   - Build: `local_build.js` → local-app/build/ (new during B2)
   - Runtime: Ollama + Piper + built-in SQLite backend (no cloud, no external DB service)
   - Deployment: Served by Admin Electron app
   - Code: Cloud APIs stripped during extraction (Phase C1-C3)

**Sync strategy**: AlloFlowANTI.txt is the source of truth. When syncing:
- Web app extracts + keeps cloud code
- Local app extracts + strips cloud code (via filter in `extract_modules_local.js`)
- Both apps stay in sync with changes to shared sections

---

## Key Architecture Facts

### Existing Architecture
- **MonolithicSource**: AlloFlowANTI.txt contains **30** `@section` markers defining logical module boundaries (verified June 2025)
- **Two preload files exist**: `admin/preload.js` (old, wrong API shape) and `admin/public/preload.js` (active). Only edit the `public/` one
- **Two SetupWizards exist**: `admin/src/pages/SetupWizard.jsx` (active, used by App.jsx) and `admin/src/setup/SetupWizard.jsx` (orphaned). Only edit `pages/`
- **Orphaned admin pages**: `AIConfig.jsx`, `Models.jsx`, `Dashboard.jsx`, `Services.jsx`, `Security.jsx`, `Settings.xlsx`, `Cluster.jsx`, `Deploy.jsx` — all built but unreachable from `App.jsx` (no router)
- **12 modules already CDN-extracted**: StemLab, WordSoundsModal, BehaviorLens, ReportWriter, StudentAnalytics, SymbolStudio, GamesBundle, SelHub, QuickStartWizard, AlloBot, TeacherModule, StoryForge
- **Module extraction pattern**: IIFE wrapping + `window.AlloModules.Name` registration + JSX→createElement transpilation

### New Two-App Strategy (v0.3.0+)

**Critical rule**: As of v0.3.0, **maintain two separate code paths**:

1. **Web App** (cloud-enabled, stays as-is):
   - Source: AlloFlowANTI.txt + prismflow-deploy/
   - Extract: `build.js` (existing, no changes)
   - Runtime config: `ai_config.json` allows Gemini, OpenAI, Firebase
   - Fallback chain: Gemini → OpenAI → Browser TTS/local services
   - Deployment: CDN (no changes)
   - **DO NOT MODIFY** until local app is stable and separated

2. **Local App** (local-only, NEW):
   - Source: AlloFlowANTI.txt (extracted fresh with cloud code removed)
   - Extract: `extract_modules_local.js` (new, strips cloud during extraction)
   - Runtime config: `local_config.json` defines Ollama, Piper, SQLite DB path only
   - Fallback chain: NONE. Fail-fast if service unavailable
   - Deployment: Served by Admin Electron app (webAppServer)
   - **SEPARATE CODEBASE** after extraction (two module folders, two builds)

**AI config bridge** (for web app):
- Admin writes `~/.alloflow/ai_config.json` (filesystem)
- Web app reads `localStorage['alloflow_ai_config']` (browser)
- Bridge: `webAppServer.js` injects the file config into served HTML

**Local app config** (NEW):
- Admin writes `~/.alloflow/local_config.json` (filesystem)
- Local app reads at startup, configures services
- No web bridge needed (same machine)

**Database** (LOCAL APP):
- **Built-in SQLite** (bundled Node/Express backend, no external service to install or download)
- NOT PocketBase — PocketBase is no longer used
- Frontend accesses data via local REST API served by the bundled backend server
### Code Stripping Rules for Local App (Phase C)

**Remove from local modules**:
- All `import ... from 'firebase'` statements
- All `import ... from '@google-cloud/generative-ai'`
- All `import ... from 'openai'`
- All `try { cloud API } catch { local API }` patterns
- All `instanceof GoogleGenerativeAI` checks
- All Gemini/OpenAI endpoint URLs, API key handling
- All cloud auth flows (Google, email-based)
- All WebSearchProvider code
- All PocketBase references (`localhost:8090`, PocketBase SDK)

**Keep in local modules**:
- Ollama HTTP calls (`http://localhost:11434`)
- Piper WASM calls (`window._piperTTS`)
- Local REST API calls to built-in SQLite backend (bundled server)
- LocalStorage / IndexedDB persistence (frontend cache)
- Offline-first data structures
