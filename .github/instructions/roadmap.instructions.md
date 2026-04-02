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

### Phase A3 — Teacher Model Selection (v0.5.0)

| Task | Detail |
|------|--------|
| **A3.1** Teacher AI Backend Modal | Enhance `showAIBackendModal` in web app to auto-detect installed Ollama models, let teacher set "default for content generation" and "available for students" |
| **A3.2** Teacher model preferences | Store per-class in Firestore/PocketBase: `{ teacherModel: 'mistral:7b', studentModels: ['neural-chat:7b'] }` |
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
| **B1.1** Define module boundaries | Use AlloFlowANTI.txt's 38 `@section` markers as split points. Group into ~15-20 logical modules |
| **B1.2** Design module registry | Each module exports via `window.AlloModules.ModuleName` (matching existing pattern). Central `moduleLoader.js` handles lazy loading |
| **B1.3** Define shared dependencies | Create `sharedContext.js` provider injecting: React, hooks, `ai`, `t()`, `db`, Firestore refs, etc. |

### Module Map (from @section analysis)

| Module File | Sections Included | Load Trigger |
|------------|-------------------|--------------|
| `core/config.js` | CONFIG, SAFETY_CHECKER | Always (startup) |
| `core/providers.js` | CONTEXTS, PROVIDERS | Always (startup) |
| `core/ui_components.js` | UI COMPONENTS | Always (startup) |
| `core/localization.js` | LOCALIZATION STRINGS, HELPERS | Always (startup) |
| `modules/word_sounds.js` | WORD_SOUNDS_STRINGS, PHONEME_DATA, WORD_SOUNDS_GENERATOR, WORD_SOUNDS_REVIEW | When Word Sounds opened |
| `modules/visual_panel.js` | VISUAL_PANEL | When lesson has diagrams |
| `modules/allobot.js` | ALLOBOT, SPEECH_BUBBLE | When bot activated |
| `modules/student_analytics.js` | STUDENT_ANALYTICS | When teacher opens analytics |
| `modules/adventure.js` | ADVENTURE_SYSTEMS, ADVENTURE_UI | When Adventure Mode activated |
| `modules/games.js` | INTERACTIVE_GAMES | When any game launched |
| `modules/escape_room.js` | ESCAPE_ROOM, ESCAPE_ROOM_TEACHER | When Escape Room launched |
| `modules/live_quiz.js` | LIVE_QUIZ | When Live Quiz started |
| `modules/teacher.js` | TEACHER_DASHBOARD, TEACHER_GATE, QUICKSTART_WIZARD | When teacher mode active |
| `modules/learner_progress.js` | LEARNER_PROGRESS, CHARTS | When progress view opened |
| `modules/reader.js` | IMMERSIVE_READER, READ_THIS_PAGE, BILINGUAL_RENDERER, CAST_LOBBY | When reader activated |
| `modules/student_interaction.js` | STUDENT_SUBMIT, STUDENT_QUIZ, DRAFT_FEEDBACK, MISSION_REPORT | When student submits work |
| `app/main_app.js` | MAIN APPLICATION + APP EXPORT | Always (the shell) |

### Phase B2 — Extraction Tooling (v0.3.0)

| Task | Detail |
|------|--------|
| **B2.1** Build `extract_modules.js` | Reads AlloFlowANTI.txt, splits by `@section` markers, outputs individual module files into `local-app/modules/`. Uses IIFE + dependency injection pattern from existing extraction SKILL |
| **B2.2** Build `local_build.js` | Assembles the local app from modules via dynamic imports or `<script>` tags with the module registry |
| **B2.3** Create `local-app/` scaffold | `index.html`, `moduleLoader.js`, `sharedContext.js`, `modules/`, `package.json` for dev server |

### Phase B3 — Sync System (v0.3.0)

| Task | Detail |
|------|--------|
| **B3.1** Section fingerprinting | Each module file stores a hash of the source section (in a comment header). Sync script detects which sections changed |
| **B3.2** Build `sync_from_monolith.js` | Compares AlloFlowANTI.txt sections against module hashes. For changed sections: extract, transpile JSX, wrap in IIFE, update module file. Unchanged modules untouched |
| **B3.3** Build `sync_to_monolith.js` | If someone edits a module file directly, updates the corresponding `@section` in AlloFlowANTI.txt |
| **B3.4** Diff reporting | Before syncing: "3 modules changed, 12 unchanged, 1 new section detected" with per-module diffs |

