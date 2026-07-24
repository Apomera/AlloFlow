# AlloFlow Architecture

*Last meaningful update: July 9, 2026. Reflects the July codebase review,
Desktop/local-first clarification, and the much larger CDN/plugin surface that
hosts the rendered UI.*

> **Dated baseline — 2026-07-03:** the live workspace contains 151 top-level
> `build.js` module definitions, 111 STEM tool files with 116 registered STEM
> plugin IDs, 70 SEL tool files, 111 root `*_source.jsx` / `*_module.js` pairs,
> 413 test files, and about 2.70M canonical-ish source lines after excluding
> deploy mirrors and generated source/module pairs. See
> [docs/codebase_review_2026-07-03.md](docs/codebase_review_2026-07-03.md). These are point-in-time measurements, not current totals. As of July 18, the live STEM registry contains 122 tool files / 123 IDs and the SEL registry contains 70 tools; use `build.js` for the current module map.

> **Companion document:** This file describes *how* the codebase is structured.
> For the catalog of *what* the codebase actually does (400+ rows in the dated feature matrix, plus broader inventory groupings;
> every STEM tool, every SEL tool, and discoverability paths), see
> [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md). The two documents pair
> deliberately: architecture for engineering review, feature inventory for
> product / educator review.

## Overview

AlloFlow is a single-page React application with a **container/presentational
split at scale**. One large container component (`AlloFlowContent` inside
`AlloFlowANTI.txt`) owns all application state. Over 80 self-contained CDN
view modules accept state via props or React Context and render the actual
UI. Heavy feature modules load dynamically at runtime, keeping the initial
payload small enough to run on school Chromebooks and inside Gemini Canvas.

The current architecture is best understood as three layers:

1. **Canvas host / orchestrator:** `AlloFlowANTI.txt`, compiled to
   `desktop/web-app/src/App.jsx`, owns state, role gates, AI bridges,
   contexts, and routing.
2. **Top-level modules:** `build.js` is the authoritative current module map, including Doc Pipeline, BehaviorLens, AlloHaven, Video Studio,
   AlloStudio, Open Groove Studio, Teacher, StoryForge, and view modules.
3. **Plugin families:** STEM, SEL, psychometric probe JSONs, TTS loaders, and
   other lazily loaded plugin files self-register at runtime.

