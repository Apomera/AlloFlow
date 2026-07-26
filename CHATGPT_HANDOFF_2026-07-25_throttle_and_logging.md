# Handoff — Doc-pipeline throttle-recovery fix + logging/remediation-log leads
**Date:** 2026-07-25 · **Author:** Claude (for ChatGPT) · **Status of fix:** LOCAL, undeployed

This document explains (1) a change already made to the PDF remediation pipeline and (2) grounded
leads for a separate regression you're chasing — **the in-app remediation log not populating**. Read
§1 first (repo orientation) so you edit the right file and validate the right way.

---

## 1. Repo orientation — READ BEFORE EDITING

- **Canonical source of truth:** `doc_pipeline_source.jsx` (plain JS despite the `.jsx` name — the
  header says "Pure function extraction — no hooks, no React state, no render JSX"). The whole
  pipeline lives inside one closure, `var createDocPipeline = function(deps) { … }`.
- **Generated artifacts (do NOT hand-edit):** `doc_pipeline_module.js` and
  `desktop/web-app/public/doc_pipeline_module.js`. They are `doc_pipeline_source.jsx` wrapped in an
  IIFE + `window.AlloModules` guard.
- **The audit *view* (React UI, JSX):** `view_pdf_audit_source.jsx`. This is where the remediation
  progress panel/log is rendered and where the pipeline's progress events are consumed.
- **Host app:** `AlloFlowANTI.txt` is the canonical app source; `desktop/web-app/src/App.jsx` is
  generated from it. Several watchdogs live here.

### How to build & validate (the ONLY safe commands)
```bash
node build.js --compile          # wraps source → module.js (+ public copy) and node -c's them.
                                 # Does NOT run the deploy path. USE THIS, not full `node build.js`.
node check-pipeline-integrity.js # verifies source↔module export parity (should say 143/143 OK)
node dev-tools/check_free_vars.cjs   # catches leaked globals / undeclared vars
npx vitest run tests/<file>.test.js  # targeted tests
```
> ⚠️ **Do NOT run bare `node build.js`** (no `--mode=prod`): it runs deploy-prep and can downgrade the
> student loaders. `--compile` is the isolated, safe step.
> ⚠️ Node's `node -c` refuses the `.jsx` extension (ESM detection). `build.js --compile` syntax-checks
> the wrapped `.js` output instead — that's the authoritative check.

---

## 2. The change already made — throttle-recovery fix (VERIFIED, undeployed)

### The regression it fixes
Under a **sustained Canvas "empty-body" throttle**, a run would grind for ~84 minutes and then ship a
**degraded/partial** result (field case: App-E, 8-page scanned PDF → score 74, only 1/3–2/3 audit
coverage, auto-fix stopped at pass 1) instead of completing. Aaron's report: "in the past it would
complete before stopping; now if it gets throttled too much it just stops prematurely."

### Root cause
The `waitForGeminiCalm` ("wait-not-stop") helper is supposed to *pause, not abandon* during a storm.
Its recovery detector was a **4-byte probe**: `callGemini('Reply with exactly: OK')`. The Canvas proxy
throttles by **payload/volume** — it returns empty 200 bodies for real ~21KB calls but answers a tiny
call instantly. So the probe **always succeeded even mid-throttle**, and because it went through the
normal `callGemini` path it hit `_geminiNoteSuccess()`, which **zeroed the live storm streak**
(`_geminiTransientStreak = 0`). That flipped the derived `storming` flag to false → "storm has passed,
proceeding" → a full document-sized round fired **straight back into the live throttle** → failed →
streak re-climbed from 0 → repeat every ~25s. Net effect: the pipeline **kept its own rate-limit
window alive** — exactly the "fire full rounds into the storm" failure wait-not-stop was written to
prevent. The per-stage retry/coverage budgets then expired at partial coverage → degraded ship.

The log fingerprint (present in the field logs):
```
callGemini #12 queued (0KB prompt)        ← the old probe
callGemini #12 done (1697ms, 0KB response)
wait-not-stop: probe call succeeded … the storm has passed, proceeding
callGemini #13 queued (21KB prompt)        ← real call, immediately fails
…storm (4 in a row)                         ← streak re-climbing from scratch, over and over
```

### The gate model you need to know (in `doc_pipeline_source.jsx`, ~L4340–4830)
- Constants (~L4338): `_GEMINI_MAX_CONCURRENT=3`, `_GEMINI_STORM_MIN=1`, `_GEMINI_STORM_TRIP=2`
  (auth failures), `_GEMINI_TRANSIENT_TRIP=3` (empty-body/timeout failures), `_GEMINI_COOLDOWN_MS`,
  `_GEMINI_RECOVER_HITS=4`, and **new** `_GEMINI_PROBE_RECOVER=2`.
- State: `_geminiCap`, `_geminiInFlight`, `_geminiTransientStreak`, `_geminiAuthStreak`,
  `_geminiOkStreak`, `_geminiCooldownUntil`.