### Phase B4 — Local App Runtime (v0.4.0)

| Task | Detail |
|------|--------|
| **B4.1** Module loader | `moduleLoader.js` — lazy loads modules when features activate. Uses `<script>` injection with `window.AlloModules` registration |
| **B4.2** Shared dependency context | `sharedContext.js` — React context providing `{ ai, t, db, user, isTeacherMode, ... }` consumed by all modules |
| **B4.3** App shell | `local-app/app.js` — minimal shell: header, sidebar, dynamic module mounting. Same UI as monolith but loading only what's needed |
| **B4.4** Admin integration | Admin Electron app serves local app via webAppServer. Modules loaded from local filesystem instead of CDN |

### Sync Flow Diagram
```
┌──────────────────────┐        sync_from_monolith.js        ┌──────────────────────┐
│  AlloFlowANTI.txt    │  ─────────────────────────────────>  │  local-app/modules/  │
│  (monolith source)   │                                      │  ├─ core/config.js   │
│                      │  <─────────────────────────────────  │  ├─ modules/games.js │
│  @section markers    │        sync_to_monolith.js           │  ├─ modules/bot.js   │
│  define boundaries   │                                      │  └─ ...              │
└──────────────────────┘                                      └──────────────────────┘
         │                                                              │
         │  build.js (existing)                                         │  local_build.js (new)
         ▼                                                              ▼
┌──────────────────────┐                                      ┌──────────────────────┐
│  prismflow-deploy/   │                                      │  local-app/build/    │
│  src/App.jsx         │                                      │  index.html          │
│  (CDN-based web app) │                                      │  (modular local app) │
└──────────────────────┘                                      └──────────────────────┘
```

---

## Execution Priority

| Priority | Phase | Version | Effort |
|----------|-------|---------|--------|
| **1 (NOW)** | A1 — Fix Wizard Model Flow | v0.2.24 | Small |
| **2** | A2 — Admin Model Manager | v0.2.25 | Medium |
| **3** | B1 — Architecture Design | — | Planning only |
| **4** | B2 — Extraction Tooling | v0.3.0 | Medium |
| **5** | B3 — Sync System | v0.3.0 | Medium |
| **6** | B4 — Local App Runtime | v0.4.0 | Large |
| **7** | A3 — Teacher Model Selection | v0.5.0 | Medium |

---

## Key Architecture Facts

- **Two preload files exist**: `admin/preload.js` (old, wrong API shape) and `admin/public/preload.js` (active). Only edit the `public/` one.
- **Two SetupWizards exist**: `admin/src/pages/SetupWizard.jsx` (active, used by App.jsx) and `admin/src/setup/SetupWizard.jsx` (orphaned). Only edit `pages/`.
- **Orphaned admin pages**: `AIConfig.jsx`, `Models.jsx`, `Dashboard.jsx`, `Services.jsx`, `Security.jsx`, `Settings.jsx`, `Cluster.jsx`, `Deploy.jsx` — all built but unreachable from `App.jsx` (no router).
- **AI config bridge**: Admin writes `~/.alloflow/ai_config.json` (filesystem). Web app reads `localStorage['alloflow_ai_config']` (browser). Bridge is `webAppServer.js` which injects the file config into served HTML as a `<script>` that writes to localStorage.
- **12 modules already CDN-extracted**: StemLab, WordSoundsModal, BehaviorLens, ReportWriter, StudentAnalytics, SymbolStudio, GamesBundle, SelHub, QuickStartWizard, AlloBot, TeacherModule, StoryForge.
- **38 `@section` markers** in AlloFlowANTI.txt define logical module boundaries.
- **Module extraction pattern**: IIFE wrapping + `window.AlloModules.Name` registration + JSX→createElement transpilation (documented in `.gemini/skills/module-extraction/SKILL.md`).