```
AlloFlowANTI.txt / App.jsx          ← Container (~31K deployed lines, cross-cutting state)
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
├── build-managed top-level modules         ← Loaded dynamically via loadModule() / build.js map
│   ├── view_header_module.js         ← Header bar (Phase 2 context consumer)
│   ├── view_history_panel_module.js  ← History sidebar (522 lines extracted)
│   ├── view_kokoro_offer_modal.js    ← Modals, panels, toolbars
│   ├── view_*_module.js              ← (~30 view modules total)
│   ├── stem_lab_module.js            ← STEM Lab host + 122 tool files / 123 registered IDs
│   ├── sel_hub_module.js             ← SEL Hub host + 70 tools + safety/standards layers
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
(April 2026) to the current ~31K-line deployed container. The shape evolved through
five overlapping phases:

1. **Helper extraction** (early): isolate pure utility code into modules
   like `pure_helpers_module.js`, `math_helpers_module.js`, etc. Tested in
   `tests/`.
2. **Handler extraction** (middle): lift handler functions to modules
   (e.g., `generate_dispatcher_module.js`, `phase_k_helpers_module.js`).
   Monolith handlers became 4-line delegation shims.
3. **View extraction** (recent): lift JSX render blocks to per-module
   `view_*_module.js` files. ~50 view modules now exist. The monolith
   shim is typically a single line that invokes `<ViewModule {...props} />`
   if the CDN module loaded, else returns null.
4. **State centralization → context migration** (ongoing): the 190+
   `useState` hooks in `AlloFlowContent` are migrating toward typed
   contexts. As of May 10 2026, four contexts and three reducers are in
   place. Phase 2 (per-module context consumption) is starting with
   HeaderBar as the proof.
5. **Build-source consolidation** (2026-05-19): the early view extractions
   (rounds 1-3) used a build pipeline that read JSX bodies from `c:/tmp/`
   text files on the maintainer's machine. This was a footgun: running an
   out-of-date build could silently overwrite the deployed module with
   stale content. All 21 such legacy build scripts have been migrated to
   read from in-repo `view_*_source.jsx` files. For 9 of them, the
   deployed module had drifted from any reproducible source, so the JSX
   was reverse-compiled from the deployed `React.createElement(...)`
   chains. Reverse-compile tooling is documented in the
   [Extraction Toolchain](#extraction-toolchain) section.

## Core Container

`AlloFlowANTI.txt` is the source of truth. `desktop/web-app/src/App.jsx`
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
| `view_X_source.jsx` | JSX source. Either a `function X(props) { return ( /* JSX */ ); }` declaration (legacy-style) or a full component including helpers + icon vars + the function (modern-style). Imports nothing. Reads icons from `window.X` globals. | Human |
| `_build_view_X_module.js` (modern) or `build_view_X.js` (legacy-style) | Compile script. Modern variant uses esbuild + reads the full source; legacy variant uses `@babel/core` + wraps a JSX body in a prop-destructure template. Both write the IIFE-wrapped module. | Generated, ~50-100 lines |
| `view_X_module.js` | Compiled CDN module. ~30-200 lines depending on the source size. **Never edit by hand**. | Auto-generated |

**Two coexisting build-script variants.** As of 2026-05-19, ~13 modules
(launch_pad, brainstorm, image, project_settings, outline, math, lesson_plan,
sentence_frames, persona_chat, adventure, spotlight, word_sounds, dbq) still
use the legacy-style `build_view_X.js` that wraps a JSX body fragment with a
prop-destructure template. The rest use the modern `_build_view_X_module.js`
pattern that reads a complete component file. Both read from in-repo
`view_X_source.jsx`. Consolidating to one pattern is on the Maintainability
Roadmap but isn't urgent — both produce correct output.

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
`App.jsx`. As of the July 3, 2026 audit there are 151 top-level
entries, plus large plugin families for STEM, SEL, psychometric probes,
and TTS loaders.

### `loadModule()` flow

At app startup, `AlloFlowContent` calls `loadModule(name, url)` for each
top-level CDN module that is not deferred. The function injects a
`<script>` tag and waits for the IIFE to register on `window.AlloModules.X`.

Two failure paths are wired:

1. **Network onerror** — `s.onerror` fires (e.g., DNS, 5xx, CORS mismatch).
   `loadModule` builds a fallback URL pointing at `raw.githubusercontent.com/Apomera/AlloFlow/main/`
   and appends a second `<script>` tag. The fallback regex recognizes both
   the new Cloudflare Pages URL pattern (`alloflow-cdn.pages.dev/`) and
   the legacy jsdelivr pattern (`cdn.jsdelivr.net/gh/Apomera/AlloFlow@HASH/`)
   so the four still-pinned jsdelivr modules can also recover.
2. **Script loaded but never registered** — script returned 200 but didn't
   call `window.AlloModules[name] = X`. Same fallback to GitHub raw, plus
   a `console.error` listing the keys of `window.AlloModules` at the time
   of failure for diagnosis.

If both primary and fallback fail, the monolith-side shim returns its
default (typically `null`), keeping the app functional in a degraded mode.

**Lazy-load variant** (introduced May 12 2026 and expanded since): selected
modules wrap their `loadModule(...)` call inside a fire-once closure exposed
as `window.__alloLazy<Name>`. The corresponding `setShow<Name>` React setter
is wrapped via `React.useCallback` to invoke that closure on first true,
deferring the script fetch until the user opens the feature. Lazy candidates
are pure modal modules and standalone feature hubs such as AlloHaven,
SymbolStudio, StoryForge, LitLab, PoetTree, EducatorHubModal,
LearningHubModal, VisualSupportsModal, and studio surfaces.

## STEM Lab Plugin Architecture

STEM Lab is a secondary plugin host: `stem_lab_module.js` registers as
a CDN module, then each tool is a self-contained IIFE registered via
`window.StemLab.registerTool(id, config)`.

As of July 18, 2026 there are 122 `stem_tool_*.js` files
with 123 registered plugin IDs. The count difference is intentional: some
files preserve aliases or paired IDs. The tools span math fundamentals,
advanced math, life science, earth science, physics, chemistry, computer
science, music + art, and vocational/applied labs such as welding, auto
repair, road safety, first response, swim safety, aviation, fisheries,
nutrition, birds, and weather.

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
   and `desktop/web-app/src/App.jsx`. (build.js handles deploy syncing.)
3. Add the tile entry in `stem_lab_module.js` so the new tool appears in
   the launcher catalog.

## SEL Hub Plugin Architecture

Same pattern as STEM Lab. `sel_hub_module.js` hosts **70 tools plus shared
safety/standards infrastructure** across the CASEL 5 social-emotional
competency framework plus Civic & Hope, restorative practices, regulation,
digital citizenship, and personalized student-kit flows. Each tool registers via
`window.SelHub.registerTool(id, config)`.

CASEL 5 + Civic & Hope coverage has expanded since the May 2026 snapshot
below. Treat this table as historical; use [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md)
and [docs/codebase_review_2026-07-03.md](docs/codebase_review_2026-07-03.md)
for the current 70-tool count.

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

The view extraction and migration work is supported by five Node scripts at
the repo root. The first three read the monolith without modifying it; the
last two operate on already-compiled view modules.

| Script | Purpose | Output |
|---|---|---|
| `_jsx_render_tree.cjs` | Parses `AlloFlowContent`'s return statement via `@babel/parser`, emits a structural map with line ranges. Used to pick extraction seams. | Tree of JSX elements with line ranges, eg. `[20675-21492] (818 lines) <header>` |
| `_jsx_dep_enumerator.cjs` | For a given line range, classifies every referenced identifier as STATE / SETTER / HANDLER / REF / HELPER / IMPORT / UNKNOWN. | Categorized deps list + a ready-to-paste destructure block |
| `_jsx_phantom_ref_check.cjs` | Verifies every JSX-referenced identifier in a range resolves to a definition somewhere in the source. Exits 1 on any phantom. | Pass / fail report. Catches latent ReferenceErrors before extraction. |
| `_reverse_compile.cjs` | Reverse-compiles a deployed `view_X_module.js` back to JSX. Walks the AST, replaces `React.createElement(tag, props, ...children)` calls with JSXElement nodes. Strips all comments globally (line comments in JSX text positions would render as literal text). Wraps any string attribute containing `"`, `{`, `}`, or `\` as a JSXExpressionContainer to dodge JSX's lack of backslash escapes in attribute strings. Handles Fragment, MemberExpression tags, spread props, dashed attribute names. | A JSX file equivalent to the compiled source |
| `_reverse_migrate.cjs <stem>` | Full per-module pipeline: invokes `_reverse_compile.cjs`, extracts the inner content (helpers + icon vars + component function) by slicing between `var Fragment = React.Fragment;` and `window.AlloModules = ...`, writes `view_X_source.jsx`, generates a modern `_build_view_X_module.js` using `@babel/core` with `generatorOpts: { jsescOption: { minimal: true } }` (preserves literal UTF-8 instead of escaping). Used to migrate 9 modules whose deployed code had drifted from any reproducible source (2026-05-19). | view_X_source.jsx + _build_view_X_module.js, plus a regenerated view_X_module.js that is semantically equivalent (same AST modulo comments and formatting) to the previously deployed file. |

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