- `_geminiNoteSuccess()` / `_geminiNoteAuthFail()` / `_geminiNoteTransientFail()` move those counters.
- `_geminiThrottleInfo()` returns a read-only snapshot incl. `.storming` (`cooldownRemainingMs>0 ||
  authStreak>=TRIP || transientStreak>=TRIP`).
- `_geminiGate(fn, signal, label)` acquires a slot (respects cap + cooldown) and runs `fn`.
- `_geminiCall(...)` wraps a transport call with breaker-aware retry; `callGemini`/`callGeminiVision`
  are the public wrappers (they emit the `[DocPipe][API→/API←/API✗]` log lines).
- `waitForGeminiCalm({maxWaitMs, onTick, shouldAbort, probe})` is what callers invoke to pause during a
  storm. On timeout it returns `{calm:false}` and callers **proceed anyway** (never a hard stop).

### The four edits (all inside `createDocPipeline`, gate region only)
1. **New `_geminiProbe` helper** (~L4587): a **document-SIZED (~13KB), content-free (FERPA-safe)**
   probe — filler text framed as "ignore this", never document content — so it exercises the same
   volume dimension the proxy throttles on. It runs through `_geminiGate` **directly** and **never**
   calls `_geminiNoteSuccess`/`_geminiNoteTransientFail`, so a probe result cannot move the real
   breaker streak.
2. **`_GEMINI_PROBE_RECOVER = 2`** + rewritten recovery block in `waitForGeminiCalm` (~L4676): require
   **2 consecutive representative probe successes** before declaring calm; a failed probe resets the
   counter and re-arms the escalating cooldown (no hammering).
3. **Resume WITHOUT resetting the breaker** — on calm, return under the still-conservative cap and let
   **real** calls drive recovery via the normal `_geminiNoteSuccess` (restores concurrency only after
   `_GEMINI_RECOVER_HITS` real successes).
4. **Suppress the inline transient retry during a storm** (~L4821): in `_geminiCall`'s transient-error
   branch, `if (_geminiThrottleInfo().storming) throw err;` — the single retry otherwise burns a
   *second* full transport timeout into a throttled window (the 3–6 min single-call failures). The
   breaker is already tripped; the caller's wait-not-stop owns pacing. Isolated blips (streak below the
   trip) still get their one retry as before.

### Verification done
- `node build.js --compile` → **DocPipeline: compiled**, module + public copy `node -c` clean.
- `check-pipeline-integrity.js` ✓ (143/143 exports). `check_free_vars.cjs` ✓ (no leaked globals).
- New pins: `tests/gemini_probe_representative_recovery.test.js` — **5/5 pass**.

---

## 3. Logging & remediation-progress plumbing (map) + the "log not populating" leads

> **These are LEADS, not a confirmed diagnosis.** I mapped the plumbing but did not reproduce/fix the
> log regression. My throttle fix (§2) does not touch any of this.

### The two event channels (producer side, `doc_pipeline_source.jsx`)
- **`_pipeLog(tag, msg, data)`** (~L4175) — the central logger. It does *four* things:
  1. console/`warnLog` (dev-tools output — this is what shows up in the field logs Aaron pastes);
  2. pushes to `window._alloflowPipelineWarnings` (rolling buffer, capped 500);
  3. dispatches **`alloflow:pipeline-warn`** (watchdog heartbeat channel);
  4. **only if `_activeRemediationProgress.runId === entry.runId`**, forwards to
     `_emitRemediationProgress(...)` with an `activity: {tag, message, timestamp}` patch.
- **`_emitRemediationProgress(runId, patch)`** (~L4140) — dispatches **`alloflow:remediation-progress`**
  (the in-app panel/log channel). **Early-returns (drops the update)** if
  `_activeRemediationProgress && runId && _activeRemediationProgress.runId !== runId` (~L4142).
- Run start (~L19848–19874): builds `_runId`, sets `_pipelineStats.runId = _runId`, and builds
  `_activeRemediationProgress = { …, runId:_runId, documentEpoch:_runDocumentEpoch }` where
  `_runDocumentEpoch = batchOverrides?.documentEpoch ?? _run.documentEpoch` (~L19794).

### The consumer (the panel that isn't populating, `view_pdf_audit_source.jsx`)
- `const [remediationProgress, setRemediationProgress] = useState(null)` (~L2918).
- Listener (~L2993): `onProgress = (e) => { if (_eventIsForCurrentDocument(e) && e.detail.version===1)
  setRemediationProgress(e.detail); }` on `alloflow:remediation-progress`.
- **The gate** (~L2992):
  `_eventIsForCurrentDocument = (e) => Number.isInteger(e.detail.documentEpoch) &&
  e.detail.documentEpoch === pdfDocumentEpoch`.
- Rendered at ~L8797: `{remediationProgress?.activity?.message && (… {remediationProgress.activity.message} …)}`.

