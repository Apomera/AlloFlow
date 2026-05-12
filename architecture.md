# AlloFlow Architecture

*Last meaningful update: May 10, 2026. Reflects the post-Phase-2 state where
cross-cutting state moved to React Contexts and 80+ self-contained CDN view
modules host the rendered UI.*

> **Companion document:** This file describes *how* the codebase is structured.
> For the catalog of *what* the codebase actually does (520+ user-facing
> features, every STEM tool, every SEL tool, discoverability paths), see
> [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md). The two documents pair
> deliberately: architecture for engineering review, feature inventory for
> product / educator review.

## Overview

AlloFlow is a single-page React application with a **container/presentational
split at scale**. One large container component (`AlloFlowContent` inside
`AlloFlowANTI.txt`) owns all application state. Over 80 self-contained CDN
view modules accept state via props or React Context and render the actual
UI. Heavy feature modules load dynamically at runtime, keeping the initial
payload small enough to run on school Chromebooks.

```
AlloFlowANTI.txt / App.jsx          ← Container (~24K lines, all state)
│
├── 4 React Contexts                  ← Cross-cutting state to descendants
│   ├── LanguageContext               ← Translation function t() + i18n
│   ├── ActiveViewContext             ← activeView + setter
│   ├── RoleContext                   ← isTeacherMode / isIndependentMode / isParentMode
│   └── ThemeContext                  ← theme, font, readingTheme, colorOverlay
│
├── 3 useReducer slices               ← State updates flow through action types
│   ├── uiState (UI chrome modals + toggles)
│   ├── csState (concept-sort game)
│   └── adventureState (adventure mode)
│
├── 80+ CDN view + helper modules     ← Loaded dynamically via loadModule()
│   ├── view_header_module.js         ← Header bar (Phase 2 context consumer)
│   ├── view_history_panel_module.js  ← History sidebar (522 lines extracted)
│   ├── view_kokoro_offer_modal.js    ← Modals, panels, toolbars
│   ├── view_*_module.js              ← (~30 view modules total)
│   ├── stem_lab_module.js            ← STEM Lab host + ~94 plugin tools
│   ├── sel_hub_module.js             ← SEL Hub host + 32 plugin tools + 1 shared safety layer
│   ├── behavior_lens_module.js       ← Clinical FBA/BIP suite
│   ├── report_writer_module.js       ← Psychoeducational report wizard
│   ├── symbol_studio_module.js       ← AI AAC boards
│   ├── allobot_module.js             ← Animated mascot
│   ├── adventure_module.js           ← Adventure UI
│   ├── games_module.js               ← Memory, Matching, Bingo, etc.
│   ├── doc_pipeline_module.js        ← Document builder pipeline
│   └── (~40 more)
│
├── tests/ + vitest                   ← 5 unit-test files, 126 assertions
├── dev-tools/ (14+ static checks)    ← npm run verify
└── audio_bank.json                   ← Pre-recorded phoneme audio
```

## How the codebase got here

This codebase has been progressively refactored from a ~60K-line monolith
(April 2026) to the current ~24K-line container. The shape evolved through
four overlapping phases:

1. **Helper extraction** (early): isolate pure utility code into modules
   like `pure_helpers_module.js`, `math_helpers_module.js`, etc. Tested in
   `tests/`.
2. **Handler extraction** (middle): lift handler functions to modules
   (e.g., `generate_dispatcher_module.js`, `phase_k_helpers_module.js`).
   Monolith handlers became 4-line delegation shims.
3. **View extraction** (recent): lift JSX render blocks to per-module
   `view_*_module.js` files. ~30 view modules now exist. The monolith
   shim is typically a single line that invokes `<ViewModule {...props} />`
   if the CDN module loaded, else returns null.
4. **State centralization → context migration** (current): the 190+
   `useState` hooks in `AlloFlowContent` are migrating toward typed
   contexts. As of May 10 2026, four contexts and three reducers are in
   place. Phase 2 (per-module context consumption) is starting with
   HeaderBar as the proof.

## Core Container

