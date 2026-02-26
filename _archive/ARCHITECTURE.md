# AlloFlow Architecture Guide

> **For AI Assistants:** Read this at the start of every conversation. It will save you significant ramp-up time.

## Overview

**AlloFlow** (Adaptive Levels, Layers, & Outputs) is a **single-file React monolith** for K-12 literacy education and Universal Design for Learning (UDL). Created by **Aaron Pomeranz, PsyD**. Licensed AGPL-3.0. The monolith also hosts two separate projects — the **Digital Kinship Parenting Tool** and the **Report Writing App** — which are independent applications colocated for deployment convenience (see *Separate Projects* section below).

- **Primary file:** `AlloFlowANTI.txt` (~4.5 MB, ~71,400 lines) — the entire app
- **Target platforms:** Google Gemini Canvas (via `@mode react`) + Firebase Hosting
- **Firebase project:** `prismflow-911fe` → `https://prismflow-911fe.web.app`
- **GitHub repo:** `Apomera/AlloFlow` (externalized content)
- **56 React.memo components**, no router — state-driven panel switching

---

## Source of Truth

| What | Source of Truth | Notes |
|---|---|---|
| **Application code** | `AlloFlowANTI.txt` (local) | This file IS the codebase. Everything else derives from it. |
| **English UI strings** | `ui_strings.js` (local) | Pushed to GitHub for CDN fetch. Generated from code extraction. |
| **Help tooltips** | `help_strings.js` (local) | Pushed to GitHub for lazy fetch. Generated from code extraction. |
| **Language packs** | `lang/{language}.js` (GitHub) | Generated via in-app Gemini translation + export. |
| **Firebase build** | `prismflow-deploy/src/App.jsx` | Copy of `AlloFlowANTI.txt` at deploy time. Not independently edited. |
| **Canvas version** | Gemini Canvas paste | Copy of `AlloFlowANTI.txt` pasted into Canvas. Not independently edited. |

> **Key rule:** Always edit `AlloFlowANTI.txt`. Never edit `App.jsx` or Canvas directly. They are copies.

---

## GitHub Repository (`Apomera/AlloFlow`)

Files hosted on GitHub serve as a free CDN via `raw.githubusercontent.com`:

| File | Size | Purpose | How It's Loaded |
|---|---|---|---|
| `ui_strings.js` | ~262 KB | English UI labels, buttons, menus, tour text | Async on app startup → cached in `localStorage` |
| `help_strings.js` | ~328 KB | Context-sensitive help tooltips (621 entries) | Lazy on first help activation → cached in `localStorage` |
| `lang/spanish.js` | ~250 KB | Pre-translated language pack (example) | On language switch → cached in IndexedDB |
| `lang/{language}.js` | ~250 KB each | Other pre-translated packs | Same pattern. Slug format: `language.toLowerCase().replace(/\s+/g, '_')` |

**Files NOT yet on GitHub (need to be pushed):**
- `ui_strings.js` — exists locally, needs push
- `help_strings.js` — exists locally, needs push
- `lang/` directory — needs creation, language packs generated via export

**Format:** Both `ui_strings.js` and `help_strings.js` are plain JavaScript object literals (not JSON, not modules). They are evaluated via `new Function('return ' + text)()` after fetch.

---

## Monolith Structure

| Region | Line Range | Contents |
|---|---|---|
| **Imports** | L1-53 | React, Lucide icons, Firebase SDK |
| **Config & Setup** | L54-14385 | Constants, API keys, data banks, Word Sounds components |
| **Localization** | L14386-14403 | `UI_STRINGS` async loader (from GitHub) |
| **Helpers & Utilities** | L14404-15162 | Grade helpers, `useTranslation` hook, `t()` function |
| **Contexts & Providers** | L15163-15203 | `LanguageContext`, `LanguageProvider`, RTL support |
| **UI Components** | L15204-28971 | All major panels/features (~13,700 lines) |
| **Main Application** | L28972-71393 | `AlloFlowApp` component, state, API calls |
| **App Export** | L71394+ | `ReactDOM.render` call |

### Key Data Banks (Config Region)