### Unit tests (`tests/*.test.js`)

Nine vitest files cover the most-used helper modules (~205 tests total):

| File | Module under test | Tests |
|---|---|---|
| `tests/anchor_charts.test.js` | `anchor_charts_module.js` | 23 |
| `tests/concept_pictionary.test.js` | `concept_pictionary_module.js` | 14 |
| `tests/glossary_helpers.test.js` | `glossary_helpers_module.js` | 20 |
| `tests/math_helpers.test.js` | `math_helpers_module.js` | 14 |
| `tests/note_taking_templates.test.js` | `note_taking_templates_module.js` | 20 |
| `tests/pure_helpers.test.js` | `pure_helpers_module.js` | 29 |
| `tests/text_pipeline_helpers.test.js` | `text_pipeline_helpers_module.js` | 29 |
| `tests/translation_pipeline.test.js` | translation flow | 22 |
| `tests/utils_pure.test.js` | `utils_pure_module.js` | 34 |

Configuration: `vitest.config.js` uses jsdom. Each test loads the target
module's IIFE against a shared `window` via `tests/setup.js`'s
`loadAlloModule()` helper, then asserts against `window.AlloModules.X`.

Run with `npm test` (or `npm run test:watch` for watch mode).

### Clinical logic tests (`tests/clinical_tests.js`)