`AlloFlowANTI.txt` is the source of truth. `prismflow-deploy/src/App.jsx`
is the compiled counterpart, kept in sync by `build.js`. Both files contain:

- All React component logic for `AlloFlowContent`
- The 190+ useState declarations + the 3 useReducer slices
- ~200 handler functions (most delegate to CDN handler modules)
- The big JSX render tree (~4,000 lines)
- The 4 Context providers wrapping the rendered tree

**Rules:**
- Edit `AlloFlowANTI.txt`, never edit `App.jsx` directly. `build.js`
  regenerates `App.jsx` on every deploy.
- Some tools may not read the file cleanly because it contains emoji
  bytes. Prefer PowerShell `Select-String`, Python with UTF-8 explicit
  encoding, or the IDE search.

### Where to find things

Approximate locations as of May 2026 (line numbers shift, use `Select-String`
to confirm):

| Region | Approx Line | What's there |
|---|---|---|
| Imports, top-level consts | 1-500 | React, Firebase, lucide imports, config, version |
| Helper consts + small lifters | 500-2200 | safeGetItem, sanitizeHtml, AlloBot wrapper, game wrappers |
| Lucide icon imports | 17-31 | All ~120 lucide icons used by CDN modules |
| `Object.assign(window, {...})` icon bridges | 3456 + 3473 | Exposes lucide icons to CDN modules via `window.X` |
| `LanguageContext` declaration | ~1242 | `export const LanguageContext = React.createContext()` |
| `ActiveViewContext` / `RoleContext` / `ThemeContext` declarations | ~1247-1259 | Phase 1 contexts |
| `uiChromeReducer` + `UI_INITIAL_STATE` | 2225-2260 | Modal/chrome state |
| `adventureReducer` | ~2261 | Adventure state with action-routed setter |
| `AlloFlowContent` component start | ~2338 | The container |
| State declarations | ~2400-5500 | All useState/useReducer hooks |
| Handlers + effects | ~5500-20000 | Everything else in the component body |
| JSX return statement | ~20085 | Start of rendered tree |
| Context provider wrap | ~20096 | `<ActiveViewContext.Provider value={...}>` etc. |
| Header bar shim invocation | ~20579 | `{!isZenMode && <HeaderBar {...props} />}` |
| HistoryPanel shim invocation | ~21280 | The history sidebar (mode-conditional) |
| Modal stack | ~20300-21500 | All the conditional `{showXModal && <XModal />}` shims |
| ActiveView router | ~22000-22800 | 30+ branches dispatching to view modules |
| `AlloFlowContent` closing brace | ~23857 | End of container |
| `AlloFlowErrorBoundary` class | ~23856 | Production error boundary wrapper |

## State Management

`AlloFlowContent` exposes cross-cutting state to its descendants through
four typed React Contexts and three useReducer slices.

### React Contexts

| Context | Provides | Source line |
|---|---|---|
| `LanguageContext` | `{ t, isTranslating, ...i18n methods }` | ~1242 |
| `ActiveViewContext` | `{ activeView, setActiveView }` | ~1247 |
| `RoleContext` | `{ isTeacherMode, isIndependentMode, isParentMode, setIsTeacherMode }` | ~1252 |
| `ThemeContext` | `{ theme, colorOverlay, readingTheme, focusMode, disableAnimations, baseFontSize, lineHeight, letterSpacing, selectedFont, +setters, toggleTheme, toggleOverlay }` | ~1257 |

Each Context object is also attached to `window.AlloXContext` so CDN
view modules can consume them. The Providers wrap the entire return JSX
of `AlloFlowContent`, so all descendant CDN modules are inside the
Provider tree at render time.

### useReducer slices

| Reducer | Initial state | Action types | Why a reducer |
|---|---|---|---|
| `uiChromeReducer` | `UI_INITIAL_STATE` (line ~2225) | `UI_SET`, `UI_RESET` | Was 60+ separate useState calls; collapsed into one shape with field-name actions |
| `csReducer` | `CS_INITIAL_STATE` | `CS_SET` | Concept-sort game state |
| `adventureReducer` | `ADVENTURE_INITIAL` (inline at useReducer call site) | `ADVENTURE_SET` (functional-updater payload) | Single chokepoint for adventure state changes; backwards-compatible setter wrapper preserves the useState API |