| Constant | Purpose |
|---|---|
| `WORD_SOUNDS_STRINGS` | Activity-specific UI text for Word Sounds |
| `WORD_FAMILY_PRESETS` | Phonics word family definitions |
| `INSTRUCTION_AUDIO` | Pre-recorded instruction audio (base64) |
| `SOUND_MATCH_POOL` | Sound matching game word lists |
| `PHONEME_AUDIO_BANK` | Individual phoneme audio (base64) |
| `IPA_TO_AUDIO` | IPA symbol → audio mapping |
| `PHONEME_GUIDE` | Phonics teaching reference data |
| `BENCHMARK_PROBE_BANKS` | Standardized literacy assessment items |
| `LETTER_SVG_PATHS` | SVG path data for letter tracing |

---

## Translation / Localization Architecture

### The `t()` Function Resolution Chain
```
t("tour.glossary_title") checks:
  1. languagePack["tour"]["glossary_title"]  → translated string
  2. UI_STRINGS["tour"]["glossary_title"]    → English fallback
  3. WORD_SOUNDS_STRINGS[key]                → activity fallback
  4. Return the key itself                   → "tour.glossary_title"
```

### Language Pack Loading (`loadLanguage()`)
1. **IndexedDB cache** → instant if previously loaded
2. **GitHub fetch** → `raw.githubusercontent.com/Apomera/AlloFlow/main/lang/{lang_slug}.js`
3. **Gemini on-the-fly** → translates UI_STRINGS + HELP_STRINGS in 50-string chunks, caches result
4. **Manual JSON import** → always available via import button

### Help String Translation
When generating a language pack via Gemini, help strings are automatically fetched from GitHub and merged under the `help_mode.*` namespace. The help resolver checks `t('help_mode.' + key)` before falling back to English `HELP_STRINGS[key]`.

---

## API Integrations

| API | Used For | Key Pattern |
|---|---|---|
| **Gemini** | Text generation, translation, analysis | `callGemini(prompt, options)` |
| **Imagen** | Image generation (glossary, activities) | `callImagen(prompt)` — max 5 concurrent |
| **TTS** | Text-to-speech for phonics | `handleAudio(text)` via Gemini TTS |

- **Canvas:** API key auto-injected by sandbox
- **Firebase:** API key from user input, stored in state

---

## Key Feature Systems

| System | Description |
|---|---|
| **Word Sounds Studio** | 13+ phonics activities (isolation, blending, segmentation, rhyming, tracing, etc.) |
| **Screening Dashboard** | Universal literacy screener, composite scoring, RTI/MTSS monitoring |
| **Bridge Mode** | Gemini conversational interface for student engagement |
| **Adventure Mode** | Gamified learning (XP, shop, narrative progression) |
| **Glossary/Vocabulary** | AI definitions, images, 8+ games (Memory, Crossword, Bingo, etc.) |
| **Escape Room** | Puzzle-based gamification with XP, streaks, and team play |
| **Help System** | Context-sensitive tooltips via `HELP_STRINGS` + `DOM_TO_TOOL_ID_MAP` |
| **Lesson Plan** | AI-generated differentiated lesson plans |
| **AlloBot** | Contextual tips system triggered by user actions |
| **ORF / Fluency** | Oral Reading Fluency assessment with prosody scoring |
| **Live Session** | Real-time teacher-student sync |

---

## Separate Projects (Colocated, NOT Part of AlloFlow)

The following are **independent applications** that share the same monolith file for deployment convenience only. They are **not features of AlloFlow** and have distinct user bases, purposes, and design goals:

| Project | Description | Target Audience |
|---|---|---|
| **Digital Kinship Parenting Tool** | Indigenous-centric parenting platform (Hearth Hub, Parent Wellness Studio, Conflict Resolution Lab, Tribal Nations Explorer) | Parents, families, community |
| **Report Writing App** | User report profiles, adaptation studio, multilingual report generation, AI-assisted fidelity checking | Psychologists, evaluators, researchers |

---

## Deployment

