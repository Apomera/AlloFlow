# Contributing to AlloFlow

Thank you for contributing to AlloFlow! This project exists because educators and developers believe that high-quality, universally designed education should be free and accessible to everyone.

---

## Architecture Overview

AlloFlow uses a **Hub-and-Spoke** architecture: a single monolithic orchestrator loads lightweight spoke modules on demand, keeping memory usage low on school Chromebooks.

```
AlloFlowANTI.txt / App.jsx          ← Core orchestrator (~67K lines)
├── word_sounds_module.js            ← Phonemic awareness studio
├── stem_lab_module.js               ← STEM Lab host + inline fallbacks
│   ├── stem_tool_dna.js             ← Extracted STEM plugin
│   ├── stem_tool_physics.js         ← Extracted STEM plugin
│   ├── stem_tool_cyberdefense.js    ← Extracted STEM plugin
│   └── stem_tool_*.js               ← (32 extracted, more in progress)
├── behavior_lens_module.js          ← Clinical FBA/BIP suite
├── report_writer_module.js          ← Psychoeducational report wizard
├── symbol_studio_module.js          ← AAC & visual communication
├── student_analytics_module.js      ← RTI probes & dashboards
├── math_fluency_module.js           ← CBM math fluency probes
├── help_strings.js                  ← Contextual help content
├── ui_strings.js                    ← i18n strings (40+ languages)
└── audio_bank.json                  ← Pre-recorded phoneme audio
```

---

## 1. The Core Orchestrator (`AlloFlowANTI.txt` / `App.jsx`)

The core UI, state management, and primary interaction tools live in the single ~67K-line `AlloFlowANTI.txt` file (which compiles to `App.jsx`).

**Rules:**
- **Do NOT split** the core file into standard React components (e.g., `Button.jsx`). AlloFlow must remain deployable as a single unified bundle for offline School Box instances.
- **Navigate** the file using `// @section SECTION_NAME` markers — searchable via `Ctrl+F` or `Select-String` in PowerShell.
- **Do NOT use `grep` / ripgrep** on this file — it contains emoji (non-ASCII bytes) that cause ripgrep to return zero results silently. Use PowerShell `Select-String` or the IDE's built-in search instead.

**Finding sections:**
```powershell
# List all sections
Select-String -Path AlloFlowANTI.txt -Pattern "// @section "

# Jump to a specific section
Select-String -Path AlloFlowANTI.txt -Pattern "@section ALLOBOT"
```

---

## 2. Spoke Modules

Heavy modules load dynamically at runtime. Each spoke is a self-contained JS file that registers itself on `window.AlloModules`.

| Module File | Purpose | Access |
|-------------|---------|--------|
| `word_sounds_module.js` | Phonemic awareness, 8 activity types, ORF | All users |
| `stem_lab_module.js` | STEM Lab host (55 tools) | All users |
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
    name: 'Your Tool Name',
    icon: '🔬',
    category: 'science', // math | science | tech | creative | social
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      // ... your render logic using ctx.toolData and ctx.setToolData
    }
  });
})();
```

2. Add the file to the `toolModules` array in `AlloFlowANTI.txt` (search for `@section` near the plugin loader):
```js
var toolModules = [
  // ... existing tools ...
  'stem_lab/stem_tool_yourname.js'
];
```

3. Also add it to the same array in `prismflow-deploy/src/App.jsx` to keep both files in sync.

4. **Update the commit-hash pinned CDN URL** after merging — the loader uses:
```
https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@{COMMIT_HASH}/stem_lab/stem_tool_yourname.js
```
See [Pinned Dependencies](#4-pinned-dependency-injection) below.

### Finding existing STEM tools
```powershell
# List all registered tools
Select-String -Path stem_lab/stem_lab_module.js -Pattern "@tool "
```

---

## 4. Pinned Dependency Injection (CRITICAL)

AlloFlow does **not** use floating `latest` CDN tags. Every spoke module URL is pinned to an exact commit hash, ensuring deterministic offline execution:

```js
// ✅ Correct — pinned to exact commit
loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@a1b2c3d/stem_lab/stem_lab_module.js');

// ❌ Wrong — floating tag, breaks offline determinism
loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/stem_lab/stem_lab_module.js');
```

**After merging a PR that modifies any spoke module:**
1. Note the merge commit hash (e.g., `a1b2c3d`)
2. Update the hash in `AlloFlowANTI.txt` — search for `pluginCdnBase` and all `loadModule(` calls
3. Update the same hashes in `prismflow-deploy/src/App.jsx`
4. Commit both files together

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
2. For Firebase cloud deployment, `cd prismflow-deploy && npm install && npm run build && firebase deploy`.
3. For School Box local testing, `docker-compose up -d` from the repo root.
4. If testing service worker cache changes in Chrome, disable QUIC: `chrome://flags/#enable-quic` → Disabled → Relaunch.
5. For AI backend changes, verify Ollama endpoints (`http://localhost:11434`) parse prompts correctly.
6. Open a descriptive pull request explaining which UDL checkpoint or clinical workflow your change enhances.

---

## 7. Code Standards

- **Accessibility first** — ARIA labels on every interactive element; all games must be keyboard-navigable.
- **Zero PII logging** — No `console.log` of student names, IDs, scores, or clinical data.
- **No floating CDN tags** — Always pin to a commit hash.
- **Restorative language** — Clinical tools must use person-first, affirming language throughout.
- **FERPA by design** — Never add features that transmit student data to third-party services.

---

## Code of Conduct

Be respectful. The end-users are teachers, clinicians, and diverse students. Contributions should default to accessibility, safety, and zero-PII design.
