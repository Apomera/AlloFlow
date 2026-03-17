# AlloFlow Architecture Guide

*Last Updated: 2026-03-17*

## Product Architecture: The 8 Core Pillars

AlloFlow is built on eight pillars that define its position in the EdTech landscape:

| # | Pillar | Technical Impl. | Key Stat |
|---|---|---|---|
| 1 | 🌍 Universal Offline Access | Local-First Monolith + PWA | **0** server round-trips mid-lesson |
| 2 | 📖 Instant Leveled Text | Bimodal Generative Pipeline | **5** reading levels in <60s each |
| 3 | 🎲 Multi-Modal Workflows | Structural JSON Extractor | **7+** output formats per standard |
| 4 | 🔊 Phonemic Precision | Advanced Audio Orchestration | **44** IPA phonemes mapped |
| 5 | 🤖 Interactive Tour Engine | `data-help-key` + Embodied Agent | **5-step** guided walkthrough per feature |
| 6 | 🔒 Absolute Data Privacy | LZ-String Local Persistence | **0** student PII transmitted |
| 7 | 🏠 Empowering Families | $0 Licensing Model | **$0** parent cost — forever |
| 8 | 🔓 Open-Source Commitment | MIT License | **100%** open-source |

---

## Technical Architecture

### Monolith + Modular Hub-and-Spoke

```
AlloFlowANTI.txt (App.jsx)     ← Core monolith (~71K lines)
├── word_sounds_module.js       ← Extracted module (~24K lines)
├── stem_lab_module.js          ← Extracted module (~43K lines, 47 tools)
├── report_writer_module.js     ← Extracted module (Clinical Reasoning Suite)
├── help_strings.js             ← Tour/help content
├── ui_strings.js               ← i18n strings (100+ languages)
└── audio_bank.json             ← Pre-recorded phoneme audio
```

### Module Loading: Hash-Based

External modules are loaded via **commit-hash pinned** jsDelivr URLs:
```
https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@4def1c7/word_sounds_module.js
```
This avoids CDN cache-busting issues — each deployment pins to an exact commit hash, ensuring deterministic loading without manual cache purges.

---

## Codebase Navigation

### `@section` Markers in AlloFlowANTI.txt

The file contains `// @section NAME` comment markers at every major component boundary. These are searchable via `Ctrl+F`, `Select-String`, or Python scripts.

| Marker | Line | What It Covers |
|---|---|---|
| `@section GLOBAL_MUTE` | ~394 | GlobalMuteButton |
| `@section LARGE_FILE_HANDLER` | ~419 | LargeFileHandler + modal |
| `@section SAFETY_CHECKER` | ~768 | SafetyContentChecker |
| `@section WORD_SOUNDS_STRINGS` | ~871 | i18n strings block |
| `@section PHONEME_DATA` | ~1052 | Audio banks, IPA maps, word families |
| `@section VISUAL_PANEL` | ~3124 | VisualPanelGrid (comics) |
| `@section WORD_SOUNDS_GENERATOR` | ~4358 | Main Word Sounds component |
| `@section WORD_SOUNDS_REVIEW` | ~5173 | Session review panel |
| `@section STUDENT_ANALYTICS` | ~6078 | RTI probes & analytics |
| `@section STUDENT_SUBMIT` | ~11772 | Student submission modal |
| `@section SPEECH_BUBBLE` | ~12018 | Allobot speech bubble |
| `@section ALLOBOT` | ~12242 | Embodied tour agent |
| `@section MISSION_REPORT` | ~14552 | Quest summary card |
| `@section STUDENT_QUIZ` | ~14660 | Live quiz overlay |
| `@section DRAFT_FEEDBACK` | ~14986 | Draft feedback UI |
| `@section TEACHER_GATE` | ~15188 | Teacher verification |
| `@section ADVENTURE_SYSTEMS` | ~15553 | Ambience, effects, climax |
| `@section INTERACTIVE_GAMES` | ~16428 | Confetti, Memory, Matching, etc. |
| `@section ADVENTURE_UI` | ~19866 | Inventory, dice, shop |
| `@section CHARTS` | ~20731 | Charts & progress tracking |
| `@section ESCAPE_ROOM` | ~20863 | Escape Room student overlay |
| `@section ESCAPE_ROOM_TEACHER` | ~21485 | Escape Room teacher controls |
| `@section LIVE_QUIZ` | ~21654 | Live quiz broadcast |
| `@section LEARNER_PROGRESS` | ~22482 | Learning journey view |
| `@section TEACHER_DASHBOARD` | ~22977 | Main teacher dashboard |
| `@section QUICKSTART_WIZARD` | ~24154 | Onboarding wizard |
| `@section IMMERSIVE_READER` | ~25266 | Speed reader tools |
| `@section CAST_LOBBY` | ~25408 | Multi-device casting |
| `@section BILINGUAL_RENDERER` | ~34289 | Bilingual field display |

