# Pair Drift Triage — May 12 2026

Output of `node dev-tools/audit_pair_drift.js`, classified by whether each
flagged module represents real risk or audit-tool noise. Use this as a
backlog: each "Real reverse drift" entry is one focused follow-up commit.

## Triage classifications

- **Real reverse drift** — module.js has declarations the source.jsx lacks
  (`mod-only > 0`). The compiled file has been hand-edited; next rebuild
  will clobber those changes. **Action: port the changes back into
  `*_source.jsx`.**
- **Build-transform noise** — `src-only == 0 && mod-only == 0`, declaration
  sets match. The line delta is from esbuild's `React.createElement`
  output being more verbose than the JSX source it compiles from. **No
  action; audit threshold could be tuned later.**
- **Hand-maintained pair** — module.js is hand-edited (no `_build_*.js`
  script exists); `_source.jsx` is a reference snapshot, not the build
  source. The two drift naturally over time and don't pose rebuild risk.
  **Action: either remove the stale source.jsx or write a build script
  if we want the source.jsx to be canonical.**

## Module-by-module classification

| Module | Status | Δ lines | src-only | mod-only | Classification | Action |
|---|---|---|---|---|---|---|
| `generate_dispatcher` | REVERSED → MINOR | +1483 → +7 | 0 | 0 | **Resolved May 12 2026** — full body port (1477 lines): 793-line audit-pipeline prefix + ~684 lines of handleGenerate body edits | None |
| `quickstart` | REVERSED | +246 → +233 | 0 | 0 | **Resolved May 12 2026** — 2 fn ported (fetchAndCleanUrl, isGoogleRedirect); residual delta is IIFE-wrapper noise (matches build-transform pattern) | None |
| `export` | REVERSED | +436 | 0 | 0 | Build-transform noise | None |
| `gemini_api` | REVERSED | +58 | 0 | 0 | Build-transform noise | None |
| `personas` | REVERSED | +203 | 0 | 0 | Build-transform noise | None |
| `persona_ui` | REVERSED | +58 | 0 | 0 | Build-transform noise | None |
| `tts` | REVERSED | +79 | 0 | 0 | Build-transform noise | None |
| `view_fab_stack` | REVERSED | +53 | 0 | 0 | Build-transform noise | None |
| `view_gemini_bridge` | REVERSED | +150 | 0 | 0 | Build-transform noise | None |
| `view_submission_inbox` | REVERSED | +205 | 0 | 0 | Build-transform noise | None |
| `view_pdf_audit` | MISSING | -1045 | **1** | **1** | **Mixed: 1 fn renamed or signatures differ** | Investigate the 1 src-only + 1 mod-only declaration |
| `adventure` | MISSING | -75 | 0 | 0 | Hand-maintained pair (no `_build_adventure_module.js`) | Decide canonical source |
| `allobot` | MISSING | -385 | 0 | 0 | Build-transform noise after recompile | None |
| `immersive_reader` | (recompiled, audit should clear next run) | — | 0 | 0 | Build-transform noise | None |
| `games` | (recompiled, audit should clear next run) | — | 0 | 0 | Build-transform noise | None |

## Real reverse drift — backlog (0 items remaining)

### 1. `generate_dispatcher` — ✅ Resolved May 12 2026

The audit reported "20 functions in module but not source" — accurate
but understated. The full drift was actually **1,477 lines**: a
793-line audit-pipeline prefix block (`COMMON_LONGER_WORDS`,
`computeReadinessScore`, `computeCognitiveLoad`, `computeContent*`,
`harvestExistingAuditSignals`, etc. — 14 top-level functions + 6
nested helpers + supporting constants) PLUS ~684 lines of edits
sprinkled inside the 2000+ line `handleGenerate` body (Plan S quiz
mode logic, etc.).

**Why the audit understated it:** `audit_pair_drift.js` counts
*top-level declarations*. The handleGenerate body edits are nested
inside an existing top-level function, so they don't change the
declaration count.

