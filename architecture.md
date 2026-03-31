# AlloFlow Architecture

## Overview

AlloFlow uses a **Hub-and-Spoke** architecture. A single monolithic orchestrator (`App.jsx` / `AlloFlowANTI.txt`) handles all core UI, state, routing, and AI interaction. Heavy feature modules load dynamically as JavaScript spoke files at runtime, keeping initial payload small enough to run on school Chromebooks.

```
AlloFlowANTI.txt / App.jsx          ← Core orchestrator (~67K lines)
│
│── ai_backend_module.js             ← Firebase shim & AI providers (loaded before React)
│
│── word_sounds_module.js            ← Phonemic awareness studio
│── word_sounds_setup_module.js      ← Word Sounds probe configuration
│
│── stem_lab_module.js               ← STEM Lab host + 19 inline tools
│   ├── stem_tool_dna.js
│   ├── stem_tool_physics.js
│   ├── stem_tool_cyberdefense.js
│   └── stem_tool_*.js               ← (55 extracted plugins, ~60 tools total)
│
│── sel_hub_module.js                ← SEL Hub host (CASEL 5 competencies)
│   ├── sel_tool_zones.js
│   ├── sel_tool_coping.js
│   ├── sel_tool_emotions.js
│   ├── sel_tool_mindfulness.js
│   ├── sel_tool_social.js
│   ├── sel_tool_decisions.js
│   ├── sel_tool_perspective.js
│   ├── sel_tool_conflict.js
│   └── sel_tool_advocacy.js         ← (9 SEL tools)
│
│── behavior_lens_module.js          ← Clinical FBA/BIP suite
│── report_writer_module.js          ← Psychoeducational report wizard
│── symbol_studio_module.js          ← AAC & visual communication
│── student_analytics_module.js      ← RTI probes & dashboards
│── math_fluency_module.js           ← CBM math fluency probes
│
│── games_module.js                  ← Games bundle (Memory, Matching, Timeline, Bingo, etc.)
│── story_forge_module.js            ← Scaffolded creative writing + AI illustration
│── adventure_module.js              ← Adventure UI (inventory, dice, shop, cast lobby)
│
│── teacher_module.js                ← Teacher analytics dashboard & live quiz controls
│── quickstart_module.js             ← Onboarding wizard
│── allobot_module.js                ← Animated mascot agent
│── visual_panel_module.js           ← Visual story planning grid
│── student_interaction_module.js    ← Student submission & draft feedback
│
│── help_strings.js                  ← Contextual help content
│── ui_strings.js                    ← i18n strings (18 languages)
└── audio_bank.json                  ← Pre-recorded phoneme audio
```

---

## Core Orchestrator

`AlloFlowANTI.txt` is the source-of-truth file; `prismflow-deploy/src/App.jsx` is the compiled counterpart kept in sync. Both files are approximately 67,000 lines and contain all core React component logic, state management, AI pipeline orchestration, gamification engine, and accessibility layers.

**Rules:**
- Do NOT split the core file into standard React components. AlloFlow must remain deployable as a single unified bundle for offline School Box instances.
- Do NOT use `grep` / ripgrep on this file — it contains emoji (non-ASCII bytes) that cause ripgrep to return zero results silently. Use PowerShell `Select-String` or the IDE's built-in search instead.

### Navigating the file

The file is organized using `// @section SECTION_NAME` markers.

```powershell
# List all sections
Select-String -Path AlloFlowANTI.txt -Pattern "// @section "

# Jump to a specific section
Select-String -Path AlloFlowANTI.txt -Pattern "@section STEM"
```

#### `@section` Marker Index

> **Note:** Line numbers are approximate and shift as the file is edited. Use `Select-String` to find current positions.

