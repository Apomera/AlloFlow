# AlloFlow Architecture Guide
*Last Updated: 2026-03-11*
## Product Architecture: The 8 Core Pillars
AlloFlow is built on eight pillars that define its position in the EdTech landscape:
| # | Pillar | Technical Impl. | Key Stat |
|---|---|---|---|
| 1 | 
🌍
 Universal Offline Access | Local-First Monolith + PWA | **0** server round-trips mid-lesson |
| 2 | 
📖
 Instant Leveled Text | Bimodal Generative Pipeline | **5** reading levels in &lt;60s each |
| 3 | 
🎲
 Multi-Modal Workflows | Structural JSON Extractor | **7+** output formats per standard |
| 4 | 
🔊
 Phonemic Precision | Advanced Audio Orchestration | **44** IPA phonemes mapped |
| 5 | 
🤖
 Interactive Tour Engine | `data-help-key` + Embodied Agent | **5-step** guided walkthrough per feature |
| 6 | 
🔒
 Absolute Data Privacy | LZ-String Local Persistence | **0** student PII transmitted |
| 7 | 
🏠
 Empowering Families | $0 Licensing Model | **$0** parent cost — forever |
| 8 | 
🔓
 Open-Source Commitment | MIT License | **100%** open-source |
---
## Technical Architecture
### Monolith + Modular Hub-and-Spoke
```
AlloFlowANTI.txt (App.jsx)     ← Core monolith (~67K lines)
├── word_sounds_module.js       ← Extracted module (~24K lines)
├── stem_lab_module.js          ← Extracted module (~24K lines)
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
| `@section GLOBAL_MUTE` | ~175 | GlobalMuteButton |
| `@section LARGE_FILE_HANDLER` | ~199 | LargeFileHandler + modal |
| `@section SAFETY_CHECKER` | ~547 | SafetyContentChecker |
| `@section WORD_SOUNDS_STRINGS` | ~649 | i18n strings block |
| `@section PHONEME_DATA` | ~829 | Audio banks, IPA maps, word families |
| `@section VISUAL_PANEL` | ~1309 | VisualPanelGrid (comics) |
| `@section WORD_SOUNDS_GENERATOR` | ~2542 | Main Word Sounds component |
| `@section WORD_SOUNDS_REVIEW` | ~3356 | Session review panel |
| `@section STUDENT_ANALYTICS` | ~4260 | RTI probes &amp; analytics |
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
| `@section CHARTS` | ~18699 | Charts &amp; progress tracking |
| `@section ESCAPE_ROOM` | ~18830 | Escape Room student overlay |
| `@section ESCAPE_ROOM_TEACHER` | ~19451 | Escape Room teacher controls |
| `@section LIVE_QUIZ` | ~19619 | Live quiz broadcast |
| `@section LEARNER_PROGRESS` | ~20446 | Learning journey view |
| `@section TEACHER_DASHBOARD` | ~20940 | Main teacher dashboard |
| `@section QUICKSTART_WIZARD` | ~22095 | Onboarding wizard |
| `@section IMMERSIVE_READER` | ~23185 | Speed reader tools |
| `@section CAST_LOBBY` | ~23326 | Multi-device casting |
| `@section BILINGUAL_RENDERER` | ~32038 | Bilingual field display |
### `@tool` Markers in stem_lab_module.js
Each STEM Lab tool IIFE is marked with `// @tool TOOL_ID`:
| Category | Tool ID | Marker |
|---|---|---|
| Math Fundamentals | `volume`, `numberline`, `areamodel`, `fractionViz`, `base10` | `// @tool volume` etc. |
| Advanced Math | `coordinate`, `protractor`, `multtable`, `funcGrapher` | `// @tool coordinate` etc. |
| Life &amp; Earth Science | `cell`, `solarSystem`, `galaxy`, `rocks`, `waterCycle`, `ecosystem` | `// @tool cell` etc. |
| Physics &amp; Chemistry | `wave`, `circuit`, `chemBalance`, `physics`, `dataPlot` | `// @tool wave` etc. |
| Arts &amp; Music | `musicSynth` | `// @tool musicSynth` |
### Existing `#region` Blocks
Coarser section boundaries remain from the original structure:
| Region | Start | End |
|---|---|---|
| CONFIGURATION &amp; SETUP | L66 | L546 |
| LOCALIZATION STRINGS | L8832 | L8893 |
| HELPERS &amp; UTILITIES | L8894 | L9696 |
| CONTEXTS &amp; PROVIDERS | L9697 | L9737 |
| UI COMPONENTS | L9738 | L24060 |
| MAIN APPLICATION | L24061 | L67672 |
| APP EXPORT | L67673 | L67699 |
---
## Encoding &amp; Tooling Notes
### File Characteristics (as of 2026-03-07)
| Property | AlloFlowANTI.txt | stem_lab_module.js |
|---|---|---|
| Size | ~4.3 MB / ~67.9K lines | ~1.8 MB / ~23.6K lines |
| Line endings | CRLF (pure) | CRLF (pure) |
| BOM | None | None |
| Non-ASCII | ~6,282 bytes (emoji) | ~13,935 bytes (emoji) |
| Control bytes | **0** (fixed 2026-03-04) | 0 |
### Tool Reliability
&gt; **
⚠️
 Do NOT use `grep_search` (ripgrep) on AlloFlowANTI.txt or stem_lab_module.js.**