### Phase 2 context-consumer pattern (HeaderBar exemplar)

When a CDN view module needs cross-cutting state, it consumes via context
instead of accepting it as props. The pattern (from `view_header_source.jsx`):

```jsx
function HeaderBar(props) {
  // ...icon destructuring from window.X globals...

  // Phase 2: consume contexts directly rather than accepting via props.
  // The `|| {}` fallback covers the rare CDN-loaded-before-Provider race.
  const _activeViewCtx = React.useContext(window.AlloActiveViewContext) || {};
  const _roleCtx       = React.useContext(window.AlloRoleContext) || {};
  const _themeCtx      = React.useContext(window.AlloThemeContext) || {};
  const { activeView } = _activeViewCtx;
  const { isTeacherMode, isIndependentMode, setIsTeacherMode } = _roleCtx;
  const { theme, colorOverlay, readingTheme, /* ...13 more theme fields... */ } = _themeCtx;

  // Remaining props (the things genuinely owned by the call site)
  const { addToast, generatedContent, /* ...96 more props... */ } = props;

  return ( /* ... JSX ... */ );
}
```

Result: HeaderBar's prop interface dropped from 119 to 98 (a 17% reduction).
The same pattern applies to any future module that wants to consume
ActiveView/Role/Theme state without prop drilling.

## View Module Pattern

The largest class of CDN modules is the "view module": a JSX render block
extracted from `AlloFlowContent`'s return statement, compiled to a CDN file,
loaded at runtime, and invoked via a 1-line shim in the monolith.

### Anatomy of a view module

Every view module has three files at the repo root:

| File | Purpose | Author |
|---|---|---|
| `view_X_source.jsx` | JSX source with a `function X(props) { return ( /* JSX */ ); }` declaration. Imports nothing. Reads icons from `window.X` globals. | Human |
| `_build_view_X_module.js` | Esbuild compile script. Runs `npx esbuild` with `--jsx=transform`, wraps the output in an IIFE, registers on `window.AlloModules.X` | Generated, ~50 lines |
| `view_X_module.js` | Compiled CDN module. ~30-200 lines depending on the source size. **Never edit by hand**. | Auto-generated |

### Module IIFE template

```js
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.MyView) {
    console.log('[CDN] MyView already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[MyView] React not found on window'); return; }

  // ... compiled component definition ...

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MyView = { MyView: MyView };
  console.log('[CDN] MyView loaded');
})();
```

### Monolith-side shim

In `AlloFlowANTI.txt`, the component is referenced via a thin shim
declared outside `AlloFlowContent`:

```js
// ── MyView extracted to view_my_view_module.js (CDN) ──
function MyView(props) {
  var Real = window.AlloModules && window.AlloModules.MyView && window.AlloModules.MyView.MyView;
  if (Real && Real !== MyView) return React.createElement(Real, props);
  return null;
}
```

And rendered inside `AlloFlowContent`'s JSX:

```jsx
{someCondition && <MyView prop1={state1} prop2={state2} /* ... */ />}
```

### Module registry

`build.js` keeps a `MODULES` array listing every CDN module's name and
filename. The build step writes the pinned-hash URL into the compiled
`App.jsx`. As of May 2026 there are 90+ registered modules.

### `loadModule()` flow

At app startup, `AlloFlowContent` calls `loadModule(name, url)` for each
CDN module. The function injects a `<script>` tag and waits for the IIFE
to register on `window.AlloModules.X`. If the CDN fetch fails, the shim
falls back to its default (return null), keeping the app functional
offline.

## STEM Lab Plugin Architecture

STEM Lab is a secondary plugin host: `stem_lab_module.js` registers as
a CDN module, then each tool is a self-contained IIFE registered via
`window.StemLab.registerTool(id, config)`.