| Marker | Approx. Line | What It Covers |
|--------|-------------|----------------|
| `@section GLOBAL_MUTE` | ~175 | GlobalMuteButton |
| `@section LARGE_FILE_HANDLER` | ~199 | LargeFileHandler + modal |
| `@section SAFETY_CHECKER` | ~547 | SafetyContentChecker |
| `@section WORD_SOUNDS_STRINGS` | ~649 | i18n strings block |
| `@section PHONEME_DATA` | ~829 | Audio banks, IPA maps, word families |
| `@section VISUAL_PANEL` | ~1309 | VisualPanelGrid (comics) |
| `@section WORD_SOUNDS_GENERATOR` | ~2542 | Main Word Sounds component |
| `@section WORD_SOUNDS_REVIEW` | ~3356 | Session review panel |
| `@section STUDENT_ANALYTICS` | ~4260 | RTI probes & analytics |
| `@section STUDENT_SUBMIT` | ~9867 | Student submission modal |
| `@section SPEECH_BUBBLE` | ~10112 | Allobot speech bubble |
| `@section ALLOBOT` | ~10335 | Embodied tour agent |
| `@section MISSION_REPORT` | ~12527 | Quest summary card |
| `@section STUDENT_QUIZ` | ~12634 | Live quiz overlay |
| `@section DRAFT_FEEDBACK` | ~12959 | Draft feedback UI |
| `@section TEACHER_GATE` | ~13160 | Teacher verification |
| `@section ADVENTURE_SYSTEMS` | ~13459 | Ambience, effects, climax |
| `@section INTERACTIVE_GAMES` | ~14398 | Confetti, Memory, Matching, etc. |
| `@section ADVENTURE_UI` | ~17835 | Inventory, dice, shop |
| `@section CHARTS` | ~18699 | Charts & progress tracking |
| `@section ESCAPE_ROOM` | ~18830 | Escape Room student overlay |
| `@section ESCAPE_ROOM_TEACHER` | ~19451 | Escape Room teacher controls |
| `@section LIVE_QUIZ` | ~19619 | Live quiz broadcast |
| `@section LEARNER_PROGRESS` | ~20446 | Learning journey view |
| `@section TEACHER_DASHBOARD` | ~20940 | Main teacher dashboard |
| `@section QUICKSTART_WIZARD` | ~22095 | Onboarding wizard |
| `@section IMMERSIVE_READER` | ~23185 | Speed reader tools |
| `@section CAST_LOBBY` | ~23326 | Multi-device casting |
| `@section BILINGUAL_RENDERER` | ~32038 | Bilingual field display |

#### `#region` Blocks

Coarser section boundaries from the original structure:

| Region | Start | End |
|--------|-------|-----|
| CONFIGURATION & SETUP | L66 | L546 |
| LOCALIZATION STRINGS | L8832 | L8893 |
| HELPERS & UTILITIES | L8894 | L9696 |
| CONTEXTS & PROVIDERS | L9697 | L9737 |
| UI COMPONENTS | L9738 | L24060 |
| MAIN APPLICATION | L24061 | L67672 |
| APP EXPORT | L67673 | L67699 |

#### `@tool` Markers in stem_lab_module.js

Each inline STEM tool IIFE is marked with `// @tool TOOL_ID`:

| Category | Tool IDs |
|----------|----------|
| Math Fundamentals | `volume`, `numberline`, `areamodel`, `fractionViz`, `base10` |
| Advanced Math | `coordinate`, `protractor`, `multtable`, `funcGrapher` |
| Life & Earth Science | `cell`, `solarSystem`, `galaxy`, `rocks`, `ecosystem` |
| Physics & Chemistry | `wave`, `circuit`, `chemBalance`, `physics`, `dataPlot` |
| Arts & Music | `musicSynth` |

---

## Spoke Modules

Spoke modules are dynamically loaded at runtime via `loadModule()`. Each registers itself on `window.AlloModules` (or `window.StemLab` for STEM tools). If the CDN fetch fails, the orchestrator falls back to an inline stub so the app remains functional offline.

| Module | Purpose | Gate |
|--------|---------|------|
| `ai_backend_module.js` | Firebase shim factory, WebSearchProvider, AIProvider — loaded before React bundle | Public |
| `word_sounds_module.js` | Phonemic awareness studio — 8 activity types, ORF fluency coach | Public |
| `word_sounds_setup_module.js` | WordSoundsGenerator probe configuration | Public |
| `stem_lab_module.js` | STEM Lab host — ~60 tools across 10+ domains (55 extracted plugins + 19 inline) | Public |
| `sel_hub_module.js` | Social-Emotional Learning hub — 9 tools organized by CASEL 5 competencies | Public |
| `games_module.js` | Games bundle — Memory, Matching, Timeline, ConceptSort, Venn, Crossword, SyntaxScramble, Bingo, WordScramble | Public |
| `story_forge_module.js` | StoryForge — scaffolded creative writing with AI illustration, narration, grading, storybook export | Public |
| `adventure_module.js` | Adventure UI — MissionReportCard, ClimaxProgressBar, InventoryGrid, DiceOverlay, AdventureShop, CastLobby | Public |
| `visual_panel_module.js` | Visual Panel Grid — visual story planning and annotation | Public |
| `allobot_module.js` | Animated mascot — SpeechBubble, LandingDust, JetpackParticles, ReactionBubble, BotConfettiBurst | Public |
| `quickstart_module.js` | QuickStart Wizard — onboarding for new users | Public |
| `student_interaction_module.js` | StudentSubmitModal, DraftFeedbackInterface | Public |
| `behavior_lens_module.js` | FBA/BIP clinical suite — ABC data, IOA, scatterplot, preference assessments | TeacherGate |
| `report_writer_module.js` | 10-step psychoeducational report wizard, 15+ assessment presets | TeacherGate |
| `symbol_studio_module.js` | AI PCS-style AAC boards, visual schedules, social stories | TeacherGate |
| `student_analytics_module.js` | RTI Tier 1/2/3 probes, dashboards, CSV export | TeacherGate |
| `math_fluency_module.js` | K–8 grade-normed CBM math fluency probes | TeacherGate |
| `teacher_module.js` | Teacher analytics dashboard — roster management, live quiz controls, learner progress charts | TeacherGate |