```powershell
# Standard deploy (also see .agent/workflows/deploy.md):
Copy-Item AlloFlowANTI.txt prismflow-deploy\src\App.jsx -Force
Copy-Item AlloFlowANTI.txt prismflow-deploy\src\AlloFlowANTI.txt -Force
cd prismflow-deploy
npm run build          # Must exit code 0
npx firebase deploy --only hosting
```

---

## Critical Rules for AI Assistants

1. **File size is critical** — Canvas has share link limits. Track every KB.
2. **The file exceeds 4MB** — `replace_file_content` tool won't work. Use Python scripts.
3. **Never remove `#region` markers** — they're the only structural navigation.
4. **Always build before deploying** — `npm run build` exit code 0 required.
5. **Regex patterns contain `//`** — comment-stripping must track string/regex context.
6. **`UI_STRINGS` loads async** — app must handle the 200ms empty window.
7. **Canvas uses esbuild** (stricter) vs Firebase uses webpack (lenient). Both must work.
8. **Line endings are `\n`** after Python processing, not `\r\n`.
9. **Test in Canvas too** — a webpack pass doesn't guarantee Canvas compilation.
10. **Edit `AlloFlowANTI.txt` only** — `App.jsx` is a derivative copy.

---

## Useful Grep Patterns

```bash
# Find component definitions
grep "React.memo" AlloFlowANTI.txt
# Find state declarations
grep "useState.*variableName" AlloFlowANTI.txt
# Find #region boundaries
grep "#region" AlloFlowANTI.txt
# Find t() usage for a key
grep "t('" AlloFlowANTI.txt | grep "key_name"
# Find help key assignments
grep "data-help-key" AlloFlowANTI.txt
```

---

## Project Directory Notes

The project directory contains ~295 files + 16 subdirectories. Most `_*.txt` files and `*_audit.txt` / `*_result.txt` files are **temporary artifacts from past debugging sessions** and can be ignored. Key files:

| File/Dir | Purpose |
|---|---|
| `AlloFlowANTI.txt` | **THE app** — source of truth |
| `ui_strings.js` | Externalized English UI strings |
| `help_strings.js` | Externalized help tooltips |
| `prismflow-deploy/` | Firebase build directory |
| `.agent/workflows/` | Agent workflow definitions |
| `ARCHITECTURE.md` | This file |
| `scripts/` | ~751 utility scripts from past sessions |
| `_archive/` | ~486 archived files |
| `AlloFlowANTI.bak*.txt` | Backup snapshots (various stages) |

---

## File Size History

| Date | Size | Lines | Change |
|---|---|---|---|
| Original | 5.29 MB | 80,088 | — |
| Comments removed | 5.11 MB | 77,201 | -177 KB |
| UI_STRINGS externalized | 4.88 MB | 72,012 | -262 KB |
| Inline comments stripped | 4.83 MB | 72,005 | -19 KB |
| HELP_STRINGS externalized | 4.51 MB | 71,417 | -327 KB |
| **Current** | **4.51 MB** | **71,417** | **-787 KB total (14.9%)** |

---

## Active Task List

> **Instructions:** Update this list as work progresses. Mark `[x]` when done, `[/]` when in progress.

### High Priority
- [ ] Push `ui_strings.js` to GitHub (`Apomera/AlloFlow`)
- [ ] Push `help_strings.js` to GitHub
- [ ] Create `lang/` directory on GitHub
- [ ] Fix 125 JSX text localization gaps (add keys to `ui_strings.js`, wrap in `t()`)
- [ ] Generate pre-built language packs for top 12 languages

### Medium Priority
- [ ] Fix 714 `aria-label`/`title` attribute localization gaps
- [ ] Fix 2 toast message localization gaps
- [ ] Clean up ~200+ temp files in project root (move to `_archive/`)

### Low Priority / Future
- [ ] Consider externalizing `WORD_SOUNDS_STRINGS` (10 KB)
- [ ] Consider externalizing `BENCHMARK_PROBE_BANKS` (10 KB)
- [ ] Consider externalizing `DOM_TO_TOOL_ID_MAP` (14 KB)
- [ ] Explore further dead code removal for file size reduction