A custom Node test runner with 117 tests organized into three clinical
priority tiers, asserting against logic extracted into
`tests/extracted_logic/clinical_logic.js`:

- **Tier 1** (affects real student services): score classification, PII
  scrubbing, RTI tier assignment.
- **Tier 2** (affects learning tracking): familiarity calculations, growth
  levels, anonymized codenames, correlation analysis.
- **Tier 3** (affects reports & data quality): doc pipeline integrity, math
  benchmark validation, output formatting.

Covers logic for BehaviorLens, Report Writer, and Symbol Studio in
isolation from UI. Run with `node tests/clinical_tests.js`.

### End-to-end tests (`tests/e2e/`)

Fourteen Playwright spec files (~65 tests) run against the deployed
Cloudflare student shell (`https://alloflow-cdn.pages.dev/app/` by default,
overridable via `PW_BASE_URL`):

| Spec | Scope |
|---|---|
| `01-app-boot.spec.ts` | App boot + initial state |
| `02-launch-pad.spec.ts` | Launch Pad mode picker |
| `03-cdn-modules.spec.ts` | CDN module loading |
| `04-learning-hub.spec.ts` | Learning Hub modal |
| `05-sidebar-controls.spec.ts` | Sidebar + global UI controls |
| `06-stem-lab-modal.spec.ts` | STEM Lab modal lifecycle |
| `07-sel-hub-modal.spec.ts` | SEL Hub modal lifecycle |
| `08-sidebar-tool-categories.spec.ts` | Tool category navigation |
| `09-a11y-baseline.spec.ts` | Accessibility manual checks |
| `10-public-pages.spec.ts` | Public-facing pages |
| `11-stem-tools-load.spec.ts` | STEM tool catalog loads |
| `12-sel-tools-load.spec.ts` | SEL tool catalog loads |
| `13-stem-tools-all-cdn.spec.ts` | Every STEM tool's CDN module loads |
| `14-flagship-tool-render.spec.ts` | Flagship tool renders end-to-end |

Run with `npx playwright test`.

### Static + structural checks (`dev-tools/`)

Forty-plus verifier and audit scripts orchestrated by `dev-tools/verify_all.cjs`:

- `verify_module_registry.cjs` — every `window.AlloModules.X` consumer
  has a matching producer
- `check_translation_keys.cjs` — every `t('key')` and `HELP_STRINGS.key`
  resolves
- `check_tool_registry.cjs` — STEM Lab + SEL Hub `registerTool` shapes
  valid
- `check_source_pair_drift.js` — `AlloFlowANTI.txt` and
  `desktop/web-app/src/AlloFlowANTI.txt` byte-match
- `check_pipeline_integrity.js` — Document Builder `_docPipeline.X` UI
  calls match exports
- `check_build_smoke.cjs` — `App.jsx` builds and bundles cleanly
- `check_deploy_mirror.cjs` — root files match `desktop/web-app/public/`
  mirrors
- ...and 7 more: CORS, XSS, secret scan, npm audit, eval, plugin
  defensive guards, etc.

Run all (fast) with `npm run verify`. Add `--runtime` or `--all` for slower
runtime checks. Many of these checks fail-fast in a git pre-commit hook.

## Build + Deploy Pipeline

### `build.js`

Single source of truth: `build.js --mode=prod` (or `--mode=dev`) reads
`AlloFlowANTI.txt`, swaps every `loadModule(...)` URL for the Cloudflare
Pages URL (`https://alloflow-cdn.pages.dev/<file>.js`) in prod or a local
path (`./<file>.js`) in dev, and writes `desktop/web-app/src/App.jsx`.
Auto-copies module files to `desktop/web-app/public/`. Prod URLs no
longer include a `@hash` suffix because Cloudflare Pages auto-invalidates
by content on every push to main; the old jsdelivr-era hash-pin pattern
is gone for managed modules (see "CDN Hosting" below).

The constant `CLOUDFLARE_CDN_BASE` at the top of `build.js` is the single
swap point if the CDN ever needs to change again.

### `deploy.sh` (turbo-all)

The full deploy is a 9-step orchestrator at the repo root:

1. **Source commit** (only if files are pre-staged)
2. **Push source to origin** — Cloudflare Pages auto-detects this push and
   starts its own build in parallel (~30-60 sec); see "CDN Hosting" below.