&gt; These files contain non-ASCII bytes (emoji) that cause ripgrep to silently return zero results.
&gt; Use `Select-String`, Python scripts, or IDE `Ctrl+F` instead.
| Tool | Reliability | Notes |
|---|---|---|
| PowerShell `Select-String` | 
✅
 High | Handles emoji correctly, best for `@section`/`@tool` search |
| Python scripts (file-based) | 
✅
 High | Use `encoding='utf-8', errors='replace'` |
| `view_file` (IDE) | 
✅
 High | Direct file reading |
| IDE `Ctrl+F` / `Cmd+F` | 
✅
 High | Best for interactive navigation with `@section` markers |
| ripgrep / `grep_search` | 
⚠️
 Unreliable | Fails on 4.3MB files with non-ASCII bytes. Works on &lt;1MB subsets. |
| Python `-c` one-liners | 
❌
 Unreliable | Shell escaping issues on Windows |
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
## Canvas Mode &amp; API Key Configuration
### Environment Detection (`_isCanvasEnv`)
The app detects Canvas mode (Google AI Studio) at startup via an IIFE at **~line 897**:
```js
const _isCanvasEnv = (() =&gt; {
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
### 
⚠️
 CRITICAL: CRA `process.env` vs `process` Global
&gt; **NEVER use `typeof process !== 'undefined'` as a guard in this codebase.**
&gt; CRA's webpack replaces `process.env.REACT_APP_*` with literal strings at build time,
&gt; but does **NOT** polyfill the `process` global itself. In the browser at runtime,
&gt; `typeof process === 'undefined'` → any `typeof process` guard will fail and skip
&gt; the guarded code.
&gt;
&gt; **Use `typeof __firebase_config !== 'undefined'` to detect Canvas vs Firebase deploy.**
&gt;
&gt; This bug caused a production outage on 2026-03-07 (`auth/invalid-api-key`) when
&gt; `typeof process` guards were added around `firebaseConfig`, `appId`, and `apiKey`.
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
| **Canvas mode** | 
✅
 Yes (injected by Canvas) | `""` (empty) | Canvas proxy intercepts `key=` in the URL and injects it |
| **Firebase deploy** | 
❌
 No | `process.env.REACT_APP_GEMINI_API_KEY` | `.env` file at build time |
The Gemini key assignment is at **~line 92**:
```js
const apiKey = typeof __firebase_config !== 'undefined'
  ? ""
  : (process.env.REACT_APP_GEMINI_API_KEY || '');
```
### TDZ Warning: `let`-Declared Cache Variables
&gt; **Do NOT use `typeof` guards for `let`/`const` variables in the same bundled scope.**
&gt; In CRA's bundled output, all module-level `let`/`const` declarations share one scope.
&gt; `typeof myLetVar` will throw `ReferenceError` (TDZ) if `myLetVar` hasn't been
&gt; initialized yet — unlike `var` or true globals. Use `try/catch` instead.
&gt;
&gt; Fixed 2026-03-07: `audio_bank_loaded` handler's cache invalidation.
### Model Selection
| Slot | Canvas Mode | Firebase Deploy |
|---|---|---|
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
---
## Service Worker &amp; QUIC Troubleshooting
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
window.addEventListener('pagehide', () =&gt; {
    try { terminateFirestore(db).catch(() =&gt; {}); } catch(e) {}
});
```