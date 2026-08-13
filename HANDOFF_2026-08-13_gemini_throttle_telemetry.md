# Handoff — Gemini throttle telemetry: instrumented, not yet tuned

**Date:** 2026-08-13 · **Status:** shipped and live, but the thing it was built to answer is
still unanswered · **Blocking need:** one real heavy run's log, from Aaron

Continues `CHATGPT_HANDOFF_2026-07-25_throttle_and_logging.md` (the probe fix, §2 of that
doc). Read its §1 for repo orientation and the safe build commands — they still apply and are
not repeated here.

---

## 1. The one-paragraph version

The doc pipeline has an adaptive throttle gate that has been tuned **by feel**. In August it
was instrumented so the tuning could be driven by data instead. The instrumentation is
written, tested and shipped. **No data has been collected yet**, because Canvas throttling
does not reproduce synthetically — it needs a real heavy or scanned PDF run on Canvas. Until
someone does that run and copies the log out, every constant in §4 remains a guess that
happens to work.

If you are picking this up: your job is almost certainly **§5 (collect) then §6 (interpret)**,
not writing more code.

---

## 2. Which throttle this is — the distinction that matters

There are two unrelated things called "throttling" around this app, and conflating them wastes
a lot of time.

**Server-side Gemini rate limiting.** This is what all the machinery below fights. Symptoms:
HTTP 401/403 on a key that works seconds later, empty-body HTTP 200s, and timeouts. In Canvas
the app never holds an API key — Canvas injects it — so **a 401 there is almost always a brief
throttle, not a credential problem** (see `feedback_canvas_transient_401`, and
`tests/canvas_transient_auth_retry.test.js`). It is driven by call volume and concurrency and
is entirely indifferent to whether anyone is looking at the tab.

**Browser background-tab throttling.** Chrome suspends `requestAnimationFrame` and slows
`setTimeout`/`setInterval` when a tab is hidden — which minimising definitely causes. It has
**nothing to do with the storms above**, and no part of this subsystem is affected by it,
because the pipeline is driven by in-flight `fetch` promises rather than by timers. `fetch` is
not throttled when hidden; a request already issued completes and its `.then` runs.

Only the second one is relevant to the "relay desktop AI calls through an open Canvas tab"
idea, and there the distinction reverses: a relay built on a **polling loop** would be
crippled by minimising (Chrome drops hidden timers to roughly once a second, then once a
minute after ~5 minutes hidden, and may freeze the tab entirely), whereas one built on an
**open connection or a long-lived fetch** would largely survive it. That idea has an unresolved
terms-of-service question in front of it that is a bigger obstacle than any of this; it is not
pursued here.

---

## 3. What already exists — do not rebuild it

All in `doc_pipeline_source.jsx` (canonical; `doc_pipeline_module.js` + the desktop public copy
are generated).

**The adaptive gate**
- `_geminiCap` — dynamic concurrency ceiling.
- Two **separate** breakers, because the same server-side throttle shows up two different ways:
  - `_geminiAuthStreak` → `_GEMINI_STORM_TRIP` (401/403 storms)
  - transient streak → `_GEMINI_TRANSIENT_TRIP` (empty-body 200s and timeouts)
- Escalating cooldown `_GEMINI_COOLDOWN_MS`, `_geminiStaggerMs` spacing.
- `waitForGeminiCalm` — wait-not-stop, with representative recovery probes
  (`_geminiProbe`, `_GEMINI_PROBE_RECOVER`). A probe is **document-sized and content-free** so
  it exercises the throttled volume dimension, and it is **breaker-neutral**: it runs through
  the gate directly and never calls `_geminiNoteSuccess`/`_geminiNoteTransientFail`, so a probe
  result cannot move the real streak. That neutrality is the whole fix from the July handoff —
  a 4-byte probe always succeeded mid-storm and fired a full round straight back into the live
  throttle.
- `callGemini` itself retries Canvas 401s 3× at [1200, 3000] ms, **only** on Canvas and **only**
  for auth. Quota/config/refusal/non-Canvas-401 still throw immediately — retrying a genuinely
  dead key is how you build a hammering loop.

**The telemetry (2026-08-11, `872a265ca` — pushed and live)**
- `_pipeThrottleEvent(kind, fields, owner)` — one line per **decision**: `auth_trip`,
  `transient_trip` (with `cooldownMs`, `capTo`), `post_cooldown_ok` / `post_cooldown_fail`
  (scored by `_pipeThrottleScoreProbe`), `recovered`. Each carries cap / inFlight / queued /
  authStreak / transientStreak / okStreak.
- `_pipeThrottleSummary` → a `ThrottleSummary` rollup at the stats snapshot: trips by kind,
  **in-flight at each trip vs the ceiling**, cooldown lengths used, recovery-per-cooldown, total
  ms spent backing off, and the constants in force (the log is self-describing).
- Output goes to the **existing pipeline log** (`_pipeLog` → `window._alloflowPipelineWarnings`,
  capped 500, plus an `alloflow:pipeline-warn` event) — deliberately not a new diagnostics UI,
  so it already carries run + step context and a teacher can already copy it.