### Why the log can go blank — three silent gates, any one blanks it
1. **Consumer document-epoch mismatch** (most likely): if the pipeline's `_runDocumentEpoch`
   (→ `e.detail.documentEpoch`) ever diverges from the view's `pdfDocumentEpoch`, **every** progress
   event is dropped and the panel stays empty. Check: is `_runDocumentEpoch` null/NaN (both
   `batchOverrides.documentEpoch` and `_run.documentEpoch` missing)? `Number.isInteger(null)` is false →
   gate always false. Or was `pdfDocumentEpoch` bumped/reset in the view after the run started?
2. **Producer runId mismatch #1** (~L4196): `_pipeLog` forwards to the progress feed *only* when
   `_activeRemediationProgress.runId === _pipelineStats.runId`. If those two diverge (e.g. a stale
   `_activeRemediationProgress` from a prior run, or a run that set `_pipelineStats.runId` without
   rebuilding `_activeRemediationProgress`), `activity` updates never reach the panel.
3. **Producer runId mismatch #2** (~L4142): `_emitRemediationProgress` early-returns on runId mismatch.

### Key disambiguation for triage
`_pipeLog` always writes to console + the `pipeline-warn` buffer/event **regardless** of the runId/epoch
gates. So **the field/console logs keep flowing even when the in-app remediation log is blank.** If
Aaron sees healthy console logs but an empty on-screen activity panel, that points squarely at gate #1
(document-epoch) or #2/#3 (runId) — *not* at `_pipeLog` itself. Suggested first probe: in the view,
temporarily log `e.detail.documentEpoch` vs `pdfDocumentEpoch` inside `onProgress` and confirm whether
`_eventIsForCurrentDocument` is returning false for a live run.

---

## 4. How the §2 change interacts with the logs (so it doesn't confuse triage)
- The new `_geminiProbe` goes through `_geminiGate` **directly, not `callGemini`**, so it **no longer
  emits** the `callGemini #N queued (0KB prompt)` / `done (…0KB response)` lines the old probe produced.
  Recovery is now visible only via the `[GeminiGate] wait-not-stop: … representative probe N/2 cleared`
  warnLog lines. **The disappearance of the "0KB prompt" probe lines is expected — not the log bug.**
- Under an active storm there are now **fewer `[Retry]` lines** (the inline transient retry is skipped),
  so calls fail a bit faster. The watchdog heartbeat is unaffected: `waitForGeminiCalm` still calls
  `_pulsePipelineWatchdog()` each wait step and still emits `status:'throttled'` progress, so the
  8-min dead-man switch stays fed.
- None of the §2 edits touch `_pipeLog`, `_emitRemediationProgress`, `documentEpoch`, or `runId`.

---

## 5. Pre-existing test drift — do NOT chase these as regressions
Running the gate-adjacent suite shows ~17 reds that are **pre-existing** (a mid-work tree: `App.jsx`
not rebuilt from `AlloFlowANTI.txt`, and several snapshot-pinning tests drifted from source). Verified:
my §2 diff is confined to lines ~4343–4821 and touches **none** of these tests' symbols, and two of the
pinned strings (`let _lastFullCoverageAiScore = (verif…`, `_auditChunkMemo.delete(_shortKey)`) are
**absent in `git HEAD` too** — i.e. red before any change here. Affected files (all source-substring
pins, unrelated to the throttle/log work):
`tests/deep_dive_batch4_fixes.test.js`, `tests/doc_pipeline_deep_regression_fixes.test.js`,
`tests/chatgpt_phase1_reliability.test.js`, `tests/chatgpt_phase3_reliability.test.js`,
`tests/handsoff_autoretry.test.js`. Symbols they pin: `_lastFullCoverageAiScore`, `_runGenStale`,
`_auditChunkMemo`, `_PIPELINE_PROMPT_VERSION`, batch-intake budgets, Equal-Access engine pinning,
App.jsx `onclick`. **If you touch these areas, treat the drift separately from the throttle/log work.**

---

## 6. Suggested next steps
1. **Log regression:** instrument the `_eventIsForCurrentDocument` gate in `view_pdf_audit_source.jsx`
   (log `e.detail.documentEpoch` vs `pdfDocumentEpoch`) on a live run — confirm/deny gate #1 first,
   then the two runId gates (§3). This is the highest-probability single point of failure.
2. **Throttle fix:** it's local/undeployed. Deploy alongside whatever else is batched. It changes
   behavior only under a real storm; the happy path is unaffected.
3. **Test drift:** a separate pass to rebuild `App.jsx` from ANTI and re-baseline the drifted snapshot
   pins would clear the ~17 reds and restore signal to the gate suite.

### File index touched/created by §2
- `doc_pipeline_source.jsx` (4 edits, gate region) — source of truth
- `doc_pipeline_module.js` + `desktop/web-app/public/doc_pipeline_module.js` — regenerated via `--compile`
- `tests/gemini_probe_representative_recovery.test.js` — new, 5 pins