As of May 2026 there are ~94 STEM Lab tools across 9 subject areas: math
fundamentals, advanced math, life science, earth science, physics,
chemistry, computer science, music + art, and vocational labs (welding,
auto repair, road safety, first response, swim safety, etc).

For the full per-tool catalog (display names, purposes, grade bands,
notes), see [FEATURE_INVENTORY.md § 4](FEATURE_INVENTORY.md#4-stem-lab-tools).
This section covers the plugin *pattern* only.

### Plugin file template

```js
/**
 * stem_tool_yourname.js — [Tool Name]
 * Registered tool ID: "yourToolId"
 */
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  window.StemLab.registerTool('yourToolId', {
    name: 'Your Tool Name',
    icon: '🔬',
    category: 'science',
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      // render logic using ctx.toolData, ctx.setToolData
    }
  });
})();
```

### Adding a new STEM tool

1. Create `stem_lab/stem_tool_yourname.js` following the template.
2. Register the file in the `toolModules` array in both `AlloFlowANTI.txt`
   and `prismflow-deploy/src/App.jsx`. (build.js handles deploy syncing.)
3. Add the tile entry in `stem_lab_module.js` so the new tool appears in
   the launcher catalog.

## SEL Hub Plugin Architecture

Same pattern as STEM Lab. `sel_hub_module.js` hosts **32 tools + 1 shared
safety layer** across the CASEL 5 social-emotional competency framework
plus a "Civic & Hope" bucket. Each tool registers via
`window.SelHub.registerTool(id, config)`.

CASEL 5 + Civic & Hope coverage (May 2026):

| Competency | Tools | Count |
|---|---|---|
| Self-Awareness | compassion, emotions, strengths, zones, growthmindset, journal, perspective, voicedetective | 8 |
| Self-Management | coping, mindfulness, execfunction, goals, advocacy, transitions, selfadvocacy, digitalwellbeing | 8 |
| Social Awareness | community, cultureexplorer, upstander, ethicalreasoning | 4 |
| Relationship Skills | conflict, conflicttheater, friendship, social, sociallab, peersupport, teamwork, restorativecircle | 8 |
| Responsible Decision-Making | decisions, safety, crisiscompanion | 3 |
| Civic & Hope | civicaction | 1 |
| **Total tools** | | **32** |
| **Infrastructure** | `sel_safety_layer.js` (consent gates, AI safety tier detection, crisis resources, transcript persistence) | 1 file |

For per-tool purposes, grade bands, clinical-framework citations, and
discoverability paths, see
[FEATURE_INVENTORY.md § 5](FEATURE_INVENTORY.md#5-sel-hub-tools). This
section covers the plugin *pattern* only.

## Extraction Toolchain

The view extraction work is supported by three Node scripts at the repo
root. Each reads the monolith without modifying it.

| Script | Purpose | Output |
|---|---|---|
| `_jsx_render_tree.cjs` | Parses `AlloFlowContent`'s return statement via `@babel/parser`, emits a structural map with line ranges. Used to pick extraction seams. | Tree of JSX elements with line ranges, eg. `[20675-21492] (818 lines) <header>` |
| `_jsx_dep_enumerator.cjs` | For a given line range, classifies every referenced identifier as STATE / SETTER / HANDLER / REF / HELPER / IMPORT / UNKNOWN. | Categorized deps list + a ready-to-paste destructure block |
| `_jsx_phantom_ref_check.cjs` | Verifies every JSX-referenced identifier in a range resolves to a definition somewhere in the source. Exits 1 on any phantom. | Pass / fail report. Catches latent ReferenceErrors before extraction. |

### What the toolchain has surfaced

During the May 10 2026 refactor, the phantom-ref check uncovered four
classes of pre-existing latent bug that were never caught at runtime
because the affected code paths were rare-button clicks:

1. **22 missing window-global icons.** Several lucide icons were imported
   at the top of `AlloFlowANTI.txt` but never exposed on the `window.*`
   bridge. CDN modules referencing them rendered noop placeholders.
   Fixed by expanding `Object.assign(window, {...})` at lines 3456 and 3473.
2. **`setShowBatchConfig`** undefined in the `TeacherHistoryTab` "Differentiate by
   Group" button. Defaulted to noop in the extracted module; flagged for
   source-side cleanup.
3. **`activeSelStation` + `setActiveSelStation`** undefined in the
   `HistoryPanel` "Delete SEL Station" button. Same fix.
4. **`setPdfBatchFiles`** undefined in the `EducatorHubModal` PDF batch
   flow. Same fix.

The principle behind all four: when JSX lives inline in a 20K-line
container, JavaScript only resolves an identifier when that code path
actually executes. Extracting the JSX forces every identifier to be
enumerated and statically verified, surfacing bugs that runtime testing
would only reveal under unusual clicks.

## Test + Verify Infrastructure

### Unit tests (`tests/`)

Five vitest files cover the most-used helper modules:

| File | Module under test | Tests |
|---|---|---|
| `tests/glossary_helpers.test.js` | `glossary_helpers_module.js` | ~22 |
| `tests/math_helpers.test.js` | `math_helpers_module.js` | ~18 |
| `tests/pure_helpers.test.js` | `pure_helpers_module.js` | ~30 |
| `tests/text_pipeline_helpers.test.js` | `text_pipeline_helpers_module.js` | ~28 |
| `tests/utils_pure.test.js` | `utils_pure_module.js` | ~28 |

Configuration: `vitest.config.js` uses jsdom. Each test loads the target
module's IIFE against a shared `window` via `tests/setup.js`'s
`loadAlloModule()` helper, then asserts against `window.AlloModules.X`.

Run with `npm test` (or `npm run test:watch` for watch mode).

### Static + structural checks (`dev-tools/`)

Fourteen verifier scripts orchestrated by `dev-tools/verify_all.cjs`:

- `verify_module_registry.cjs` — every `window.AlloModules.X` consumer
  has a matching producer
- `check_translation_keys.cjs` — every `t('key')` and `HELP_STRINGS.key`
  resolves
- `check_tool_registry.cjs` — STEM Lab + SEL Hub `registerTool` shapes
  valid
- `check_source_pair_drift.js` — `AlloFlowANTI.txt` and
  `prismflow-deploy/src/AlloFlowANTI.txt` byte-match
- `check_pipeline_integrity.js` — Document Builder `_docPipeline.X` UI
  calls match exports
- `check_build_smoke.cjs` — `App.jsx` builds and bundles cleanly
- `check_deploy_mirror.cjs` — root files match `prismflow-deploy/public/`
  mirrors
- ...and 7 more: CORS, XSS, secret scan, npm audit, eval, plugin
  defensive guards, etc.

Run all (fast) with `npm run verify`. Add `--runtime` or `--all` for slower
runtime checks. Many of these checks fail-fast in a git pre-commit hook.

## Build + Deploy Pipeline

### `build.js`

Single source of truth: `build.js --mode=prod` (or `--mode=dev`) reads
`AlloFlowANTI.txt`, swaps every `loadModule(...)` URL for a pinned CDN
hash (prod) or local path (dev), and writes
`prismflow-deploy/src/App.jsx`. Auto-copies module files to
`prismflow-deploy/public/`.

### `deploy.sh` (turbo-all)

The full deploy is a 9-step orchestrator at the repo root:

1. **Source commit** (only if files are pre-staged)
2. **Push source to origin**
3. **Run build.js** (regenerate `App.jsx` with pinned hashes)
4. **npm run build** (CRA build to `prismflow-deploy/build/`)
5. **Firebase deploy** (static hosting)
6. **Post-deploy commit** (update CDN hash refs in `AlloFlowANTI.txt` to
   point at the just-pushed commit)
7. **Push post-deploy commit to origin**
8. **Mirror to Codeberg backup** (push to `Pomera/AlloFlow-backup`)
9. **Push tags to backup**

Critical gotcha: step 1 only commits **pre-staged** files. With multiple
concurrent agents working on the codebase, you must explicitly
`git add <your-files>` before running `./deploy.sh`. The "Hash: @XXX"
banner that deploy.sh prints can be misleading when multiple deploys
race — verify your specific commit landed via `git log --oneline -5`.

## Pinned Dependency Injection

CDN URLs are pinned to exact commit hashes via jsdelivr, never `@main`
or `@latest`. This makes builds deterministic and offline-reproducible.
The `build.js` rewrite step inserts the current commit hash.

```js
// Correct: pinned to exact commit
loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@a1b2c3d/stem_lab/stem_lab_module.js');

// The `@main` placeholder is reserved for newly-added modules between
// the source commit and the rewrite; it must never end up in a tagged release.
```

After every merge, `build.js` runs during the deploy and rewrites every
`@hash` to point at the new commit. The post-deploy commit (step 6) is
the record of which hash was deployed when.

## Deployment Targets

The same codebase ships to three places.

### 1. Gemini Canvas

Runs as a Canvas artifact inside Google Gemini. Canvas injects a
`__firebase_config` global at startup. The app detects Canvas via
`typeof __firebase_config !== 'undefined'` (never `typeof process`, see
below). In Canvas mode, the Gemini API key is intentionally empty
because Canvas's proxy intercepts outbound `?key=` requests and injects
the key server-side.

### 2. Firebase Hosting (cloud)

```bash
cd prismflow-deploy
npm install
npm run build
firebase deploy
```

Or invoke the full `./deploy.sh` from the repo root. Firebase hosts only
static files; no student data crosses the network.

### 3. School Box (local Docker)

```bash
git clone https://github.com/apomera/AlloFlow.git
docker-compose up -d
```

Services: Ollama (LLM inference), PocketBase (local DB), Piper / Edge
TTS (offline speech), SearXNG (local search), Nginx (reverse proxy +
SSL). Status of the School Box image as of May 2026: under active
development, not yet operational.

## Canvas Mode + API Key Configuration

### Environment detection (`_isCanvasEnv`)

A guarded IIFE detects Canvas:

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

### Critical: `process.env` versus `process` global

> **Never use `typeof process !== 'undefined'` as a guard in this codebase.**
> CRA's webpack replaces `process.env.REACT_APP_*` with literal strings
> at build time but does not polyfill the `process` global. In the browser
> at runtime, `typeof process === 'undefined'`. Any `typeof process` guard
> will fail and silently skip the guarded code.
>
> Use `typeof __firebase_config !== 'undefined'` to detect Canvas vs
> Firebase. This bug caused a production outage on 2026-03-07
> (`auth/invalid-api-key`).

### API key injection table

| Context | `__firebase_config` defined? | `apiKey` value | Who provides the real key |
|---|---|---|---|
| Canvas | Yes (injected by Canvas) | `""` (empty) | Canvas proxy intercepts `key=` and injects |
| Firebase | No | `process.env.REACT_APP_GEMINI_API_KEY` | `.env` at build time |

## Accessibility Architecture

Every interactive element (including all STEM tools and games) is keyboard
operable (Tab / Enter / Arrow). ARIA labels are required everywhere.

TTS is in-browser, never cloud:
- **Kokoro** (English, 30+ neural voices)
- **Piper** (40+ languages, WebAssembly)

Audio never leaves the device.

## Privacy Architecture

| Layer | Implementation |
|---|---|
| Zero PII required | App never prompts for student names or IDs |
| On-device storage | All session data in `localStorage`; no cloud writes |
| TeacherGate | Clinical tools and answer keys gated behind educator verification |
| Fact-Chunk pipeline | PII-scrubbing layer applied before report generation to prevent AI hallucination of sensitive data |
| Air-gap option | School Box deployment operates with no external API calls |

## Development Notes

### Service worker and QUIC caching

During local dev, stale assets are sometimes served. Two common causes:

1. **Service worker cache**. DevTools, Application, Service Workers, Unregister, then hard reload.
2. **QUIC protocol**. `chrome://flags/#enable-quic` set to Disabled, then relaunch.

### File encoding

| Property | `AlloFlowANTI.txt` | `stem_lab_module.js` |
|---|---|---|
| Approx size | 1.2 MB / ~24K lines (down from 4.3 MB / 67K in April) | varies |
| Line endings | CRLF (pure) | CRLF (pure) |
| BOM | None | None |
| Non-ASCII | ~6 KB of emoji | ~14 KB of emoji |

### Tool reliability

Ripgrep silently returns zero results on these large emoji-bearing files;
use PowerShell `Select-String`, Python with `encoding='utf-8'`, or IDE
search.

### Console log policy

Never leave `console.log` statements that could output PII, student
names, clinical scores, or ABA metrics. AlloBot internal traces use a
`_debug` flag gated behind `process.env.NODE_ENV === 'development'`.

## Maintainability Roadmap

What's still on the table for future structural work.

### Phase 2 expansion

The HeaderBar context-consumer pattern is the template. The next
candidates to migrate (similar to HeaderBar but smaller):

| Module | Current props | Estimated post-migration props |
|---|---|---|
| HistoryPanel | 85 | ~70 |
| SessionModal | 19 | ~12 |
| StudentSaveAdventurePanel | 14 | ~10 |
| InfoModal | 9 | ~6 |

Each migration is ~15-20 min including verify + deploy.

### Activeview router refactor

The `<ErrorBoundary>` block at ~22000-22800 contains 30+ branches of
`{activeView === 'X' && React.createElement(window.AlloModules.XView, {props})}`.
Each branch has its own 20-30 prop bag. The refactor: lift each props bag
into a named const above the JSX. Mechanical, low per-branch risk, large
total touch surface. Estimated 2-3 hours done per-branch with deploys
between.

### State migrations remaining

- `studentProjectSettings` is a useState object; could be a reducer slice
- Math fluency state is ~10 separate useStates; could be a reducer cluster
- Adventure climax state is nested inside `adventureState` and may benefit
  from sub-reducer composition

### Test coverage gaps

The 126 existing vitest assertions cover helper module logic. Not covered:
- React state propagation across context boundaries
- View module rendering against jsdom
- The build pipeline itself (verify_all.cjs checks structure, not behavior)

A future direction: a small set of jsdom + react-testing-library tests
that mount the Context Providers and verify a representative CDN view
module renders correctly.

## Appendix: Repo Layout

```
.
├── AlloFlowANTI.txt              ← Container source of truth
├── architecture.md               ← This file
├── build.js                      ← Source → App.jsx compiler
├── deploy.sh                     ← Turbo-all deploy
├── _build_*_module.js            ← Per-module esbuild scripts (~30)
├── _jsx_render_tree.cjs          ← Extraction toolchain
├── _jsx_dep_enumerator.cjs       ← Extraction toolchain
├── _jsx_phantom_ref_check.cjs    ← Extraction toolchain
├── view_*_source.jsx             ← View module sources (~30 files)
├── view_*_module.js              ← Compiled view modules (~30 files)
├── *_module.js                   ← Other CDN modules (~50 files)
├── stem_lab/
│   ├── stem_lab_module.js        ← STEM Lab host
│   └── stem_tool_*.js            ← 95 plugin tools (May 2026)
├── sel_hub/
│   ├── sel_hub_module.js         ← SEL Hub host
│   └── sel_tool_*.js             ← 49 plugin tools (May 2026)
├── tests/
│   ├── setup.js                  ← vitest fixture
│   └── *.test.js                 ← 5 helper module test files
├── dev-tools/
│   ├── verify_all.cjs            ← Orchestrator (14+ checks)
│   ├── verify_*.cjs              ← Individual verifiers
│   └── check_*.cjs               ← Individual checks
├── prismflow-deploy/             ← Firebase deploy package
│   ├── src/App.jsx               ← Auto-generated from AlloFlowANTI.txt
│   ├── src/AlloFlowANTI.txt      ← Mirror, kept in sync
│   ├── public/*_module.js        ← Mirror of root modules
│   └── functions/                ← Firebase Functions
└── vitest.config.js              ← Test runner config
```