**Root cause (matches `feedback_edit_source_not_compiled.md`):**
edits were made directly to `generate_dispatcher_module.js` instead
of `generate_dispatcher_source.jsx`. Most recent example was commit
`ec14da8c` on May 9 ("Fix: add missing computeContentAccessibility +
UDL JSON retry") — 126 lines added to module, 0 to source. The build
script (`_build_generate_dispatcher_module.js`) does work; running it
would have wiped all 1,477 lines of drift.

**Fix:** wholesale body-copy. Source.jsx was overwritten with the
exact contents of module.js between the IIFE header (L1-3) and tail
(L3843-3846). The rebuild produces a module.js that is content-identical
to the pre-port file (verified by md5 with line endings normalized).
No code was lost; source.jsx is now the canonical truth, and future
edits go to source.jsx → rebuild → module.js.

**Auditor learning:** to catch this class of drift in the future,
extend `audit_pair_drift.js` to compare body byte counts of named
functions, not just top-level declaration sets. Documented as a
follow-up in this doc's "Audit-tool follow-up" section.

### 2. `quickstart` — ✅ Resolved May 12 2026

Ported `fetchAndCleanUrl` and `isGoogleRedirect` shims into
`quickstart_source.jsx` (as top-of-file `var` declarations with a sync
note). Also corrected the misleading "Auto-generated" header comment in
`quickstart_module.js` — there's no actual `_build_quickstart_module.js`,
so the comment was misdirecting future agents. Declaration counts now
match (18 ↔ 18, src-only=0, mod-only=0). Residual +233 line delta is
IIFE wrapper boilerplate (matches the build-transform noise pattern).

## `view_pdf_audit` — 1 + 1 declaration mismatch

`src-only=1, mod-only=1` typically means a single function got renamed
in one file but not the other, or the parameter signature changed.
Quick investigation needed to confirm it's not a real drift.

## Hand-maintained pair — `adventure`

`adventure_module.js` doesn't have a matching `_build_adventure_module.js`
build script. `adventure_source.jsx` exists but is a reference copy, not
the build source. The 75-line delta is real but doesn't pose rebuild
risk because there's no rebuild path.

**Decision for a future session:**
- **Option A:** Write `_build_adventure_module.js` and make
  `adventure_source.jsx` canonical (matches the pattern of
  `_build_view_*_module.js` files).
- **Option B:** Delete `adventure_source.jsx` and accept that
  `adventure_module.js` is hand-maintained (matches the pattern of
  `allo_data_module.js`, `firestore_sync_module.js`, etc.).

Adjacent files (`adventure_handlers`, `adventure_session_handlers`) have
build scripts already, so Option A is the more consistent path.

## Nested-body drift in JSX-compiled modules — May 12 2026 investigation

The auditor's new nested-body detection (added when resolving
generate_dispatcher's 1,477-line drift) surfaces flagged functions in
story_forge, games, immersive_reader, teacher, and view_sidebar_panels.
Investigation showed these are NOT the same shape as generate_dispatcher
and **cannot be resolved by wholesale body-copy**:

- Generate_dispatcher's build script just wraps source.jsx in an IIFE.
  Source-to-module is a 1-to-1 byte copy (plus header/tail). So
  `cp module.js source.jsx` after stripping the wrapper produced an
  identical rebuild.
- JSX-compiled build scripts (games, immersive_reader, teacher,
  story_forge, view_sidebar_panels, etc.) run source.jsx through
  **esbuild** first, transforming JSX → React.createElement calls.
  The module.js has fundamentally different byte content than the
  source.jsx, even when "in sync". Wholesale copy would put
  React.createElement calls into source.jsx where JSX belongs — and
  the next rebuild would re-transform that into uglier React.createElement
  wrappers around the existing calls.
- Mixed-direction drift (source > module AND module > source in the
  same module) is also more common here, requiring per-function
  decisions on which side is canonical.

**Decision: per-function manual review is the right approach.** For
each flagged function:
1. Read source.jsx version (JSX) and module.js version (compiled).
2. Decide which version represents the intended behavior.
3. If module is canonical: port the relevant JSX equivalent to source,
   then rebuild.
4. If source is canonical: just rebuild — module catches up.

Specific findings (May 12 2026, post-MAX-fix audit):
- `story_forge`: 4 fn drift, mixed direction. aiScoreNum + beatColor
  source-bigger (rebuild). stopRecording + startRecording module-bigger
  (port).
- `games`: 3 fn drift, all module-bigger (`scrambleWord` is a
  preamble false positive after MAX — verify; `useHint` + `GameReviewScreen`
  may be real).
- `immersive_reader`: 3 fn module-bigger.
- `teacher`: 2 fn drift, mixed direction (`metricBar` source-bigger;
  `alloRestoreFocus` + `alloSaveFocus` module-bigger).
- `view_sidebar_panels`: 3 fn drift, mixed direction + 3 module-only
  decls (`_lazyIcon`, `handleMixChange`, `handleResetMix`).

These are deferred to follow-up sessions, one module at a time, with
careful manual review per drifting function.

## Audit-tool follow-up (optional)

The audit's body-byte calculation is heuristic (regex-based, not AST).
Known limitations now documented in `audit_pair_drift.js` source:
1. Icon-shim lines (`var X = _icons.X || function(){...}`) don't
   match the function regex, so they get rolled into the previous
   function's span, inflating its "body".
2. MAX(occurrences) handles the build-script preamble duplicate-decl
   case (a function declared twice in module: once in IIFE preamble
   as a small utility, once as the compiled full body).

A future ship could replace the regex pass with @babel/parser AST
walks for accurate per-function byte counts. Until then, the auditor
biases toward false-positive drift, not false-negative — operators
just verify each flagged item.

The auditor flags any non-zero line delta even when `src-only == 0 &&
mod-only == 0`. For esbuild-compiled view modules, this generates
~10 noise rows per audit run. Two ways to quiet it:

1. Lower the "MISSING/REVERSED" threshold to require `src-only > 0 || mod-only > 0` (declaration drift) AND a line delta. Pure line deltas downgrade to a new "BUILD_NOISE" status.
2. Skip auditing modules whose `_build_*.js` is in a known whitelist of esbuild-driven builds.

Option 1 is cleaner. Each esbuild-compiled view would naturally show as
"BUILD_NOISE" and the audit's headline number would stop alarming on
non-issues.

## Verification

After the two "Real reverse drift" items are addressed in follow-up
sessions:

```bash
node dev-tools/audit_pair_drift.js | grep -E "REVERSED|MISSING"
# Should be empty, or only contain rows where src-only == 0 && mod-only == 0
```

After the auditor follow-up (Option 1 above):

```bash
node dev-tools/audit_pair_drift.js | grep -cE "BUILD_NOISE"
# Expected: ~10 rows downgraded out of the warning category
```