### Tool Inventory in stem_lab_module.js (47 tools)

All tools are registered in the `_allStemTools` array (~L2050) and have corresponding `stemLabTool === 'id'` IIFE render blocks. Some older tools have `// @tool ID` comment markers; newer tools do not.

| Category | Tool IDs |
|---|---|
| Math Fundamentals | `volume`, `numberline`, `areamodel`, `fractionViz`, `base10`, `geoSandbox`, `archStudio`, `multtable` |
| Advanced Math | `coordinate`, `protractor`, `funcGrapher`, `inequality`, `calculus`, `algebraCAS`, `graphCalc`, `probability`, `unitConvert` |
| Life & Earth Science | `cell`, `solarSystem`, `galaxy`, `universe`, `rocks`, `waterCycle`, `rockCycle`, `ecosystem`, `companionPlanting`, `aquarium`, `decomposer`, `anatomy`, `dissection`, `brainAtlas`, `molecule` |
| Physics & Chemistry | `wave`, `circuit`, `chemBalance`, `punnett`, `physics`, `dataPlot`, `dataStudio` |
| Computer Science | `codingPlayground` |
| Arts & Music | `musicSynth`, `artStudio` |
| Behavioral Science | `behaviorLab` |
| Social Studies & Economics | `economicsLab` |
| Strategy Games | `spaceColony` |

### Existing `#region` Blocks

Coarser section boundaries remain from the original structure:

| Region | Start |
|---|---|
| CONFIGURATION & SETUP | L242 |
| LOCALIZATION STRINGS | L10732 |
| HELPERS & UTILITIES | L10794 |
| CONTEXTS & PROVIDERS | L11602 |
| UI COMPONENTS | L11643 |
| MAIN APPLICATION | L26168 |
| APP EXPORT | L70832 |

---

## Encoding & Tooling Notes

### File Characteristics (as of 2026-03-17)

| Property | AlloFlowANTI.txt | stem_lab_module.js |
|---|---|---|
| Size | ~4.45 MB / ~70.9K lines | ~3.27 MB / ~43.1K lines |
| Line endings | CRLF (pure) | CRLF (pure) |
| BOM | None | None |
| Non-ASCII | Emoji throughout | Emoji throughout |
| Control bytes | **0** (fixed 2026-03-04) | 0 |

### Tool Reliability

> **⚠️ Do NOT use `grep_search` (ripgrep) on AlloFlowANTI.txt or stem_lab_module.js.**
> These files contain non-ASCII bytes (emoji) that cause ripgrep to silently return zero results.
> Use `Select-String`, Python scripts, or IDE `Ctrl+F` instead.

| Tool | Reliability | Notes |
|---|---|---|
| PowerShell `Select-String` | ✅ High | Handles emoji correctly, best for `@section`/`@tool` search |
| Python scripts (file-based) | ✅ High | Use `encoding='utf-8', errors='replace'` |
| `view_file` (IDE) | ✅ High | Direct file reading |
| IDE `Ctrl+F` / `Cmd+F` | ✅ High | Best for interactive navigation with `@section` markers |
| ripgrep / `grep_search` | ⚠️ Unreliable | Fails on 4.3MB files with non-ASCII bytes. Works on <1MB subsets. |
| Python `-c` one-liners | ❌ Unreliable | Shell escaping issues on Windows |

