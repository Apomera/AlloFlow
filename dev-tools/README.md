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

### `geometry_world_gl_probe.mjs` (NEW - Sep 6, chromium on SwiftShader)
Geometry World on real WebGL from the command line. `stem_tool_shot.cjs` never gets past this tool's loading screen, so this lifts the harness out of `tests/e2e/18-geometry-world-gl.spec.ts`, serves the working tree (React and three from the tree, no network), mounts the tool, and screenshots it or runs a probe file inside the page and prints its JSON. `--mode lesson|sandbox`, `--blocks '[[x,y,z,type,shape,rot],...]'`, `--camera x,y,z,tx,ty,tz`, `--preset night`, `--pre printable_model_module.js` (extra scripts before the tool), `--eval probe.js`, `--out shot.png`. It waits for the sandbox lesson to load before placing (blocks placed earlier are wiped) and for a preset fade to land (`engine._envDone`; the software renderer clamps the frame step, so the clock is not enough). Do not run it while a Playwright suite is running.

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

### `check_stem_layout_defects.cjs` (NEW — Sep 4, chromium)
Renders a STEM tool and measures **geometry**, which is where a family of bugs lives that every
other gate is blind to: they parse, they pass `check_stem_render`, they pass axe with zero
violations, and they pass the tool's own unit tests.

```bash
node dev-tools/check_stem_layout_defects.cjs stem_lab/stem_tool_pets.js          # one tool
node dev-tools/check_stem_layout_defects.cjs stem_lab/stem_tool_pets.js --deep   # + walk its tabs/views
node dev-tools/check_stem_layout_defects.cjs --all --deep --dark --json          # lab-wide (long)
node dev-tools/check_stem_layout_defects.cjs --all --deep --contrast --json      # the third theme
```

Six detectors, each reporting a measured number: `collapsed-percent-height` (a `height: N%`
bar inside an auto-height parent renders as a hairline — this shipped as a chart that drew
nothing), `light-ink-on-host-card` / `dark-ink-on-contrast-surface` (the own-ground family),
`overlay-collision`, `svg-text-outside-viewbox`, `clipped-text` (its HTML analogue — a label
cut by an `overflow:hidden` box with no ellipsis and no scrollbar), and a static
`nonuniform-rx` lint, plus `overflows-tool-column` (content past the right edge of the tool
column — the narrow-viewport defect).

