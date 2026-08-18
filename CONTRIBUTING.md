# Contributing to AlloFlow

Thank you for contributing to AlloFlow! This project exists because educators and developers believe that high-quality, universally designed education should be free and accessible to everyone.

---

## Architecture Overview

AlloFlow uses a **Hub-and-Spoke** architecture: a single monolithic orchestrator loads lightweight spoke modules on demand, keeping memory usage low on school Chromebooks.

It is hub-and-spoke **twice over**: the core loads spoke modules, and one of those spokes (the STEM Lab) is itself a hub with its own plugin registry. That nesting is what makes the project contributable — a new STEM tool is one new file, with no edit to the hub and none to the core.

```
AlloFlowANTI.txt / App.jsx          ← Core orchestrator (55,897 lines)
├── word_sounds_module.js            ← Phonemic awareness studio
├── stem_lab/stem_lab_module.js      ← STEM Lab host + inline fallbacks
│   ├── stem_tool_solarsystem.js     ← STEM plugin
│   ├── stem_tool_bridgelab.js       ← STEM plugin
│   ├── stem_tool_cyberdefense.js    ← STEM plugin
│   └── stem_tool_*.js               ← 141 STEM tool files / 142 registered plugin IDs
├── sel_hub/sel_tool_*.js            ← 70 SEL plugins
├── behavior_lens_module.js          ← Clinical FBA/BIP suite
├── report_writer_module.js          ← Psychoeducational report wizard
├── symbol_studio_module.js          ← AAC & visual communication
├── student_analytics_module.js      ← RTI probes & dashboards
├── math_fluency_module.js           ← CBM math fluency probes
├── admin_hub_source.jsx             ← Leadership Hub (walkthroughs, MTSS, evaluation)
├── build-managed module entries     ← cinematic_studio, pd_core, doc_pipeline, etc.
├── help_strings.js                  ← Contextual help content
├── ui_strings.js                    ← English i18n master (63 lang packs in lang/)
└── audio_bank.json                  ← Pre-recorded phoneme audio
```

**Counts above were verified against the repository on 2026-08-18.** They drift; if you are reading this much later, re-check before quoting them:

```bash
grep -c '' AlloFlowANTI.txt                              # core orchestrator lines
ls stem_lab/stem_tool_*.js | wc -l                       # STEM tool files
grep -rl "window.StemLab.registerTool" stem_lab/ | wc -l # registered plugin IDs
ls sel_hub/sel_tool_*.js | wc -l                         # SEL plugins
ls lang/*.js | wc -l                                     # language packs
```

---

## 1. The Core Orchestrator (`AlloFlowANTI.txt` / `App.jsx`)

The core UI, state management, and primary interaction tools live in the single `AlloFlowANTI.txt` file (which compiles to `App.jsx`). It is currently **55,897 lines**. It peaked around 67K, shrank as heavy features were extracted into build-managed spoke modules and plugin families, and has grown again since — expect it to keep moving, and expect the number in this document to lag reality.

Yes, that is a very large file, and it is a deliberate trade rather than neglect. See the rules below.

**Rules:**
- **Do NOT split** the core file into standard React components (e.g., `Button.jsx`). AlloFlow must remain deployable as a single unified bundle for offline School Box instances. If you want to reduce the core, extract a *spoke module*; that is the supported direction and the reason there are 139 of them.
- **Navigate by symbol.** The old `// @section` markers are essentially gone (two remain) — search for the component/const name directly (e.g. `AlloFlowContent`, `GEMINI_MODELS`, `export default function WrappedApp`).

**Finding code:**
```bash
# grep / ripgrep work fine on this file (the old "emoji breaks ripgrep" issue
# no longer applies). PowerShell Select-String also works.
grep -n "AlloFlowContent" AlloFlowANTI.txt
```

---

## 2. Spoke Modules

Heavy modules load dynamically at runtime. Each spoke is a self-contained JS file that registers itself on `window.AlloModules`.

**The loader contract.** `loadModule(name, url)` dedupes against `window.AlloModules[name]`, tracks in-flight loads in a registry with load generations so a re-entrant call cannot double-fetch, and appends `?v=<hash>` so every deploy invalidates both browser and CDN edge caches. A spoke is fetched the first time it is needed and never again — which is the whole point, because a school Chromebook cannot hold every simulation in one bundle.