**TeacherGate** is a runtime verification step that restricts clinical/assessment tools to educator accounts.

---

## STEM Lab Plugin Architecture

STEM Lab uses a secondary plugin pattern — each tool is a self-contained IIFE that calls `window.StemLab.registerTool(id, config)` on load. There are ~60 tools total: 55 as extracted `stem_tool_*.js` plugin files and 19 defined inline in `stem_lab_module.js` (with some overlap). The host renders whichever tool is active and passes it a shared `ctx` object containing React, tool state, and helpers.

### Plugin file template

```js
/**
 * stem_tool_yourname.js — [Tool Name]
 * [One-line description]
 * Registered tool ID: "yourToolId"
 */
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  window.StemLab.registerTool('yourToolId', {
    name: 'Your Tool Name',
    icon: '🔬',
    category: 'science', // math | science | tech | creative | social
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      // Your render logic using ctx.toolData and ctx.setToolData
    }
  });
})();
```

### Adding a new STEM tool

1. Create `stem_lab/stem_tool_yourname.js` following the template above.
2. Add the file to the `toolModules` array in **both** `AlloFlowANTI.txt` and `prismflow-deploy/src/App.jsx`:
   ```js
   var toolModules = [
     // ... existing tools ...
     'stem_lab/stem_tool_yourname.js'
   ];
   ```
