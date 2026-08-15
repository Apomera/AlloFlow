# ADDENDUM — where the Canvas regressions came from: three dated changes, zero constant drift

**Date:** 2026-08-14 · **Author:** Claude (Opus 5), analysis only · **Status:** still **zero code changed**
**Read first:** `CHATGPT_HANDOFF_2026-08-14_throttle_findings_and_diagnostic_bundle.md`. This adds to it
and **re-ranks its §6 task list**. It does not replace anything.

Aaron's question: the pipeline is better than it was around 2026-06-30, but something introduced since
then is causing regressions, especially in Canvas. Which changes?

Answer: three, all dated below. **None of them is a tuning change.** That is the whole story.

---

## 1. The null result, which is the most important finding here

**Every gate constant is byte-identical between 2026-07-01 and today.**

```
                              2026-07-01        2026-08-14
_GEMINI_MAX_CONCURRENT        3                 3
_GEMINI_STORM_MIN             1                 1
_GEMINI_STORM_TRIP            2                 2
_GEMINI_TRANSIENT_TRIP        3                 3
_GEMINI_COOLDOWN_MS           12000             12000
_GEMINI_RECOVER_HITS          4                 4
_GEMINI_AUTH_RETRIES          1                 1
_geminiStaggerMs (heavy)      700               700
callGemini timeouts           180000 / 120000   180000 / 120000
callGeminiVision timeouts     120000 / 90000    120000 / 90000
```

Nobody detuned the gate. What changed is the **behaviour underneath those numbers**, three separate
times, while the numbers stayed frozen at values chosen for the July 1 behaviour.

★ **This corrects F3 in the main handoff.** The retry-shorter-than-primary inversion
(`retryMs` 120000 < `initialMs` 180000) is **not a regression** — it predates 2026-07-01. It is still
worth fixing, but it became *harmful* only because of R1 below. Do not present it to Aaron as
something that broke recently.

---

## 2. R1 ★★★ — 2026-07-27, `b7c6a655f` — the inner auth ladder swallows the classification

**This is now the top fix, ahead of everything in the main handoff's §6.** It is the only one of the
three that is Canvas-specific by construction, and it is a clean nesting bug rather than a judgment
call.

### What changed

On 2026-07-01, `callGemini` in `gemini_api_module.js` had **no retry ladder at all**:

```
$ git show 66db8c303:gemini_api_module.js | grep -n "CANVAS_AUTH\|for (let attempt"
(no matches)
```

A Canvas 401 propagated straight up to `doc_pipeline._geminiCall`, which flagged it
`canvasTransientAuth` and fed `_geminiNoteAuthFail`. Fast, and filed under the right breaker.

`b7c6a655f` ("Checkpoint concurrent sessions' in-flight work before deploy") added an inner 3-rung
ladder — `CANVAS_AUTH_BACKOFF_MS = [1200, 3000]`, `gemini_api_module.js:723-763` — *underneath* the
pipeline's existing retry. Its own comment reads:

> doc_pipeline's own retry still sits on top; both are bounded, so the worst case stays finite.

Bounded, yes. ★ **But the budgets do not nest.** In the 08-14 field log each rung takes ~60s to come
back 401, so a full ladder needs ~185s against a 180s outer timeout.

### What it causes, all visible in the field log

- `3/3` never appears once in 2h 36m. The third rung cannot report.
- The pipeline sees a **timeout**, not an auth error, so `_noteGeminiOutcome` routes it to
  `_geminiNoteTransientFail` instead of `_geminiNoteAuthFail`. **That is the entire explanation for
  2 `auth_trip` vs 14 `transient_trip` in a log saturated with auth failures.**
- Every such call burns the full 180s and delivers nothing.
- The ladder is deliberately `ONLY Canvas, ONLY auth`, which is precisely why Aaron feels this in
  Canvas and not on desktop.

### Fix

Make the ladder deadline-aware. Before each rung, if elapsed plus the previous rung's observed
duration would exceed a budget sitting under the outer timeout, throw the real auth error instead of
climbing into a kill. The call then fails ~60s sooner **with its classification intact**, `authStreak`
climbs, and the auth breaker (trip 2) does the job it was built for.

