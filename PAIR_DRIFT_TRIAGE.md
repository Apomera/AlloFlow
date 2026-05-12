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
| `generate_dispatcher` | REVERSED | +1483 | 0 | **20** | **Real reverse drift** | Port 20 extra fn from module → source |
| `quickstart` | REVERSED | +246 | 0 | **2** | **Real reverse drift** | Port 2 extra fn from module → source |
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

## Real reverse drift — backlog (2 items)

### 1. `generate_dispatcher` — 20 extra functions in compiled

Highest-priority cleanup. `module.js` has 20 functions that don't exist
in `generate_dispatcher_source.jsx`. Likely hand-additions made directly
to the compiled file (often happens when someone debugs in DevTools and
ports the fix to the deployed file but forgets the source).

**To port:**
1. Run `node dev-tools/audit_pair_drift.js | grep -A 30 "generate_dispatcher"` (or extend the tool to dump the actual diff)
2. Identify the 20 functions present only in module
3. Add each to `generate_dispatcher_source.jsx` in the matching location
4. Recompile via `_build_generate_dispatcher_module.js`
5. Confirm `audit_pair_drift` reports clean (or only build-noise) for this row

### 2. `quickstart` — 2 extra functions in compiled

Same shape as above but smaller. Two functions exist only in
`quickstart_module.js`. Easy follow-up.

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

## Audit-tool follow-up (optional)

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