3. **Run build.js** (regenerate `App.jsx` with Cloudflare Pages URLs)
4. **npm run build** (CRA build to `desktop/web-app/build/`)
5. **Optional district Firebase deploy** (only when a school-owned project is
   explicitly configured; otherwise the Cloudflare `/app/` shell is used)
6. **Post-deploy commit** (mostly a no-op now that URLs don't include
   a hash; still re-runs build.js to catch any drift)
7. **Push post-deploy commit to origin**
8. **Mirror to Codeberg backup** (push to `Pomera/AlloFlow-backup`)
9. **Push tags to backup**

Critical gotcha: step 1 only commits **pre-staged** files. With multiple
concurrent agents working on the codebase, you must explicitly
`git add <your-files>` before running `./deploy.sh`. The "Hash: @XXX"
banner that deploy.sh prints can be misleading when multiple deploys
race — verify your specific commit landed via `git log --oneline -5`.

## CDN Hosting

The runtime fetch chain for the 151 build-managed top-level CDN modules plus
large plugin families has two tiers as of July 2026:

**Primary: Cloudflare Pages** — `https://alloflow-cdn.pages.dev/<file>.js`.
A Pages project (`alloflow-cdn`) on Aaron's Cloudflare account is linked
to the `Apomera/AlloFlow` GitHub repo. Cloudflare auto-rebuilds on every
push to main (~30-60 sec). Files are served from Cloudflare's edge
network with no GitHub API in the request path — no rate-limit cascade
risk. CORS is wide-open (`Access-Control-Allow-Origin: *`) so the
Canvas blob: origin can fetch cross-origin. Per-file cap: 25 MiB. The
`.gitignore` excludes media types that risk exceeding the cap (`*.m4a`,
`*.mp4`, `*.mov`, `*.wav`, `*.onnx`) with one exception for the small
audio file that `index.html` references.

**Fallback: GitHub raw** — `https://raw.githubusercontent.com/Apomera/AlloFlow/main/<file>.js?v=<timestamp>`.
Fires from `loadModule`'s `s.onerror` handler. Subject to GitHub's
unauthenticated rate limit (~60 req/hr per IP), so it's a safety net,
not a sustainable primary.

**Still on jsdelivr** (legacy): four pinned-hash modules — `ErrorReporter`
(`@50c0e33`), `AIBackend` (`@97e87aa`), `PoetTree` (`@5e3ae8e`),
`EscapeRoomModule` (`@19e37fe`) — kept jsdelivr URLs because they're not
in `build.js`'s `MODULES` array. Plus a handful of npm packages
(`jsonrepair`, `lz-string`, `idb-keyval`) that use jsdelivr's NPM
pipeline (different from the GitHub raw cascade and unaffected by it).