**Where the module files come from.** Most spokes are *built*, not hand-edited:

```
<name>_source.jsx   →   _build_<name>_module.js   →   <name>_module.js
   (you edit this)          (the build script)          (what ships)
```

There are 139 `*_source.jsx` sources and 146 `_build_*.js` scripts. **Edit the `_source.jsx` and re-run its build script**; a change made directly to a generated `*_module.js` is overwritten on the next build. Files with no `_source.jsx` counterpart (including the `stem_lab/stem_tool_*.js` plugins) are authored directly.

| Module File | Purpose | Access |
|-------------|---------|--------|
| `word_sounds_module.js` | Phonemic awareness, 8 activity types, ORF | All users |
| `stem_lab/stem_lab_module.js` | STEM Lab host (141 tool files / 142 registered IDs) | All users |
| `behavior_lens_module.js` | FBA/BIP clinical suite, ABC data, IOA | TeacherGate |
| `report_writer_module.js` | Psychoeducational report wizard | TeacherGate |
| `symbol_studio_module.js` | AAC boards, visual schedules, social stories | TeacherGate |
| `student_analytics_module.js` | RTI probes, dashboard, screener | TeacherGate |
| `math_fluency_module.js` | CBM math fluency probes (K–8) | TeacherGate |

**Clinical modules (`behavior_lens_module.js`, `report_writer_module.js`):** Do NOT leave `console.log` statements that could output PII or ABA metrics to the developer console.

---

## 3. STEM Lab Plugin Architecture

STEM Lab tools use a **plugin pattern** — each tool is a self-contained IIFE that calls `window.StemLab.registerTool(id, config)` on load.

### Adding a New STEM Tool

1. Create `stem_lab/stem_tool_yourname.js` following this template:

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
    label: 'Your Tool Name',   // `name` and `title` still work; `label` is canonical
    desc: 'One line shown on the tile',  // `description` is the legacy alias
    icon: '🔬',
    // Free-form string. 26 distinct values are in use; the common ones are
    // science (56), math (22), creative (8), applied (7), life-skills (7).
    // Prefer an existing lower-case value over inventing a near-duplicate.
    category: 'science',
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      // ... your render logic using ctx.toolData and ctx.setToolData
    }
  });
})();
```

2. Add the filename to the `stemToolModules` array in `AlloFlowANTI.txt` (search for `stemToolModules`; the plugins are lazy-loaded on first hub-open via `window.__alloEnsureStemPluginsLoaded`):
```js
var stemToolModules = [
  // ... existing tools ...
  'stem_lab/stem_tool_yourname.js'
];
```

3. **Do not** hand-edit `desktop/web-app/src/App.jsx` — `build.js` regenerates it from `AlloFlowANTI.txt` on every build. Just edit the monolith.

4. **No CDN-URL editing needed.** The loader prefixes each filename with `pluginCdnBase`, which `build.js --mode=prod` rewrites to the hashless Cloudflare base (`https://alloflow-cdn.pages.dev/`). Commit the new plugin file so it ships — see [CDN Modules](#4-cdn-module-resolution) below.

### Finding existing STEM tools
```bash
# List all registered tool IDs (each plugin calls registerTool)
grep -rl "window.StemLab.registerTool" stem_lab/
```

---

## 4. CDN Module Resolution

Spoke modules are served from **Cloudflare Pages** (`https://alloflow-cdn.pages.dev/<file>`), **hashless**. You do **not** hand-edit CDN URLs:

- `build.js --mode=prod` rewrites `pluginCdnBase` (and every module URL) to the Cloudflare base automatically, and stamps a `?v=<short-commit-hash>` query param as the cache-buster.
- Cloudflare rebuilds from `main` on push (async, ~1-2 min); the `?v=` param + service-worker timestamp force clients to pick up new code.

```js
// In AlloFlowANTI.txt the source looks like this — a bare base, no hash.
// The desktop build resolves to a relative path instead, because a bundled
// offline install has no CDN to reach:
var pluginCdnBase = isDesktopBundledApp ? './' : 'https://alloflow-cdn.pages.dev/';
// build.js handles versioning. Do NOT paste commit hashes into URLs by hand.
```