**★★★ For `overflows-tool-column`, clipped is not the same as contained.** Three-way rule,
and getting it wrong in either direction is expensive:
a **scrollable** ancestor makes the spill reachable (the correct pattern, silent);
a **clipping** ancestor plus a **decorative** element is a deliberate bleed (silent — e.g.
sourcebook's `aria-hidden` ring at `-right-12` inside a `relative overflow-hidden` header);
a **clipping** ancestor plus real **content** is *reported*, because the part past the edge
cannot be scrolled to at all. Treating every `overflow: hidden` as harmless blinds the
detector across a whole tool, since tool cards are routinely rounded `overflow-hidden`
containers. **Scrollability anywhere up the chain wins** — do not stop the ancestor walk at
the first clip, because a clipping box nested inside a scrolling one is still reachable
(magnetism's station tabs each clip their own ellipsised label inside a strip that scrolls).

**★★★ A lab-wide sweep probes only the first 12 views of each tool.** `DEEP_CAP` is
`ALL ? 12 : 30`, so `--all` runs at less than half the depth of a single-file run — and until
Sep 5 nothing said so, which meant a tool's later views scored as clean rather than as
unvisited. magnetism has **18** views and its two real `svg-text-outside-viewbox` findings sit
past the twelfth: reported reliably when run alone, absent from all three sweep axes. The
bisect: `--all --only=magnetism` gives 0 while the same file alone gives 2, on a fresh browser
either way, so it is the cap and not browser longevity, load, or theme.

The gate now prints, per file, `30 of 34 matched controls (re-run with --deep-cap=34)`. **Coverage is
reported beside the findings, never among them** — a caveat about what was *measured* is not a
defect that was *found*, and a first cut that pushed it into `findings` broke every calibration
baseline at once (known-bad 7 → 8, pets 0 → 1). Two flags make this cheap to work with:

```
--only=<substr>     # run the --all code path over a subset (bisecting, re-checks)
--deep-cap=N        # override the view cap in either mode
```

Treat any board without a coverage line as "the first 12 views were clean", not "the tool was
clean". Depth is the expensive axis: raising the cap roughly triples sweep wall-clock.

### Reading the caveats — the `!` lines under a board

A board can now say three different things about its own limits, and none of them is a defect:

```
! N file(s) only partly probed — those views are UNMEASURED, not clean:   <- the DEEP_CAP
! N file(s) were measured while an animation was still running (1200ms cap) <- settle() gave up
! N file(s) had view(s) fail to probe:                                     <- a deep click threw
```

Each exists because the same bug kept recurring in different clothes: **the gate spelled
"nothing went wrong" exactly like "nothing was measured".** A capped walk, a swallowed
exception and an expired settle all scored an unexamined view identically to a clean one.
Treat every `!` line as "re-run deeper / look closer", never as noise.

### Calibrating the gate — `dev-tools/fixtures/`

```
node dev-tools/check_gate_fixtures.cjs     # all 13 calibrations, exits 1 on drift
```

Run that after ANY change to the gate. A drifted calibration means the **gate** changed
behaviour, not that a tool did — the distinction matters, because three of this file's own bugs
came from changes that looked like pure plumbing (a dedupe that deleted findings, a coverage
note that broke every baseline, a `--gate` exit that failed on caveats).

**A green board proves nothing unless the gate can still fail.** Every one of these has caught
a real regression in the gate itself, usually within a minute of introducing it. Run them
after ANY change to the gate, including changes that look like pure plumbing — deduping,
logging and coverage reporting each broke a detector or a baseline on first attempt.

| check | command | must report |
|---|---|---|
| known-bad blob | `git show f25a88533:stem_lab/stem_tool_pets.js > /tmp/kb.js`, then run it `--deep` | **7** |
| current pets | `stem_lab/stem_tool_pets.js --deep` | **0** (and 0 at `--deep-cap=34`) |
| clipped text | `dev-tools/fixtures/clipped_text_fixture.js` | **1** |
| clipped by an ancestor | `dev-tools/fixtures/ancestor_clip_fixture.js` | **1** naming the ancestor (the scrollable, line-clamped, fitting and collapsed cards stay silent) |
| overflow column | `dev-tools/fixtures/overflow_column_fixture.js --narrow` | **4** (incl. a control pushed wholly off; the transform-parked skip link stays silent) |
| overflow column, left | `dev-tools/fixtures/overflow_left_fixture.js` | **1** on the **left** (the decorative bleed, the scroller and the skip link stay silent) |
| deep coverage | `dev-tools/fixtures/deep_cap_fixture.js --deep --deep-cap=12` | 0 findings **+** `12 of 15 matched controls` |
| svg text ink | `dev-tools/fixtures/svg_text_fixture.js` | **1** (the genuine cut, not the rotated label's leading) |
| settle caveat | `dev-tools/fixtures/settle_fixture.js` | 0 findings **+** the `(1200ms cap)` caveat; silent at `--settle-cap=5000` |
| contrast ink | `dev-tools/fixtures/contrast_ink_fixture.js --contrast` | **1** (the `!important` pin) |
| % height from the class list | `dev-tools/fixtures/pct_height_class_fixture.js` | **3** (`h-full` in an auto block parent, `h-full` in an auto **flex** parent, inline `50%`); the `h-40` parent stays silent |
| opacity in the ink | `dev-tools/fixtures/opacity_ink_fixture.js` | **1** naming `at opacity 0.28` (the 0.7, disabled and full-strength labels stay silent) |
| band (blind) | `dev-tools/fixtures/band_fixture.js --narrow` *and* `--viewport=1280x900` | **0** — a single-width sweep cannot see it |
| band (found) | `dev-tools/fixtures/band_fixture.js --widths=768,1024,1280` | **2** **+** `clean at 768px, 1280px` |
| contrast ink, host CSS off | same file `--contrast --no-host-css` | **4** (the pin + the three the host rescues) |

`--gate` mode must fail on **defects only**, never on caveats — check both directions:
`deep_cap_fixture.js --deep --deep-cap=12 --gate` exits **0** (coverage note, no defect) while
the known-bad blob `--deep --gate` exits **1**. Adding coverage entries to `report` once made
`--gate` fail a lab with zero defects, because the exit test read `report.length`.

The two overflow/clipping fixtures each carry the false positives that motivated them — a
scrollable wide row, a decorative bleed clipped by `overflow:hidden`, an emoji watermark — so
they fail in *both* directions: they catch a detector going blind AND a detector getting
greedy. `deep_cap_fixture.js` must also print nothing at `--deep-cap=15`; if the low-cap run
stops printing its coverage line, sweeps have gone silently partial again.

**★★★ "Outside the slot" describes both a parked skip-link and the worst overflow there is.**
`invisible()` ends with an off-canvas clause for the skip-link pattern (`transform:
translateY(-180%)`), and `r.left > sr.right` is equally true of a control shoved *entirely*
past the edge by a too-wide row. Until Sep 6 that silenced the severe cases and kept only the
straddlers: coding's header spills seven buttons, and the gate reported the single one whose
left edge was still inside (2px over) while dropping four at 65-262px. **The worse the defect,
the more certainly it was invisible.** The rule now distinguishes *parked* (moved by a
transform — deliberate) from *pushed* (laid out there — a defect); fixture cases 6 and 7 pin
both directions. Any `overflows-tool-column` count from before that fix under-reports.

**★★★ Measure the settled layout, not the entry animation.** A CSS animation outranks an
inline style, so an element positioned by `transform` loses that transform for as long as any
keyframe animation also sets `transform`. archstudio's onboarding panel is centred with an
inline `translate(-50%,-50%)` and `arch-panel-in` wiped it, throwing the panel half a stage
out of its column. The 450ms post-mount wait did not help: the panel only appears once WebGL
goes live, so its 0.2s animation began *after* the wait. Both the gate and `stem_tool_shot`
now await `document.getAnimations()` (skipping infinite ones, capped at 1200ms) before
measuring. It cuts both ways — archstudio narrow went 1 → 0, magnetism contrast went 2 → 5.

**★★★ Redirect stderr somewhere ELSE, and watch for a positive liveness signal.**
A full sweep takes tens of minutes and writes its JSON only at exit, so `0 bytes` looks
exactly the same whether it is working hard or died at `chromium.launch()` — one run sat
32 minutes that way. Run it as:

```
node dev-tools/check_stem_layout_defects.cjs --all --deep --json \
  > dev-tools/.cache/sweep_light.json 2> dev-tools/.cache/sweep_light.log
```

Never `2>&1` into the JSON file: that both corrupts the JSON and throws away the progress
lines. The gate prints `[n/total] <file>` per file on stderr; if that log stops growing, or
no chromium process is alive while node still runs, the sweep is hung, not busy.

**★★★ The detector measured only the RIGHT edge until Sep 6.** `overflows-tool-column` read
`r.right - sr.right` and nothing else, so half of its own family was invisible to it for as long
as it existed. The left half is the *worse* half: a right spill at least raises a horizontal
scrollbar, while an LTR page has nothing to the left of its own origin to scroll to — that content
is unreachable, not merely awkward. It also matters for the language packs, since an RTL locale
flips the overflow direction and a right-only detector reads clean on exactly the layouts most
likely to break. Both edges are now measured and the finding names the side.

**★ Run it narrow.** `--narrow` (768x1024) or `--viewport=WxH` is a fourth axis alongside the
three themes: every sweep before Sep 5 ran at 1280x1000, which is a teacher's laptop, not the
Chromebook a student is on.

**★★★ Opacity is part of the ink.** Until Sep 6 the contrast detectors read `color` at full
strength and never looked at `opacity`, so a slate-700 label under `opacity-30` scored ~10:1 while
the painted pixel is ~2:1 — a false negative in the one direction a contrast gate must not have.
The group alpha (the product of every ancestor's `opacity` up to the slot, times the colour's own
alpha) is now folded into the ink before it is judged, and the finding names both the source colour
and what it paints as. Disabled controls stay exempt, as WCAG 1.4.3 says. The same pass replaced the
detector's `[A-Za-z0-9]` emoji-exemption with `\p{L}\p{N}`: the ASCII form also exempted every Greek
symbol a science lab paints with `color` (Δ, μ, Ω) and would go blind to Japanese or Arabic prose.

**★★★ `clipped-text` only knew about self-inflicted clips.** It judged an element whose *own*
`overflow:hidden` cuts its *own* text — so the commonest Tailwind shape, a fixed-height
`overflow-hidden` card cutting off the paragraph inside it, was never measured, and
`overflows-tool-column` only sees spills past the *slot* edge, never an inner card edge. The detector
now walks up to the nearest clipping ancestor and measures the text's box against that ancestor's
padding box. A scrollable box on the way wins (the rest is reachable), a line-clamp announces the cut,
and a ~zero-height clipper is a collapsed panel rather than clipped prose. Baselines held (known-bad
7, pets 0) and the four heaviest `overflow-hidden` users (solarsystem 99, companionplanting 97,
birdlab, weathersystems) all read 0. **One defect, one kind:** a text box that also crosses the
*slot* edge is `overflows-tool-column`'s (it already says "CUT OFF by an ancestor" there), so the
ancestor branch owns clips at an *inner* card edge only — without that partition the overflow
fixture's clipped table reported twice (4 → 6), which the suite caught on the first run.

**★★★ The specified height lives in the class list too.** `collapsed-percent-height` read only the
inline `style.height`, so `h-full` — **364 uses** across the lab — plus `h-1/2` and `h-[28%]` were
invisible to it for as long as it existed. Computed style is no help (it returns the *used* px value,
never the specified percentage), so the detector now reads the Tailwind utility from the class list.
A parent whose height is definite (inline, or any Tailwind `h-*`) is silent. **There is deliberately
no flex-parent guard:** a first cut skipped flex parents on the theory that they stretch the child
anyway. That is true only under `align-items: stretch` *and* only when the item's cross size is
`auto` — an explicit `height: 100%` wins over stretch, then resolves to `auto` against the indefinite
container, so `h-full` inside a flex row is exactly as collapsed as inside a block (measured: 0.0px in
a 40px parent). The guard also silenced three of the known-bad blob's seven findings (7 → 4) and bought
nothing, since a genuinely stretched child is taller than 3px and already silent. The four heaviest
`h-full` users (companionplanting 41, aquarium, evolab, beehive) all read 0, so the class is armed
rather than harvested.

**★ A fixture at a detector's threshold is a coin, not a calibration.** The settle fixture read 1 in
one suite run under a concurrent full sweep and 0 in three unchanged re-runs. The fixture was the
cause: a full-width box with 12px padding drifting `translateX(24px)` ends 12px past the column edge,
the sample lands ~1.65s into the 3s drift (~1px over, inside the 2px slack), and a later frame under
load crosses it. It now has `width: 240`, so no frame nears the edge. Re-run a drifted calibration
*unchanged* before touching anything — three clean re-runs prove a race, and a race in a fixture is
fixed in the fixture.

**The calibration runner retries once.** Under three concurrent browsers one check came back
`ERROR (Command failed: C:\Program Files\nodejs\node.exe C:\Users\ca` — truncated to uselessness — and
passed alone. `check_gate_fixtures` now prints the gate's last stderr line, retries once, and marks a
pass-on-retry as such, so an environment hiccup is neither spelled like a drift nor hidden.

### Left alone deliberately — findings whose fix is a design call

These reproduce, they are real, and they are **not** mine to decide. Each has a written remedy so
the owner does not have to re-derive it.

| tool | finding | why it is deferred |
|---|---|---|
| machinelab | energy-ledger table cut off 13px@1280 / 269px@768 | remedy is known (wrap `h('table', …)` in a div with `overflowX: 'auto'`) but the lane is active |
| skatelab | contact / pulse-end phase markers overlap | the labels need a ≥628px strip and it measures 348–589; fixing it means re-scoping a `@container` rule |
| weathersystems | Immersive 3D feature callout covers the panel's "All analytical layers are visible" status line (220px × its full line height, under a 90%-opaque ground) | structural: the panel's height is *width*-dependent (its button row wraps at 1024) while the callout sits at an **authored** `top: '31%'`. Clamping the callout out of the top ~220px would break `cloudLayer`, authored at 17%; dimming the status line while a callout is open is the other option. Either way it re-scopes someone's authored anchor. |
| migration | "Moderate Breeze" span 48px past the right edge at 640, neither clipped nor scrollable | **hot lane** (modified minutes before the board, uncommitted) — not touched; re-measure when cold |
| bridgelab | SVG labels "H (out)" / "H" cut 24 / 4.7 user units on the left at 640 | **hot lane** (uncommitted edits in flight) — not touched. Source: `h('text', { x: fx - Hpx - 10, textAnchor: 'end', … }, 'H (out)')` — an end-anchored label placed left of a force arrow's tail; when the arrow is long enough that `fx - Hpx - 10` minus the label's width goes below the viewBox's left edge, the label leaves the canvas. Remedy: clamp `x` to at least the label's width, or flip `textAnchor` to `'start'` (placing it right of the tail) when it would. |
| fisherlab | schematic caption clipped 1.47 user units left | real ink (the italic overhangs its own advance — `sideBearingTotal` is *negative*), but it is one glyph edge of a caption whose advance misses its canvas by 0.3%. Every fix is a typographic choice. |

**★★★ A stylesheet fix that matches and does nothing: look for an inline `none`.** throwlab's
canvas spilled 38px at 640. Restoring the grid's `minmax(0,1fr)` guard fixed the track and left the
canvas at 640px; a `max-width:100%` rule was in the DOM, matched the element, and had no effect,
because the computed `max-width` was `none` *inline* — the React style prop declares
`width:'100%', maxWidth:'none', height:'auto'` (the author wanted a responsive canvas) and the HiDPI
helper then pins `style.width = '640px'; style.height = '360px'`. An inline style reads `""` when
unset and `"none"` when someone set it; that string is the tell. The helper now writes
`width:100%; max-width:<logical>px; height:auto; aspect-ratio` instead, which is byte-for-byte the
old behaviour on any screen at least as wide as the bitmap.

**★ Parked by distance.** The first 640px board reported three skip links "9999px past the left
edge" — the classic `left: -9999px` park, which `invisible()`'s transform clause never sees. A real
spill lands a few hundred px out; nothing overflows by more than the column is wide while sitting
*entirely* outside it. So: entirely outside the slot **and** farther away than the slot is wide means
parked, whatever the mechanism. Both halves matter — a 1500px table in a 640px column spills 860px but
starts inside, and the overflow fixture's "Pushed clean off" control is entirely outside but ~40px
away; both are still reported. `overflow_left_fixture.js` carries the `-9999px` link and stays at 1.

**Routine widths are the Tailwind breakpoints, not round numbers.** Both 1024-only finds sat at
*exactly* `lg`; a layout is densest immediately above a breakpoint, where the new column count lands
but the room for it barely does. Sweep 640 (`sm`), 768 (`md`), 1024 (`lg`), 1280 (`xl`) and 1536
(`2xl`), and use `--widths=` when a finding needs its band mapped.

**★★★ A responsive defect lives in a BAND, not at a width.** The coding lab's header shoved six
controls clean off the tool column, and *both* widths this gate habitually sweeps said clean:
below 960px a media query wrapped the row, above ~1630px the row fit on one line. Only the middle
broke. skatelab is the same shape from the other direction — its markers overlap at 768 and 1024
but **not** at 800, 900 or 1280, because a sidebar reflow makes the timeline strip *narrower* at
1024 than at 768. Width is not monotonic, so two samples prove nothing about the range between
them.

`--widths=768,1024,1280` measures every mounted view at each width inside **one** page build. The
page build is the expensive part and is paid once, so a three-width band costs far less than three
sweeps. Findings carry the widths they appear at, and the report names the widths where the same
view was clean:

```
overflows-tool-column
  extends 180px past the right edge of the tool column (1024px wide) ...
  widths: 1024px   (clean at 768px, 1280px — a BAND, so widths between these are unmeasured)
```

`dev-tools/fixtures/band_fixture.js` is the calibration, and it is deliberately a *disagreement*:
the same fixture reports 0 at `--narrow`, 0 at `--viewport=1280x900`, and 2 at
`--widths=768,1024,1280`. That proves the flag finds something a routine sweep cannot, rather than
merely proving the flag runs.

★CAVEAT: `--widths` **resizes** a page mounted at `VIEWPORT.width`. A component that reads its
width only at mount will not re-render, so a finding seen only at a resized width should be
confirmed with a dedicated `--viewport=<W>x<H>` run before it is treated as real — and the reverse
(a defect a resize hides) is why `--widths` does not replace the per-width boards.

**★★★ A closed `<details>` still has layout boxes.** Chromium gives the collapsed subtree
`content-visibility: hidden`, so painting is skipped but geometry is not — `getBoundingClientRect()`
returns real rects for content nobody can see. universe reported **72** dark-theme findings that
way and reports **0** now that closed disclosures are skipped. If a finding looks impossible,
check whether it lives inside a shut `<details>`.

**★ Run it in `--dark` too.** stem_lab renders every tool on a WHITE card in *both* themes, so
dark is where the own-ground family lives: the first light sweep found 154 findings, the first
dark sweep found 517.

**★★★ And in `--contrast`, where the failure INVERTS.** `contrast` deliberately keeps its
pure-black surface (a light card "would fight it"), so an unpainted tool inherits BLACK and it
is *dark* ink that disappears — kind `dark-ink-on-contrast-surface`. The first contrast sweep
found **1853 findings across 57 tools**, including the Digital Accessibility Lab's own title at
1.44:1 in the accessibility theme. Two traps that made whole tools fail at once: a
`html:not(.theme-contrast)` guard never fires (the theme class is on `<main>`, never `<html>`),
and a tool's own white card is *not* white here — `app_styles_module.js` rewrites inline light
backgrounds to `#000 !important`, so `background:#fff` + a dark ink goes black-on-black.

**★ Finish with `--all --deep`, not a per-tool victory lap.** `DEEP_CAP` is 30 for a single
file and 12 under `--all`, and the walk dedupes by control label, so **neither pass is a superset
of the other**: the final sweep found live findings in views that per-tool runs had called clean.

**★ A stochastic tool needs repeat runs.** probability's birthday-match palette only lands when
random birthdays actually collide — the gate fired on about one run in three.

**★ Screenshot-verify a finding before fixing it.** Eleven distinct false-positive classes are
documented in the file header and fixed in the detectors (emoji are a colour font; SVG text is
painted by `fill` and sits on sibling rects; `getBBox()` is pre-transform; `sr-only` text is
meant to be stacked; a mid-render style read can mix values across elements; …). The header
also lists the three permanent KNOWN-INTENTIONAL findings so the board reads clean.

### `stem_tool_shot.cjs` (NEW — Sep 4, chromium)
Mounts ONE STEM tool in one theme and screenshots it. `check_stem_layout_defects` reports a
ratio; this reports a picture, and every finding in that gate is a claim about what a student
sees. It reuses the gate's own harness (same Tailwind cache, same extracted `--allo-stem-*`
palette, same two-layer host mirror) so a shot and a finding describe the SAME pixels.

```bash
node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_arccity.js --contrast
node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_molecule.js --contrast --click="🧱Build"
```

Flags: `--dark` | `--contrast` (default light), `--click=<button label prefix>`, `--state=<json>`,
`--out=<png>`, `--full`.

### i18n checks (`check_lang_json.cjs` + `dev-tools/i18n/`)
`check_lang_json.cjs` (`verify:lang-json`) validates all 63 mirrored `lang/*.js` pack files parse as JSON. The `dev-tools/i18n/` subtree holds the translation toolchain — see [`dev-tools/i18n/README.md`](i18n/README.md) (gap reports, key merging, `check_safety_string_spanglish.cjs` = `verify:spanglish`, `ingest_translation_feedback.cjs`).

> **This catalog is a curated subset.** The repo has ~50 `dev-tools/*` scripts and 40+ `verify:*` npm scripts. `npm run verify:gate` / `npm run verify:all` chain the blocking ones; run `npm run` or grep `package.json` for the complete, authoritative list.

---

### `check_untranslated_english.cjs` (NEW - Sep 5, node)

Finds learner-facing English that never reaches the translation layer. It marks every
`__alloT(...)` / `t(...)` span first, then reports sentence-like string literals that
fall outside one, grouped by the mode they sit in.

```bash
node dev-tools/check_untranslated_english.cjs stem_lab/stem_tool_galaxy.js
```

**Its threshold is itself a blind spot.** The first version demanded two words of
three-plus letters inside ONE literal, with a ten-character floor, and skipped anything
starting with `.`. That hid every tail half of a concatenation - `' kpc field'`,
`' billion years'`, `'Big Bang'`, and a narration fragment beginning `'. The flash marks
a massive star exploding...'` - so the galaxy tool read as finished while those were
still English. It now keeps short strings that start or end with a space, since those
are usually joined onto a value. **Re-measure with a different rule before calling a
sweep done.**

Fragments like those must become a single template with placeholders, not one wrapper
each: `'Switched to ' + label + ' galaxy. '` handed to a translator as separate pieces
cannot be reordered, and word order differs in most languages.

**It is an inventory, not a fixer.** A blanket rewrite of what it finds is UNSAFE: a
first attempt at one proposed translating `"webgl"`, `"polite"`, `"barredSpiral"` and
the star names in the spectral-class cards (`Sirius`, `Proxima Centauri`), which are
identifiers and proper nouns. Every hit needs reading before it is wrapped. Two traps
worth knowing: a naive replace will also match the comma inside an existing
`__alloT(key, 'fallback')` and wrap the FALLBACK in a second call - rendering is
unchanged, so an output-comparison check passes anyway - and strings compared against
each other must be translated on BOTH sides or the comparison silently stops matching.

### Galaxy Explorer harnesses (`galaxy_*.cjs`)

Eighteen scripts, all headless chromium against the real
`stem_lab/stem_tool_galaxy.js`. The tool is a 3-D scene plus six modes plus thirteen
hand-drawn canvas branches, and almost none of that is reachable from Vitest: the smoke
harness resolves `ensureThree()` with a promise that never settles, and the scene builder
swallows its own exceptions behind one "3-D unavailable" card. These exist because each
one caught something the unit tests could not see.

```bash
node dev-tools/galaxy_core_clipping.cjs      OUT --shapes=barredSpiral --observe=visible,radio
node dev-tools/galaxy_a11y_audit.cjs         OUT [--shots]
node dev-tools/galaxy_canvas_text_contrast.cjs OUT      # over-canvas labels vs REAL pixels
node dev-tools/galaxy_no_webgl_check.cjs     OUT        # the 2-D fallback, all morphologies
node dev-tools/galaxy_reduced_motion_check.cjs OUT/galaxy-canvas-text.html
node dev-tools/galaxy_fullscreen_check.cjs   OUT        # native + 3 blocked-embed surfaces
node dev-tools/galaxy_saved_state_sweep.cjs  OUT        # 26 stale/impossible saved states
node dev-tools/galaxy_stage_sheet.cjs        OUT        # all 13 Star Life branches
node dev-tools/galaxy_responsive_sweep.cjs   OUT [--shots]   # overflow at 390-1024px
node dev-tools/galaxy_keyboard_contract.cjs  OUT        # the keys the alt text promises
node dev-tools/galaxy_mode_churn.cjs         OUT [cycles]    # WebGL context leaks
node dev-tools/galaxy_interaction_sweep.cjs OUT        # click EVERY control, watch for throws
node dev-tools/galaxy_panel_shot.cjs         OUT '<state-json>' '<selector>' NAME WIDTH [--open]
node dev-tools/galaxy_tour_sheet.cjs         OUT        # every Grand Tour stage, all 4 types, frozen clock
node dev-tools/galaxy_pseudo_locale_sweep.cjs OUT [--shots]  # does the layout survive TRANSLATION?
node dev-tools/galaxy_rtl_sweep.cjs          OUT        # dir="rtl": Arabic, Farsi, Hebrew, Urdu
```

### School Rewards portal, manual, and practice page

The portal ships inside the school's own Apps Script project and the practice page is
generated, so none of it is reachable from the app's usual harnesses. These four drive
the generated `school-rewards-practice.html` (fictional data, ephemeral loopback server)
or the published documents. Outputs land in `scratch/` and are gitignored.

```bash
node dev-tools/school_rewards_portal_a11y.cjs      # axe-core, 4 roles x (Help panel, tour)
node dev-tools/school_rewards_wrapper_a11y.cjs     # wrapper contrast in light/dark/forced + keyboard walk
node dev-tools/school_rewards_print_check.cjs      # real PDFs: page counts + break rule per block
node dev-tools/school_rewards_mobile_sweep.cjs     # 390px: overflow, bottom tab bar, touch-target sizes
```

To photograph a Print Lab hand-off state use the shot harness's `--pre` hook, added
2026-09-05: `node dev-tools/stem_tool_shot.cjs stem_lab/stem_tool_printlab.js --pre=@scratch/pre/printlab-art.js`
sets `window.__alloPrintLabPendingHandoff` after the tool script loads and before mount.
Two things that cost an hour: `--state` is the TOOL'S OWN slice (`{"blocks":[...]}`),
not the whole store; and Art Studio's sculpt tab shows only a loading line until
Prim3D exists, so pass `--pre=@prim3d_module.js` to see its toolbar.

```bash
node dev-tools/school_rewards_manual_capture.cjs   # regenerate the manual figures
node dev-tools/school_rewards_demo_walkthrough.cjs # the 4-role demo route + 390px mobile pass
node dev-tools/rebuild_school_rewards_practice.cjs # rebuild both practice pages (OneDrive-safe)
```

Two notes worth keeping. The print check's `straddling` list measures the UNPAGINATED
flow, so it over-reports any block that computes `break-inside: avoid` (Chromium moves
those whole); trust its `breakInside` field and the PDF page count. And axe returns
`incomplete` for contrast under the fixed tour box, which is the scanner failing to
resolve an overlapped background, not a finding: `school_rewards_wrapper_a11y.cjs`
measures those same elements against their real backgrounds.


**Read this before trusting a result.** Every one of these has produced a confident
wrong answer at least once, and the traps are recorded in each file's header:

- `galaxy_a11y_audit --shots` uses `fullPage: true`, and **that capture misrenders
  layout** — it showed a correct `grid-cols-7` picker as seven stacked rows. Use
  `galaxy_panel_shot` (clipped, 1:1) for anything about spacing or size.
- The audit's contrast list used to be mostly fiction: it reported **45 failures on a
  page with none**. Three causes, all fixed on 2026-09-06 — it now (a) refuses to score
  text over a **gradient** ancestor, (b) refuses to score when the ancestor walk finds
  nothing opaque instead of defaulting to white, (c) skips `sr-only` text (clipped to
  1px) and **disabled** controls, which WCAG 1.4.3 exempts. The Star Life card is a dark
  `bg-gradient-to-br from-slate-900 …`; light text on it was being graded against the
  harness page's white body and "failing" at 1.85:1 when the shipped pixels measure
  6.79:1.
- English fitting is not evidence that a translation fits: German, Finnish and Russian
  run 30-45% longer. `galaxy_pseudo_locale_sweep` expands and accents every
  `stem.galaxy` string in place (leaving `{placeholders}` alone) and re-runs the
  overflow check. It found exactly one offender in the whole tool, and it was SVG
  text, which cannot wrap: `textLength` + `lengthAdjust` is the fix there.
- The tool ships in four RTL languages and its HTML layout mirrors cleanly, but its
  data charts did not: SVG geometry is authored in absolute viewBox coordinates while
  `<text>` inside inherits the direction, so start-anchored captions ran off the edge.
  **`dir="ltr"` on an `<svg>` does NOTHING** - `dir` maps to the CSS `direction`
  property for HTML only; the attribute was present and `getComputedStyle` still
  reported `rtl`. Set `style={{ direction: 'ltr' }}` as well. Always run an LTR
  control: it is what proves an overflow is RTL-specific rather than pre-existing.
- **A run with network errors is not a result.** One run reported 336 sub-24px targets,
  73 contrast failures and 0 headings — every category at once, because
  `ERR_INTERNET_DISCONNECTED` stopped the Tailwind CDN loading and every class went
  inert. Check the console-errors section before reading any number.
- Playwright's actionability waits **never settle** while the scene's rAF loop runs.
  Screenshots time out; `scrollIntoViewIfNeeded` hangs. Neutralise `requestAnimationFrame`
  after the scene settles — but *after* any scrolling, and re-measure clip boxes then.
- A **closed `<details>` still reports layout boxes** for its children, so a selector
  inside one resolves to a plausible rect that paints nothing. `--open` expands them.
- Readouts must **discriminate**: ~76% of stars are M-type, so the Object Inspector
  cannot tell two different stars apart. Use the selection reticle's world position.
- Pair each Star Life stage with a mass that can reach it (`blue_supergiant` needs
  >25 M☉, otherwise it correctly resolves to main sequence and looks like dead code).
- Aladin's offline mirror errors arrive **late** and get blamed on the next case. A
  text filter is NOT enough: once a realSky case has run, Aladin keeps retrying its
  mirrors for the rest of the page's life, and the wording varies with the failure
  mode. One `galaxy_saved_state_sweep` run failed "metalHunt bad numbers" for an
  error the next run did not produce. The sweep now RELOADS the page after any
  realSky case, which ends the contamination at its source and costs 2 of 26 cases.
  If a harness of yours blames a case you cannot reproduce alone, suspect the case
  BEFORE it.
- To capture a timed sequence, **freeze `Date.now`, don't offset it.** Each SwiftShader
  screenshot burns 2-4 real seconds, and with `real + offset` those land on top of the
  offset: "stage k" came back as stage 2k. `galaxy_tour_sheet` pins the clock to the
  exact moment and uses a *pausable* rAF (a stub that returns 0 kills the loop).

Baseline as of 2026-09-06: clipping/chroma steady across four morphologies, 0 sub-24px
targets, **0 contrast failures**, 0 responsive overflow, 2-D fallback clean, reduced
motion completely still, 23/23 over-canvas labels above AA, 26/26 saved states render,
10/10 keyboard controls work, fullscreen OK on all four surfaces, and mode churn
releases every WebGL context
(made == lost). The interaction sweep drives all 316 controls: the tool's own 255 run
clean; the 1 remaining finding is Aladin Lite's own MOC loader failing on a file:// URL. The tour sheet shows every
type ending exactly at its fitted home radius with type-specific captions.

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
