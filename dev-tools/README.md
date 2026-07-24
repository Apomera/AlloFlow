# `dev-tools/` — AlloFlow developer tooling

Verifiers, audits, and analyzers used during development. **None of these run in production** — they're guards against the bug classes that have surfaced during the project's growth.

> **Snapshot note (2026-07-09):** This is a curated developer-tool catalog, not the complete source of truth for every script. `package.json` and the scripts themselves are authoritative for current command names, pack counts, and runtime behavior; older "first run" counts below are historical triage notes unless re-run.

If you're looking for the WCAG/VPAT compliance documentation (the *results* of accessibility audits, not the audit *tools*), see the markdown files at the repo root: `tool_conformance_ledger.md`, `AXE_AUDIT.md`, `VPAT-2.5-WCAG-AlloFlow.md`, `alloflow_wcag_aa_audit_report.md`.

If you're looking for *unit tests* that run via Vitest, those live in [`tests/`](../tests/) at the repo root (`npm test`).

If you're looking for the *WCAG axe-core test suite*, that lives in [`a11y-audit/`](../a11y-audit/) — it's its own npm package (`npm run audit:a11y` from repo root).

---

## TL;DR — what command to run

| Goal | Command | Runtime | Notes |
|---|---|---|---|
| **Run all fast checks before pushing a deploy** | `npm run verify` | ~9 sec | 9 checks, no chromium/network needed |
| **Run everything including runtime + a11y** | `npm run verify:all` | ~17 sec | + V2 runtime + a11y static + phase2 diff |
| **Run unit tests** | `npm test` | varies | Vitest unit tests in `tests/` |
| **Build a pre-baked language pack** | `npm run build:lang -- --lang="Spanish (Latin America)"` | 30-90 sec | Generates `lang/<slug>.js`. Once committed, runtime users get the language without making any API calls. Requires `GEMINI_API_KEY` env var or `--api-key=` flag. Add `--dry-run` to validate the pipeline without spending tokens. Add `--resume` to retry failed chunks. Mirrors the runtime translateChunk DNT + glossary logic. |

**Especially valuable in multi-chat workflows:** `verify:mirror` and `verify:source-pair` catch the case where one chat edits a source file but doesn't sync to `desktop/web-app/public/` (or to the `desktop/web-app/src/` source duplicate). Run `npm run verify` after a parallel chat lands changes to surface drift before deploying.

Individual checks (also runnable in isolation):

```bash
npm run verify:registry           # static contract: window.AlloModules.X consumer/producer
npm run verify:registry:runtime   # runtime: actually load modules in chromium and verify
npm run verify:translations       # t() and HELP_STRINGS keys all defined
npm run verify:tools              # StemLab + SelHub registerTool schemas
npm run verify:pair-drift         # source.jsx ↔ module.js declaration diff
npm run verify:source-pair        # root vs desktop/web-app/src/ source dup drift
npm run verify:pipeline           # _docPipeline.X UI calls all map to exports
npm run verify:build              # AlloFlowANTI.txt + App.jsx parse cleanly as JSX
npm run verify:mirror             # root *_module.js matches desktop/web-app/public/
npm run verify:lessons            # examples/*.json parse + valid history shape
npm run verify:css                # stray backticks inside CSS template literals (bug class memory)
npm run verify:gemini             # callGemini(htmlPrompt, jsonMode=true) misuse
npm run verify:plugins            # stem_tool/sel_tool defensive load-order guards (informational)
npm run verify:functions          # 12 Firebase functions present + well-shaped
npm run verify:pdf                # 29 critical doc_pipeline functions present
npm run verify:lti                # LTI 1.3 endpoints + OIDC + JWT verification
npm run verify:secrets            # hardcoded API keys/tokens/passwords scan
npm run verify:cors               # CORS wildcard origins on Firebase Functions
npm run verify:xss                # dangerouslySetInnerHTML with non-sanitized input
npm run verify:eval               # eval / new Function(string) usage
npm run verify:audit              # npm audit (HIGH+CRITICAL deps)
npm run verify:security           # all security checks in sequence
npm run audit:a11y                # WCAG static scan (a11y-audit package)
npm run audit:a11y:runtime        # WCAG runtime scan (axe-core via puppeteer)
npm run verify:tile-catalog       # registerTool ids ↔ _allStemTools tile entries (BirdLab bug class, May 2026)
npm run verify:window-icons       # lucide imports ↔ Object.assign(window) blocks (HeaderBar bug class, May 2026)
npm run verify:iife-lazy          # top-level snapshots of window.AlloModules.X in IIFEs (QuickStart Fetch bug class, Apr 2026)
npm run verify:dashes             # em / en dashes in outbound prose only (Aaron preference; informational)
```

Auto-runs at `node build.js --mode=prod`: `verify:registry` only (the others are opt-in via `npm run verify`).

---

## Tool catalog (alphabetical)