(History: AlloFlow used jsDelivr `@{commit-hash}` URLs until 2026, when jsDelivr began returning GitHub 429s; the project moved to Cloudflare Pages. Any `cdn.jsdelivr.net` strings left in `build.js`'s legacy MODULES table are unused.)

**After merging a PR that modifies any spoke module:** just commit + push the module file and run `./deploy.sh` (or `build.js --mode=prod`). No manual hash bookkeeping.

---

## 5. Canvas Mode vs. Firebase Deploy

AlloFlow detects its environment at startup:

```js
// ✅ Correct way to detect Canvas vs. Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: process.env.REACT_APP_API_KEY || '', ... };

// ❌ NEVER use typeof process as a guard — CRA removes the process global at build time
```

In Canvas mode, `apiKey` is intentionally empty (`""`). Canvas's proxy intercepts the request and injects the key server-side.

---

## 6. Development Workflow

1. **Fork & clone** the repository.
2. **Deploy:** the canonical one-shot is `./deploy.sh "message"` from the repo root (it runs the pre-flight render-crash gate, commits/pushes, builds, deploys to Firebase, and verifies against the Cloudflare CDN). For a manual Firebase build, `cd desktop/web-app && npm install && npm run build && firebase deploy`.
3. For Desktop local testing, use `npm.cmd run desktop:check`, `npm.cmd run desktop:smoke`, and `npm.cmd run desktop` from the repo root. Use `docker-compose up -d` only when testing the optional School Box Server stack.
4. If testing service worker cache changes in Chrome, disable QUIC: `chrome://flags/#enable-quic` → Disabled → Relaunch.
5. For AI backend changes, verify the selected provider path: built-in Desktop engine, LM Studio, Ollama (`http://localhost:11434`), LocalAI, Gemini, or custom endpoint as appropriate.
6. Open a descriptive pull request explaining which UDL checkpoint or clinical workflow your change enhances.

### Testing

- `npm test` — the Vitest suite (runs `vitest run`).
- `npm run verify:gate` — the blocking static gate (render-crash checks, i18n JSON, module registry, build smoke). Run this before deploying; `deploy.sh` runs it too.
- `npm run test:e2e` — Playwright end-to-end specs (PDF golden masters, etc.).
- See `dev-tools/README.md` for the full list of `verify:*` checks.

---

## 7. Code Standards

- **Accessibility first** — ARIA labels on every interactive element; all games must be keyboard-navigable.
- **Zero PII logging** — No `console.log` of student names, IDs, scores, or clinical data.
- **Don't hand-edit CDN URLs** — `build.js` resolves modules to the Cloudflare base + a `?v=` cache-buster automatically (see §4).
- **Restorative language** — Clinical tools must use person-first, affirming language throughout.
- **FERPA-aligned by design** — Do not add hidden student-data flows. Any cloud or third-party data path must be explicit, minimized, and school-controlled wherever possible.

---

## Contributors

AlloFlow is built and maintained by:

- **Dr. Aaron Pomeranz, PsyD** — creator and maintainer. School psychologist; sets the pedagogical, clinical, and privacy direction, and writes most of the code.
- **Tyler Despain** — cybersecurity and IT. Security review, infrastructure, and deployment.

New contributors are genuinely welcome, and the plugin architecture in §3 exists precisely so that a first contribution can be one self-contained file. If you land a change, add yourself here in the same pull request.

Good first areas, if you want somewhere to start:

- **Write a STEM tool.** One file, one `registerTool` call (§3).
- **In-app help coverage.** `help_strings.js` covers the shell, sidebar, and hubs thoroughly, and currently covers none of the STEM Lab tools. `tool_index.json` already carries an id, label, description, topics, and keywords for every tool, so a baseline is generatable.
- **Screen-reader testing.** Automated checks and keyboard passes are not the same as someone who uses a screen reader daily.
- **Translation review.** 63 hand-translated language packs live in `lang/`, including several that rarely get support (Karen, Tigrinya, Marshallese, Maay Maay, Chin Hakha, Acholi). Reviewing one pack as a native speaker is a high-value hour.

---

## Code of Conduct

Be respectful. The end-users are teachers, clinicians, and diverse students. Contributions should default to accessibility, safety, and zero-PII design.