### Recommended Search Workflow

```powershell
# Find a section
Select-String -Path AlloFlowANTI.txt -Pattern "@section ALLOBOT"

# Find a STEM tool
Select-String -Path stem_lab_module.js -Pattern "@tool galaxy"

# List all sections
Select-String -Path AlloFlowANTI.txt -Pattern "@section "
```

---

## Canvas Mode & API Key Configuration

### Environment Detection (`_isCanvasEnv`)

The app detects Canvas mode (Google AI Studio) at startup via an IIFE at **~line 897**:

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

### ⚠️ CRITICAL: CRA `process.env` vs `process` Global

> **NEVER use `typeof process !== 'undefined'` as a guard in this codebase.**
> CRA's webpack replaces `process.env.REACT_APP_*` with literal strings at build time,
> but does **NOT** polyfill the `process` global itself. In the browser at runtime,
> `typeof process === 'undefined'` → any `typeof process` guard will fail and skip
> the guarded code.
>
> **Use `typeof __firebase_config !== 'undefined'` to detect Canvas vs Firebase deploy.**
>
> This bug caused a production outage on 2026-03-07 (`auth/invalid-api-key`) when
> `typeof process` guards were added around `firebaseConfig`, `appId`, and `apiKey`.

### Firebase Config (lines ~67–80)

```js
// CORRECT — no typeof process guard:
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: process.env.REACT_APP_API_KEY || '',
      authDomain: process.env.REACT_APP_AUTH_DOMAIN || '',
      // ... other fields from .env
    };
```

### API Key Injection Flow

| Context | `__firebase_config` defined? | `apiKey` value | Who provides the real key? |
|---|---|---|---|
| **Canvas mode** | ✅ Yes (injected by Canvas) | `""` (empty) | Canvas proxy intercepts `key=` in the URL and injects it |
| **Firebase deploy** | ❌ No | `process.env.REACT_APP_GEMINI_API_KEY` | `.env` file at build time |

The Gemini key assignment is at **~line 92**:
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
>
> Fixed 2026-03-07: `audio_bank_loaded` handler's cache invalidation.

### Model Selection

| Slot | Canvas Mode | Firebase Deploy |
|---|---|---|
| `default` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `fallback` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `flash` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `tts` | `gemini-3-flash-preview` | `gemini-2.5-flash-preview-tts` |
| `vision` | `gemini-3-flash-preview` | `gemini-3-flash-preview` |
| `image` | `gemini-2.5-flash-image-preview` | `gemini-3.1-flash-image-preview` |
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

---

## Service Worker & QUIC Troubleshooting

### Service Worker (PWA)

The Firebase-deployed app uses a service worker for offline caching. During development, frequent deploys can cause stale cache issues because:
- The service worker's `skipWaiting()` + `clients.claim()` cycle races with rapid asset changes
- HTTP/2 connection reuse can serve cached responses from the previous deploy

**In production with stable builds**, this is not an issue — end-users get clean cache updates on actual version bumps.

### QUIC Protocol Issue (Development Only)

**Problem**: Chrome's QUIC protocol can cause persistent caching/connection issues during active development, manifesting as stale assets being served even after deploy.

**Fix**: Disable QUIC in Chrome during development:

```
1. Navigate to: chrome://flags/#enable-quic
2. Set "Experimental QUIC protocol" to: Disabled
3. Relaunch Chrome
```

**Why this is dev-only**: QUIC's aggressive connection coalescing and 0-RTT replay can serve stale responses when assets are changing rapidly between deploys. In production with stable hashed assets, QUIC works correctly. End-users will not encounter this issue.

### Firestore Connection Cleanup

The app terminates Firestore connections on page unload to prevent HTTP/2 connection reuse from blocking subsequent loads:
```js
window.addEventListener('pagehide', () => {
    try { terminateFirestore(db).catch(() => {}); } catch(e) {}
});
```