### `audit_aria.js` (Node, manual)
ARIA-label inventory across `stem_lab/*.js`. TSV output for spot-checking missing/empty labels at scale.

### `audit_extracted_module.py` (Python — needs `npx esbuild` on PATH)
JSX-aware bare-reference auditor for extracted modules. Compiles `.jsx` to plain JS via esbuild, then checks that every closure-captured identifier in extracted handlers is properly threaded through `deps`. The most sophisticated tool here. Run after extracting a handler-style closure.

### `audit_pair_drift.js`
Declaration-level diff between every `*_source.jsx` ↔ `*_module.js` pair. Catches the case where source and module have drifted in what they define (the WordSoundsReviewPanel duplicate-content bug class). Reports whitespace-only drift (safe), reversed drift (at-risk), and lists declarations that exist in module but not source (would vanish if source clobbers module on next compile).

### `check_pipeline_integrity.js`
Verifies every `_docPipeline.X` call in the UI maps to an actual export in `doc_pipeline_source.jsx` + `doc_pipeline_module.js`. Catches the "Multi-session + Tier 2/2.5/3 silently dropped" bug class from earlier sessions where a commit accidentally removed pipeline exports.

### `check_source_pair_drift.js`
Verifies root `*_source.jsx` matches its `desktop/web-app/src/` duplicate (where applicable). After the April 2026 reconciliation, root is canonical and the duplicates must stay byte-identical. Pre-commit hook material against the dual-edit bug class.

### `check_tool_registry.cjs` (NEW — May 10)
Verifies every `StemLab.registerTool(id, config)` and `SelHub.registerTool(id, config)` call provides the required schema fields (`label, icon, desc, color, category, render`). Catches tools that use legacy field names (`title` instead of `label`, `description` instead of `desc`) — those tiles render with fallback values (id-as-name, generic tooltip, no theme color).

Surfaced 26 violations on first run. Most are tools using `title`/`description` instead of canonical `label`/`desc`. Aaron can fix those incrementally; the check stays in the orchestrator as a quality gate.

### `check_translation_keys.cjs` (NEW — May 10)
Verifies every `t('foo.bar')` call has a matching key in `ui_strings.js`, and every `HELP_STRINGS[literal]` ref has a matching key in `help_strings.js`. Catches the bug class where:
- A new `t()` call is added but the key wasn't added to `ui_strings.js` → UI shows the literal key string instead of translated text
- A key gets renamed in `ui_strings.js` but consumers still reference the old name

Surfaced **289 missing keys** on first run — all are real visible-in-UI bugs in non-English (and English-fallback) renders. Examples: `tour.quiz_mode_text`, `behavior_lens.abc.modal_title`, `bl.observations`, `toasts.bridge_translation_failed`. Triage before tightening this into a hard gate.

### `enumerate_block_scope_aware.js`
Slice-level free-variable analyzer using Babel AST. Takes `(file, startLine, endLine)`, wraps the slice as a function body, walks the AST tracking function/block scopes and hoisting, reports identifiers not resolvable in any enclosing scope. Hardened against shadowing bugs (excludes `history`/`location` from the GLOBALS exclusion set after the May 2026 QuizPanel `history.some` bug).

### `jsx_phantom_ref_check.cjs`
Verifies every identifier a JSX block uses still has a definition. Supports `--moving`/`--deleting` flags to simulate post-extraction state and predict orphan-ref errors before making the deletes. Use before any JSX-block extraction.

### `phase2_diff_audit.js`
For each JSX `*_source.jsx` ↔ `*_module.js` pair listed in its `MODULES` array, compiles source via Babel, auto-detects the IIFE wrapper, and reports byte-level diff. Shows which modules can be safely auto-compiled today vs which need manual drift back-port first. At the original audit snapshot, 1/13 modules were byte-perfect; re-run the tool for the current drift count before using it to plan extraction work.

### `scope_aware_dep_check.js`
Same scope-walk logic as `enumerate_block_scope_aware.js` but for a whole file rather than a slice. Less common; primarily for understanding what an entire CDN module pulls from outer scope.

### `verify_all.cjs` (NEW — May 10, the orchestrator)
Runs every fast static check in sequence with a unified summary. Used by `npm run verify` (fast set) and `npm run verify:all` (everything including V2 runtime + a11y static).

### `verify_extraction.cjs`
Phantom-ref checker for CDN module extractions. Auto-detects exported identifiers from `window.AlloModules.X = {...}` and `window.X = X;` patterns, then walks the host file looking for bare references to each. Also catches **orphan `loadModule()` calls** that appear before the `loadModule` function is defined.

### `verify_module_registry.cjs` (V1 — static)
Auto-runs as a pre-deploy gate inside `build.js --mode=prod`. ~1.6 sec. Cross-references every `window.AlloModules.X` consumer in `AlloFlowANTI.txt` against every producer assignment across the CDN modules. Flags missing producers and suspect-null assignments. Uses `acorn` (production dep) for proper tokenization.