**Migration history:** Originally all CDN URLs were pinned to exact
commit hashes via jsdelivr (`cdn.jsdelivr.net/gh/Apomera/AlloFlow@<hash>/`),
making builds deterministic. In May 2026 jsdelivr's GitHub-fetch path
started returning GitHub's "429: Too Many Requests" plaintext as response
bodies on fresh commit hashes (see jsdelivr issues #18288 / #18311),
causing 30-40 of 127 modules to fail every cold load. Switched primary
to Cloudflare Pages; Cloudflare doesn't depend on GitHub at runtime
(files are copied to Cloudflare's storage at build time). No more
`@hash` in URLs because Cloudflare invalidates by content on each push.
The build.js dirty-tree and shrink guards still apply — they check
that local files match HEAD so what's pushed to GitHub is what
Cloudflare will serve.

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
cd desktop/web-app
npm install
npm run build
firebase deploy
```

Or invoke the full `./deploy.sh` from the repo root. Firebase Hosting serves
the static app; live-session and AI data flow depends on the selected backend,
provider, and deployment mode.

### 3. AlloFlow Desktop (local-first app)

```powershell
npm.cmd run desktop:check
npm.cmd run desktop:smoke
npm.cmd run desktop
```

Desktop runs the local runtime bridge, serves the bundled app, manages local
provider configuration and keys, supports the built-in local engine, and can
host Desktop LAN / Local Network classroom sessions without Docker.

### 4. Optional School Box Server (Docker)

```bash
git clone https://github.com/apomera/AlloFlow.git
docker-compose up -d
```

Services: Ollama (LLM inference), PocketBase (local DB), Piper / Edge
TTS (offline speech), SearXNG (local search), Nginx (reverse proxy +
SSL), and related optional local helpers. This stack is no longer the
default classroom path; it is the server/appliance packaging path for
schools that need a district-owned host, persistence, TLS, or heavier
air-gapped infrastructure.

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

Voice output is provider-dependent:
- **Desktop/local engines** such as Kokoro keep generation on the user's device
  when installed and selected.
- **Browser/system speech** can serve as a local fallback.
- **Cloud voices** are explicit provider choices for deployments that enable them.

### STEM tool theme + contrast

STEM tools intentionally use an immersive dark palette regardless of
the host app's `theme === 'light'` / `dark` setting — the dark canvas is
a deliberate lab-mode aesthetic (glare reduction, spectral color visibility,
"you are in a lab" psychological signal). Forcing all of them to flip with
the host theme would erase that design choice.

What IS wired up across the hardcoded-palette STEM tools:

- **CSS variables** in the STEM theme block of `AlloFlowANTI.txt` define `--allo-stem-canvas`,
  `--allo-stem-panel`, `--allo-stem-deeper`, `--allo-stem-text`,
  `--allo-stem-text-soft`, `--allo-stem-border`, `--allo-stem-button-*`.
  Three theme variants: light (`:root`/`.theme-default`), dark (`.theme-dark`),
  contrast (`.theme-contrast`). Tools that opt in use `var(--allo-stem-*)`
  for theme-responsive surfaces.
- **JS helper** at `stem_lab/stem_lab_module.js`:
  `window.AlloStemTheme.palette([themeName])` returns plain hex strings for
  canvas / SVG / dynamic-style consumers that can't use CSS variables.
  `window.AlloStemTheme.onChange(cb)` for tools that need a repaint signal.
- **High-contrast override stylesheet** in the same STEM theme block —
  attribute-selector CSS that catches inline `background: '#0f172a'` /
  `rgba(15,23,42,*)` / similar dark patterns and swaps them to `#000`
  when `.theme-contrast` is active. Same for common light text colors
  (`#cbd5e1`, etc. → `#ffff00`) and dark borders (`#334155` → `#ffff00`).
  Property-name-aware (won't override `color:` with bg rules or vice versa).
  SVG `fill`/`stroke` deliberately untouched — those encode information.
- **Bad-text-color guardrail** (`_stem_contrast_fix.cjs`) — per-tool
  script that replaces failing-AA dim text shades (`#64748b`, `#334155`,
  `#1f2937`, etc.) with AA-passing equivalents inside `color: '#X'`
  declarations. Already applied to 10 high-confidence dark-themed tools.

The result: high-contrast a11y users get a usable STEM Lab; everyone else
keeps the immersive lab-dark aesthetic. Full per-tool theme migration is
deliberately *not* attempted — see `STEM_LAB_THEME_AUDIT.md` for the
extended rationale.

## Privacy Architecture

| Layer | Implementation |
|---|---|
| Zero PII required | App never prompts for student names or IDs |
| On-device storage | All session data in `localStorage`; no cloud writes |
| TeacherGate | Clinical tools and answer keys gated behind educator verification |
| Fact-Chunk pipeline | PII-scrubbing layer applied before report generation to prevent AI hallucination of sensitive data |
| Local-first options | AlloFlow Desktop supports same-device and same-room LAN use without Docker; optional School Box Server deployments can run selected services without external API calls |

## Development Notes

### Service worker and QUIC caching

During local dev, stale assets are sometimes served. Two common causes:

1. **Service worker cache**. DevTools, Application, Service Workers, Unregister, then hard reload.
2. **QUIC protocol**. `chrome://flags/#enable-quic` set to Disabled, then relaunch.

### File encoding

| Property | `AlloFlowANTI.txt` | `stem_lab_module.js` |
|---|---|---|
| Approx size | 1.7 MB / ~31K deployed lines in `App.jsx`; source `AlloFlowANTI.txt` is ~1.7 MB locally (down from 4.3 MB / 67K in April) | varies |
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

### Build-script unification

Of the ~50 view modules, ~13 still use the legacy-style `build_view_X.js`
(JSX-body wrapper template, compiled with `@babel/core`) while the rest use
the modern `_build_view_X_module.js` (full-file source, compiled with
esbuild or babel). Both produce correct output; the difference is cosmetic
inconsistency. Each legacy-style module can be promoted with a few minutes
of work: write a new `_build_view_X_module.js` modeled on
`_build_view_header_module.js`, point it at the existing source.jsx,
verify byte-equivalent output, delete the legacy script. Not urgent.

### Test coverage gaps

The ~205 vitest assertions cover helper module logic; ~117 clinical logic
tests cover BehaviorLens, Report Writer, and Symbol Studio at the extracted
logic layer; ~65 Playwright tests cover app boot, modal lifecycles, tool
catalogs, and a11y baselines. Not covered:

- **Clinical UI flows end-to-end.** The clinical logic tests assert against
  extracted logic, but no Playwright spec drives through a full FBA→BIP
  flow or Report Writer wizard. A regression in the UI wiring between form
  fields and the (well-tested) clinical logic wouldn't be caught.
- **SEL Safety Layer triangulation under crisis input.** Logic likely
  covered in clinical_tests.js; no E2E test that types crisis keywords and
  verifies the safety panel renders correctly.
- **Language switching E2E.** `translation_pipeline.test.js` covers the
  loader; no Playwright spec switches language and confirms UI text
  actually updates (would catch manifest/pack-load issues).
- **RTL rendering.** Arabic/Hebrew packs exist and `dir="rtl"` is wired,
  but no test confirms it propagates and `ms-*`/`me-*` classes behave.
- **PDF pipeline output validation.** Now well covered: `check_pdf_pipeline.cjs`
  static check plus a large `tests/doc_pipeline_*.test.js` suite and e2e golden
  masters (`tests/e2e/pdf_tag_tree_golden.spec.ts`,
  `tests/e2e/pdf_validator_golden.spec.ts`, `tests/compare_tagged_pdf_perf.test.js`)
  that assert tagged-PDF structure and PDF/UA output.
- **React state propagation across Context boundaries** (jsdom unit-level).
- **CDN fallback chain.** Cloudflare → GitHub raw fallback path is not
  exercised under failure conditions.

Highest-leverage next additions: clinical UI flows (BehaviorLens, Report
Writer) and SEL Safety Layer crisis-input E2E. Both protect against
regressions in the UI→logic wiring layer that has the most real-world
clinical impact.

## Appendix: Repo Layout

```
.
├── AlloFlowANTI.txt              ← Container source of truth
├── architecture.md               ← This file
├── build.js                      ← Source → App.jsx compiler
├── deploy.sh                     ← Turbo-all deploy
├── _build_*_module.js            ← Per-module esbuild/babel build scripts (~40)
├── build_view_*.js               ← Legacy-style build scripts (~13, read in-repo source.jsx)
├── _jsx_render_tree.cjs          ← Extraction toolchain
├── _jsx_dep_enumerator.cjs       ← Extraction toolchain
├── _jsx_phantom_ref_check.cjs    ← Extraction toolchain
├── _reverse_compile.cjs          ← Reverse-compile (createElement → JSX) toolchain
├── _reverse_migrate.cjs          ← Reverse-compile migration orchestrator
├── view_*_source.jsx             ← View module sources (~30 files)
├── view_*_module.js              ← Compiled view modules (~30 files)
├── *_module.js                   ← Other CDN modules (~50 files)
├── stem_lab/
│   ├── stem_lab_module.js        ← STEM Lab host
│   └── stem_tool_*.js            ← 122 tool files / 123 registered IDs (July 18, 2026)
├── sel_hub/
│   ├── sel_hub_module.js         ← SEL Hub host
│   └── sel_tool_*.js             ← 70 tools (July 2026)
├── tests/
│   ├── setup.js                  ← vitest fixture
│   └── *.test.js                 ← 5 helper module test files
├── dev-tools/
│   ├── verify_all.cjs            ← Orchestrator (14+ checks)
│   ├── verify_*.cjs              ← Individual verifiers
│   └── check_*.cjs               ← Individual checks
├── desktop/web-app/             ← Firebase deploy package
│   ├── src/App.jsx               ← Auto-generated from AlloFlowANTI.txt
│   ├── src/AlloFlowANTI.txt      ← Mirror, kept in sync
│   ├── public/*_module.js        ← Mirror of root modules
│   └── functions/                ← Firebase Functions
└── vitest.config.js              ← Test runner config
```