★ Keep `deps.canvasAuthBackoffMs` injectable — `tests/canvas_transient_auth_retry.test.js` depends on
it. ★ A test for this must assert the **nesting invariant** (worst-case ladder duration < outer
timeout), not just that a ladder exists. See §5.

---

## 3. R2 ★★ — 2026-07-16, `40cdd3425` — the transient breaker counts about twice as fast

### What changed

Baseline, 2026-07-01, in `_geminiCall`:

```js
// Generic timeout/transient: a single retry, as before. (2026-06-20) On the FINAL give-up,
// count this call toward the empty-body/timeout storm signal ...
if (n >= 1) { _geminiNoteTransientFail(); throw err; }
```

**One count per logical call**, on final give-up only. Attempt 0's timeout retried silently.

Today `_noteGeminiOutcome` runs inside the gate body on **every attempt**
(`doc_pipeline_source.jsx:7284-7287`), and its `_outcomeNoted` once-flag is scoped **per attempt**
(declared inside `_attempt`), so a call that fails twice increments twice. That commit's message
states the intent directly:

> empty 200 bodies count as transient fails, every failed transport counts immediately, jittered
> single retry

### What it causes

Both halves are defensible alone. Together they roughly **doubled the increment rate** and **added a
new increment source** (empty 200s). `_GEMINI_TRANSIENT_TRIP` stayed at **3**. So a threshold tuned
for three logical failures now trips on roughly one and a half. That is why the 08-14 run escalates
to a storm so readily and re-trips eight times.

### Fix

Do **not** just raise `_GEMINI_TRANSIENT_TRIP` — that hides the double-count. Either count once per
logical call (hoist the once-flag out of `_attempt` to `_geminiCall` scope) or raise the threshold
deliberately and document the new counting rate. ★ Sequence this **after** the main handoff's F1
repeat-offender guard, since F1 removes a large slice of the inflated increments and the right
threshold cannot be measured until it lands.

---

## 4. R3 ★★ — 2026-07-24 → 07-26, `08df4edd2` + `fe1eac33d` — recovery got three new gates, the constant stayed at 4

### What changed

Baseline, 2026-07-01 — the whole function:

```js
var _geminiNoteSuccess = function() {
  _geminiAuthStreak = 0;
  _geminiTransientStreak = 0;
  if (_geminiCap < _geminiEffectiveMax) {
    _geminiOkStreak++;
    if (_geminiOkStreak >= _GEMINI_RECOVER_HITS) { _geminiCap = _geminiEffectiveMax; ... }
  }
};
```

**Any** success cleared both streaks. Today `_geminiNoteSuccess(requestProfile)` first requires
`_geminiSuccessRepresentsFailure`: the same route kind (text vs vision) **and** ≥80% of the failed
call's payload volume. Otherwise it returns early, counting only toward a separate
`_geminiOffRouteOkStreak` that itself needs 4.

★ And `_rememberGeminiFailure` (`:6824-6828`) ratchets the bar **upward** within a failure wave: it
takes `Math.max` of the prompt chars seen, and promotes `kind` to `'vision'` if any vision call
failed. So one failed Vision call means **no text success can be representative** until the 50s
`_GEMINI_WAVE_STALE_MS` clock expires.

### What it causes

Recovery is now strictly harder than it was on July 1, and `_GEMINI_RECOVER_HITS` is still the same
**4**. In the 08-14 run there is exactly **one** `recovered` event in 2h 36m, and the best success
streak afterwards was **three** (`#14`, `#15`, `#16`). The cap sat at 1 for the final 2h 20m.

This is the mechanism behind F5 in the main handoff. F5's recommendation (4 → 3) stands, but frame it
as *re-tuning a constant whose predicate got stricter underneath it*, not as an arbitrary loosening.

---

## 5. R0 — context, already fixed, and the reason to distrust the tests here

`fe1eac33d` (07-26) extracted the outcome classifier into one function and dropped a single line:

```js
if (isPermanent && _canvasAuthRetry) isPermanent = false;
```