**Limitation**: doesn't catch multi-registration last-write-wins (Immersive Reader bug shape). Use V2 for that.

### `verify_module_registry_runtime.cjs` (V2 — runtime)
On-demand: `npm run verify:registry:runtime`. ~4 sec including browser launch. Requires `npx playwright install chromium` once.

What V2 catches that V1 doesn't:
- Multi-registration last-write-wins to null
- Module loads but throws at IIFE before reaching the registration line
- `loadModule()` URL malformed / 404s

Caught the Immersive Reader bug on first smoke test.

### `verify_view_props.cjs`
Pre-deploy gate for the JSX-view extraction pattern (DBQ / Glossary / Timeline / etc.). Locates `React.createElement(window.AlloModules.<ViewName>, { ... })` in the host, parses the props block, and flags shorthand props (`{X}`) where X isn't declared in any enclosing host scope.

### Render-crash gate (`check_render_refs` / `check_keyless_map` / `check_stem_render` / `check_sel_render` / `check_module_render` / `check_aria_handler`)
The six blocking checks that `deploy.sh` Step 0.6 and `npm run verify:gate` run before any deploy — they statically render-smoke the monolith + STEM/SEL plugins to catch undefined-ref / keyless-map / setState-in-render crash classes before they ship. The highest-value gate in this folder.

### i18n checks (`check_lang_json.cjs` + `dev-tools/i18n/`)
`check_lang_json.cjs` (`verify:lang-json`) validates all 63 mirrored `lang/*.js` pack files parse as JSON. The `dev-tools/i18n/` subtree holds the translation toolchain — see [`dev-tools/i18n/README.md`](i18n/README.md) (gap reports, key merging, `check_safety_string_spanglish.cjs` = `verify:spanglish`, `ingest_translation_feedback.cjs`).

> **This catalog is a curated subset.** The repo has ~50 `dev-tools/*` scripts and 40+ `verify:*` npm scripts. `npm run verify:gate` / `npm run verify:all` chain the blocking ones; run `npm run` or grep `package.json` for the complete, authoritative list.

---

## Architecture notes

### What's outside this folder

- **[`tests/`](../tests/)** — Vitest unit tests for clinical/math/text helpers. Run via `npm test`. NOT included in `npm run verify` because they target *behavior* (do these functions return correct values?) while the dev-tools target *contracts* (do all these references resolve?).
- **[`a11y-audit/`](../a11y-audit/)** — Standalone npm package with `puppeteer` + `@axe-core/puppeteer` for WCAG static + runtime audits. Has its own `package.json` and dependencies. Invokable from repo root via `npm run audit:a11y` and `npm run audit:a11y:runtime`. Optionally included in `verify:all` via `--a11y` flag.
- **`build.js`** — The deploy build script. Runs `verify:registry` (V1) automatically at `--mode=prod` as a pre-deploy gate.

### Why two registry checks (V1 + V2)?

V1 is fast (1.6s) and runs every prod deploy. It catches ~80% of the host-shim bug class with no external dependencies (acorn is already a production dep).

V2 is slower (4s, needs chromium) and runs on demand. It catches the remaining ~20% — specifically last-write-wins and IIFE-throws-before-registration. Worth running before any major release or after touching CDN module loading order.

### What still ISN'T here (genuinely missing — not "I forgot to look")

*(Several items formerly listed here have since been built: build-pipeline smoke = `check_build_smoke.cjs` / `verify:build`; deploy-mirror sync = `check_deploy_mirror.cjs` / `verify:mirror`; sample-lesson smoke = `check_sample_lessons.cjs` / `verify:lessons`; firebase-function checks = `check_firebase_functions.cjs` / `verify:functions`.)*

- **Cross-browser** — V2 + a11y-audit are chromium-only. Firefox/WebKit untested.
- **Visual regression** — no screenshot diffs across deploys.
- **LTI end-to-end** — `verify:lti` checks the static surface, but there's no full live LMS handshake test.

### Bug classes caught — May 2026 audit reference

| Bug | Caught by | Notes |
|---|---|---|
| Report Writer never loaded | V1 ✓ | No producer for `window.AlloModules.ReportWriter` |
| Teacher Dashboard 10 components unregistered | V1 ✓ | 10 consumers, 0 producers each |
| GeminiBridgeView deleted-but-consumed | V1 ✓ | No producer found anywhere |
| Immersive Reader Speed/Bionic null-overwrite | V1 ✗ / V2 ✓ | Multi-registration; V2 caught it on first smoke test |
| 289 missing t() keys | check_translation_keys ✓ | Surfaced first run; need triage |
| 26 tool registry violations | check_tool_registry ✓ | Mostly legacy `title`/`description` field names |
| WordSoundsReviewPanel duplicate-content | audit_pair_drift partial ✓ | Reports declaration drift; full content-equivalence still TODO |
| _docPipeline missing exports | check_pipeline_integrity ✓ | Already exists; not new |