3. After merging, update the CDN commit hash (see [Pinned Dependency Injection](#pinned-dependency-injection)).

### Finding existing STEM tools

```powershell
# List all registered tool IDs
Select-String -Path stem_lab/stem_lab_module.js -Pattern "@tool "
```

---

## SEL Hub Plugin Architecture

SEL Hub follows the same plugin pattern as STEM Lab. Each tool is a self-contained IIFE that calls `window.SelHub.registerTool(id, config)` on load. The host (`sel_hub_module.js`) organizes tools by the CASEL 5 social-emotional competency framework.

| Tool | Competency Area |
|------|----------------|
| `sel_tool_zones.js` | Self-Awareness |
| `sel_tool_coping.js` | Self-Management |
| `sel_tool_emotions.js` | Self-Awareness |
| `sel_tool_mindfulness.js` | Self-Management |
| `sel_tool_social.js` | Relationship Skills |
| `sel_tool_decisions.js` | Responsible Decision-Making |
| `sel_tool_perspective.js` | Social Awareness |
| `sel_tool_conflict.js` | Relationship Skills |
| `sel_tool_advocacy.js` | Relationship Skills |

### Adding a new SEL tool

1. Create `sel_hub/sel_tool_yourname.js` following the same IIFE pattern as STEM tools, but registering on `window.SelHub`.
2. Add the file to the `selToolModules` array in **both** `AlloFlowANTI.txt` and `prismflow-deploy/src/App.jsx`.
3. After merging, update the CDN commit hash (see [Pinned Dependency Injection](#pinned-dependency-injection)).

---

## Pinned Dependency Injection

AlloFlow does **not** use floating `@latest` or `@main` CDN tags. Every spoke module URL is pinned to an exact commit hash via jsDelivr CDN. This ensures deterministic, reproducible offline execution — a CDN file at a pinned hash never changes.

```js
// Correct — pinned to exact commit
loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@a1b2c3d/stem_lab/stem_lab_module.js');

// Wrong — floating tag, breaks offline determinism
loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab/stem_lab_module.js');
```

### Updating hashes after a merge

1. Note the merge commit hash (7 characters, e.g., `a1b2c3d`).
2. In `AlloFlowANTI.txt`, search for `pluginCdnBase` and all `loadModule(` calls; replace the old hash.
3. Apply the same changes to `prismflow-deploy/src/App.jsx`.
4. Commit both files together with a message like `Post-deploy: update CDN hash refs`.

---

## Deployment Targets

AlloFlow supports three deployment targets, all from the same codebase.

### 1. Gemini Canvas (default)

The app runs as a Canvas artifact inside Google Gemini. The Canvas runtime injects a `__firebase_config` global that the app reads at startup.

**Critical:** Detect Canvas vs. Firebase using `typeof __firebase_config`, never `typeof process`. CRA removes the `process` global at build time, so a `process`-based guard silently breaks production.

```js
// Correct
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: process.env.REACT_APP_API_KEY || '', ... };
```

In Canvas mode, `apiKey` is intentionally empty (`""`). Canvas's proxy intercepts outbound requests and injects the key server-side.

### 2. Firebase Hosting (cloud)

```bash
cd prismflow-deploy
npm install
npm run build
firebase deploy
```

Firebase hosts only static files. No student data is written to Google servers.

### 3. School Box (local Docker)

```bash
git clone https://github.com/apomera/AlloFlow.git
docker-compose up -d
# Access at http://localhost:3000
```

Services: Ollama (LLM inference), PocketBase (local DB), Piper/Edge TTS (offline speech), SearXNG (local search), Nginx (reverse proxy + SSL).

---

## Canvas Mode & API Key Configuration

### Environment Detection (`_isCanvasEnv`)

The app detects Canvas mode (Google AI Studio) at startup via an IIFE at ~line 897:

```js
const _isCanvasEnv = (() => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const href = window.location.href;
  if (href.startsWith('blob:')) return true;
  return host.includes('googleusercontent') ||
         host.includes('scf.usercontent') ||
         host.includes('code-server') ||
         host.includes('idx.google') ||
         host.includes('run.app');
})();
```

### CRITICAL: CRA `process.env` vs `process` Global

> **NEVER use `typeof process !== 'undefined'` as a guard in this codebase.**
> CRA's webpack replaces `process.env.REACT_APP_*` with literal strings at build time,
> but does **NOT** polyfill the `process` global itself. In the browser at runtime,
> `typeof process === 'undefined'` — any `typeof process` guard will fail and skip
> the guarded code.
>
> **Use `typeof __firebase_config !== 'undefined'` to detect Canvas vs Firebase deploy.**
>
> This bug caused a production outage on 2026-03-07 (`auth/invalid-api-key`) when
> `typeof process` guards were added around `firebaseConfig`, `appId`, and `apiKey`.

### API Key Injection Flow

| Context | `__firebase_config` defined? | `apiKey` value | Who provides the real key? |
|---------|------------------------------|---------------|---------------------------|
| **Canvas mode** | Yes (injected by Canvas) | `""` (empty) | Canvas proxy intercepts `key=` in the URL and injects it |
| **Firebase deploy** | No | `process.env.REACT_APP_GEMINI_API_KEY` | `.env` file at build time |

The Gemini key assignment at ~line 92:

```js
const apiKey = typeof __firebase_config !== 'undefined'
  ? ""
  : (process.env.REACT_APP_GEMINI_API_KEY || '');
```

### TDZ Warning: `let`-Declared Cache Variables

> **Do NOT use `typeof` guards for `let`/`const` variables in the same bundled scope.**
> In CRA's bundled output, all module-level `let`/`const` declarations share one scope.
> `typeof myLetVar` will throw `ReferenceError` (TDZ) if `myLetVar` hasn't been
> initialized yet — unlike `var` or true globals. Use `try/catch` instead.

### Model Selection

| Slot | Canvas Mode | Firebase Deploy |
|------|-------------|-----------------|
| `default` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `fallback` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `flash` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `tts` | `gemini-3-flash-preview` | `gemini-2.5-flash-preview-tts` |
| `vision` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `image` | `gemini-2.5-flash-image` | `gemini-3.1-flash-image-preview` |
| `safety` | `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` |
| `quality` | `gemini-2.5-pro` | `gemini-3.1-pro-preview` |

### Troubleshooting Canvas Gemini Failures

If `callGemini` or TTS fails in Canvas with `401` or `Failed to fetch`:

1. **The code is correct** — `apiKey=""` is by design; Canvas's proxy should inject the key.
2. The issue is Canvas's request interception not working. Possible causes:
   - Canvas session expired or needs a refresh
   - Canvas's proxy service has intermittent downtime
   - The model requested is not available in Canvas's allowed list
3. **TTS 401 is the same root cause** — if Canvas can't proxy `generateContent`, it also can't proxy `generateContent` for TTS.
4. The app degrades gracefully: TTS failures are caught and logged; `callGemini` surfaces user-friendly errors.

### Troubleshooting Canvas "Something Went Wrong (13)" Share Error

**Root cause:** Error 13 is a **server-side session/state error**, NOT a content filter. Google's backend caches the processing state of each Canvas artifact. If an artifact's backend state becomes corrupted (network hiccup, server crash during processing, stale session), ALL subsequent share attempts on that artifact will fail with error 13 — even if the content is identical to a working artifact.

**What does NOT cause error 13:**
- File size (larger files share fine)
- Specific code patterns or keywords
- Inline HTML templates or CDN URLs
- Non-ASCII characters, emoji, or JavaScript syntax

**How to fix it:**
1. **Create a new Canvas artifact** — paste the same content into a fresh Canvas app. This gets a new backend session. This is the proven fix.
2. If that doesn't work: clear browser cache/cookies, try incognito, or a different browser.

**How to avoid wasted debugging time:**
- If error 13 appears, try a fresh artifact FIRST before investigating code content.
- Keep a known-good shareable artifact URL as backup.

**Lesson learned (March 30, 2026):** Several hours were spent diffing file content, testing CDN hash changes, and considering modularization — when the fix was simply creating a new Canvas app. The identical file shared successfully from a fresh artifact.

---

## Accessibility Architecture

All interactive elements — including all 55 STEM tools and every game mode — must be fully operable without a mouse (Tab/Enter/Arrow key navigation). ARIA labels are required on every interactive element.

TTS runs entirely in-browser via two engines:
- **Kokoro** — English, 30+ neural voices
- **Piper** — 40+ languages, runs via WebAssembly

Neither engine makes cloud API calls. Audio never leaves the device.

---

## Privacy Architecture

| Layer | Implementation |
|-------|---------------|
| **Zero PII required** | The app never prompts for student names or IDs |
| **On-device storage** | All session data lives in `localStorage` — no cloud writes |
| **TeacherGate** | Clinical tools and answer keys isolated behind educator verification |
| **Fact-Chunk Pipeline** | PII-scrubbing layer applied before report generation to prevent AI hallucination of sensitive data |
| **Air-Gap option** | School Box deployment operates with no external API calls |

---

## Development Notes

### Service worker and QUIC caching

During local development, stale assets can be served by the browser even after a rebuild. Two common causes:

1. **Service worker cache** — Chrome's service worker may serve old bundles. Fix: Open DevTools → Application → Service Workers → click "Unregister", then hard-reload (`Shift+F5`).
2. **QUIC protocol** — Chrome's QUIC implementation can cause persistent asset caching. Fix: navigate to `chrome://flags/#enable-quic` → set to **Disabled** → Relaunch.

### File Encoding Characteristics

| Property | AlloFlowANTI.txt | stem_lab_module.js |
|----------|------------------|-------------------|
| Size | ~4.3 MB / ~67.9K lines | ~1.8 MB / ~23.6K lines |
| Line endings | CRLF (pure) | CRLF (pure) |
| BOM | None | None |
| Non-ASCII | ~6,282 bytes (emoji) | ~13,935 bytes (emoji) |
| Control bytes | 0 | 0 |

### Tool Reliability for Large Files

> **Do NOT use ripgrep (`grep_search` / `rg`) on AlloFlowANTI.txt or stem_lab_module.js.**
> These files contain non-ASCII bytes (emoji) that cause ripgrep to silently return zero results.

| Tool | Reliability | Notes |
|------|-------------|-------|
| PowerShell `Select-String` | High | Handles emoji correctly, best for `@section`/`@tool` search |
| Python scripts (file-based) | High | Use `encoding='utf-8', errors='replace'` |
| IDE `Ctrl+F` / `Cmd+F` | High | Best for interactive navigation with `@section` markers |
| `view_file` (IDE) | High | Direct file reading |
| ripgrep / `grep_search` | Unreliable | Fails on 4.3MB files with non-ASCII bytes |
| Python `-c` one-liners | Unreliable | Shell escaping issues on Windows |

### Console log policy

- **Never** leave `console.log` statements that could output PII, student names, clinical scores, or ABA metrics.
- AlloBot internal traces use a `_debug` flag gated behind `process.env.NODE_ENV === 'development'`.