A Canvas throttle carries **both** `message: 'API_AUTH_FAILED'` and `canvasTransientAuth: true`, so
without the de-escalation it classified as permanent and returned **before feeding the breaker**. The
whole throttle-resilience layer went inert in Canvas: 5,000+ seconds, 60+ calls each burning ~120s,
and **not one `[GeminiGate]` line in the log**. Fixed the next day by `75298ba32`.

★ **Why this matters to you even though it is fixed.** From the fix commit's own post-mortem:

> Why the M15 pins missed it: all three were STRUCTURAL — "there is one classifier", "the slot waits
> for it", "the handlers delegate". Not one asserted what the classifier DECIDES.

R0, R1 and R3 all landed in the same area within nine days, and the existing test suite is
structural enough that it caught none of them. When you fix R1, assert the **decision and the
arithmetic** (worst-case ladder duration < outer timeout; a Canvas 401 storm produces `auth_trip`,
not `transient_trip`), not the shape of the code.

---

## 6. Corrections to the main handoff

| Item | Correction |
|---|---|
| **F2** | Now has a cause and a date: R1, `b7c6a655f`, 2026-07-27. Promote to fix #1. |
| **F3** | ★ **Not a regression.** Predates 2026-07-01. Still worth fixing; do not describe it as recent breakage. |
| **F5** | Has a mechanism: R3 made the recovery predicate stricter while `_GEMINI_RECOVER_HITS` stayed at 4. |
| **§6 order** | Superseded by §7 below. |

---

## 7. Re-ranked task list

| # | Task | Origin |
|---|---|---|
| 0 | Diagnostic bundle button | main handoff §5 — unchanged, still first |
| 1 | **R1 deadline-aware auth ladder** | `gemini_api_module.js:723-763` — was F2/#5 |
| 2 | F1 repeat-offender guard | `doc_pipeline_source.jsx:7228-7264` |
| 3 | F3 retry budget `120000 → 180000`, vision `90000 → 120000` | `:7395`, `:7503` |
| 4 | **R2 transient double-count** — after #2, then re-measure the threshold | `:7284-7287` |
| 5 | F5 `_GEMINI_RECOVER_HITS` 4 → 3 | `:6264` |
| 6 | F8 telemetry field fixes | `:6333`, `:6592`, `:6622`, `:6697` |
| 7 | F4 probe generation length | `:6854`, `:6871` |
| 8 | F6 coverage guard on accept/revert | auto-fix loop |
| 9 | F9 pacing message wording | `:6760` |

**Still leave unchanged:** `_GEMINI_COOLDOWN_MS`, `_GEMINI_STORM_MIN`, `_geminiStaggerMs`,
`_GEMINI_STORM_TRIP`. And ★ do not touch `_GEMINI_TRANSIENT_TRIP` until #2 and #4 both land.

---

## 8. Method and caveats, so you can reproduce or challenge this

- Baseline is `66db8c3039229f4ff6abe965bc8ac34f0910539e` (2026-07-01, "Stabilize remediation and
  golden tests"), the nearest commit at or before Aaron's date, found with
  `git rev-list -1 --before=2026-07-01 main -- doc_pipeline_source.jsx`.
- 211 commits touch `doc_pipeline_source.jsx` in the window. The three above were isolated with
  `git log -S` on each gate identifier, then read as full diffs.
- ⚠ `doc_pipeline_source.jsx` contains a null byte, so plain `grep` calls it binary. Use `grep -a`.
- ⚠ The ~60s-per-ladder-rung figure is **measured from the 08-14 field log**, not a constant. It will
  vary with load. R1's fix should therefore derive the budget from the *observed* previous rung
  duration rather than assuming 60s.
- ⚠ Commit dates are authorship dates. `b7c6a655f` is a checkpoint commit batching concurrent
  sessions' work, so the ladder may have been written earlier than 07-27 and it is not clear it was
  ever individually reviewed.
- Not investigated: `view_pdf_audit_source.jsx` and the host/ANTI layer over the same window. If a
  regression survives all of the above, that is where to look next.