**Two constraints that shaped it, and must survive any edit**
- ★ **Decisions, not per-call rows.** The log caps at 500 and is the only thing a teacher can
  copy. Per-call logging on a heavy run evicts the errors and step context exactly when they
  matter. The private trace buffer is capped at 400 for the same reason.
- ★ **Every field is a number or an enum.** No prompt, response or document text, so the log is
  safe to paste back. `tests/pipeline_throttle_telemetry.test.js` asserts no
  prompt/text/content/response/body field can appear.

---

## 4. The constants currently in force (all still unvalidated)

From `doc_pipeline_source.jsx` (~line 6261):

| Constant | Value | Meaning |
|---|---|---|
| `_GEMINI_STORM_TRIP` | 2 | consecutive canvas-auth failures that trip the breaker |
| `_GEMINI_TRANSIENT_TRIP` | 3 | consecutive empty-body/timeout failures that trip it |
| `_GEMINI_COOLDOWN_MS` | 12000 | pause before new calls start once storming (escalates, capped ~25s; was 90s) |
| `_GEMINI_PROBE_RECOVER` | 2 | consecutive representative probe successes before resuming |

These are the numbers the collected log is meant to justify or change.

---

## 5. What is actually needed — the collection procedure

Canvas throttling **does not reproduce synthetically**. Do not try to write a test that
"simulates a storm" and tune against it; that only re-tunes against your own model.

1. Open AlloFlow **in Gemini Canvas** (not desktop, not localhost — the throttle is a property
   of the Canvas-injected key path).
2. Run the PDF remediation pipeline on a **heavy or scanned** document. Scanned PDFs trip it
   soonest; the 8-page scanned "App-E" case is the known reproducer from the July regression.
3. Let it run to completion, storms and all. Do not cancel — the recovery data is the point.
4. Copy the pipeline log out (the existing copy affordance in the remediation panel).
5. Hand back the whole thing. It is numbers and enums only, so it is safe to paste.

---

## 6. How to read what comes back — the decision rule

The rollup exists to answer **one** question, which is currently unanswerable:

- **If trips cluster at HIGH in-flight** (near the ceiling) → the throttle is
  **concurrency-driven**. The cap is the lever; cooldown is mostly wasted wall-clock and should
  come down.
- **If trips cluster at LOW in-flight** → it is **rate-driven**. Spacing (`_geminiStaggerMs`)
  and cooldown are the levers; lowering the cap will not help and will just make runs longer.

Secondary reads worth taking from the same log:
- **recovery-per-cooldown** — if the first post-cooldown probe nearly always succeeds, the
  cooldown is too long. If it usually fails, `_GEMINI_PROBE_RECOVER` or the cooldown is too short.
- **total ms spent backing off** vs run length — the honest cost of the current settings.
- **auth vs transient trip ratio** — if one breaker never fires, its trip threshold is either
  wrong or its manifestation has changed.

---

## 7. Test state as of 2026-08-13

Green: `pipeline_throttle_telemetry`, `gemini_probe_representative_recovery` (9),
`canvas_transient_auth_retry` (5), `gemini_breaker_feeds_on_canvas_throttle`.

**Fixed on this pass.** `gemini_probe_representative_recovery` had one red test asserting the
literal source string `}, _sig, 'gemini-probe')`. The remediation pass (`fe1eac33d`) added a
fourth `owner` argument to that gate call, so the string stopped matching — while the probe
remained gate-routed and breaker-neutral. The assertion now matches `/\}, _sig, 'gemini-probe'[,)]/`
and no longer pins an argument list. Worth internalising: a source-text assertion that pins a
signature reports regressions that are not there, and the next reader has to disprove it before
they can trust anything else in the file.

**Known red, NOT caused by this work.** `tests/throttle_resilience.test.js` has 2 failures
("threads the immutable signal through final/deferred/post-mutation AI audits", "captures
explicit signals at the gate and rechecks nested chunk calls after awaits"). These are part of
the long-standing App.jsx-vs-ANTI drift in the gate suite noted in the July handoff. Do not
blanket `-u` them.

---

## 8. Files

| Path | Role |
|---|---|
| `doc_pipeline_source.jsx` | canonical — gate, breakers, probes, telemetry |
| `doc_pipeline_module.js` + `desktop/web-app/public/doc_pipeline_module.js` | generated, do not hand-edit |
| `tests/pipeline_throttle_telemetry.test.js` | field shape + the no-content privacy assertion |
| `tests/gemini_probe_representative_recovery.test.js` | probe is representative + breaker-neutral |
| `tests/canvas_transient_auth_retry.test.js` | the 3× Canvas-auth retry and its three no-retry cases |

Build with `node build.js --compile` (**not** full `node build.js`), then
`node check-pipeline-integrity.js` and `node dev-tools/check_free_vars.cjs`.

★ A trap that bit twice while this was built: `var X = function(){}` definitions do **not**
match an `X\(` count assertion, so a guard script asserting N+1 aborts before writing. It
failed safe both times, but the error message is misleading.
