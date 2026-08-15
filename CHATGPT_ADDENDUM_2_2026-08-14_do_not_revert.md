# ADDENDUM 2 — "should anything be reverted?" No. And R1's fix changes shape.

**Date:** 2026-08-14 · **Author:** Claude (Opus 5), analysis only · **Status:** still **zero code changed**
**Reads after:** `CHATGPT_HANDOFF_2026-08-14_throttle_findings_and_diagnostic_bundle.md`, then
`CHATGPT_ADDENDUM_2026-08-14_regression_archaeology.md`.

★ **This supersedes the fix recommendation in Addendum 1 §2.** Everything else in both prior documents
stands.

Aaron asked whether anything from the July–August window should simply be reverted. Answer: **no,
nothing**, and the reasoning matters more than the verdict.

---

## 1. R1's commit is physically unrevertable

`b7c6a655f` ("Checkpoint concurrent sessions' in-flight work before deploy") is:

```
75 files changed, 6462 insertions(+), 946 deletions(-)
```

Alongside the ~40-line Canvas auth ladder it carries `udl_chat`, `view_renderers`, `view_analysis`,
the cloze interaction panel, glossary, quiz, `ui_strings`, `text_utility_helpers`, `view_misc_modals`,
and five new test files. A `git revert` would destroy all of that to remove the ladder. Off the table.

---

## 2. You would not want the ladder gone anyway. You want it **scoped**.

### The wiring, confirmed

```
doc_pipeline_source.jsx:6163   var _rawCallGemini = deps.callGemini;
gemini_api_module.js:950       return { callGemini, callGeminiImageEdit, callGeminiVision, ... };
gemini_api_module.js:729-763   const callGemini = async (...) => { for (let attempt = 0; attempt <= CANVAS_AUTH_RETRIES; attempt++) { ... } }
```

The exported `callGemini` **is** the laddered wrapper, so `doc_pipeline`'s own retry sits on top of it.

### ★★★ The arithmetic is worse than Addendum 1 stated

`_geminiCall` retries once (`_attempt(0)`, `_attempt(1)`), and each of those runs a full 3-rung inner
ladder:

> **up to 6 network attempts per logical `callGemini`**, against a service that is actively
> rate-limiting

That is the hammering loop the breaker exists to prevent, running *inside* the breaker. It also
explains why failed calls in the 08-14 log show durations of 671s, 836s and 1,001s against a
nominal 180s timeout.

### The ladder itself is good and must stay

Its stated purpose (`gemini_api_module.js:701-719`) is the ~20 **bare** call sites — grammar repair,
glossary, personas, adventure, ~20 handler files — which have no retry of their own and were
reporting a single throttled call as a hard feature failure. That was a real bug with real field
evidence. Keep it for them.

`doc_pipeline` is the **only** caller that already has both a retry and a breaker, and it is the only
caller that cannot afford a second retry layer underneath.

### ★ The fix: bypass, not deadline-awareness

`_callGeminiAttempt` — the unladdered single attempt — **already exists** as a separate function at
`gemini_api_module.js:482`. It is simply not in the export list.

1. Export it (or add an options flag on `callGemini`, e.g. `{ innerRetry: false }`).
2. Point `doc_pipeline`'s `deps.callGemini` binding at the unladdered entry point.

Result: the pipeline gets **exactly its 2026-07-01 behaviour back** — a Canvas 401 arrives
immediately, classifies as `canvasTransientAuth`, feeds `_geminiNoteAuthFail`, and the gate applies
its own single jittered retry with the cooldown doing the backoff. Every other caller keeps the
07-27 improvement. Nothing is reverted.

**Why this beats Addendum 1 §2's "make the ladder deadline-aware":** the bypass is a smaller diff, it
touches only the one caller that has the problem, and it removes the double-retry outright instead of
merely bounding its overrun. Deadline-awareness would still leave 2 retry layers stacked.

⚠ Check while doing this: `_geminiProbe` also calls `_rawCallGemini` directly
(`doc_pipeline_source.jsx:6895`) under a 30s cap, so it inherits whichever binding you choose. The
probe should use the unladdered path too — a probe that silently climbs a ladder is not measuring
what it claims to measure.

---

## 3. R2 and R3 are not revert candidates either

**R2 `40cdd3425`** also contains OCR render-task cancellation, the vision fallback circuit after 2
unrenderable pages, and the serial catch-up drain. All wanted. The harmful part is a single scoping
detail: `_outcomeNoted` is declared inside `_attempt`, so it is per-attempt rather than per-call.
★ Note that "count immediately" is **load-bearing** for M15's slot-hold reasoning — keep it, and only
stop the double count. Hoist the flag to `_geminiCall` scope; do not revert the commit and do not
simply raise `_GEMINI_TRANSIENT_TRIP`.

**R3 `08df4edd2` + `fe1eac33d`** fixed a genuine bug: a tiny call clearing a document-sized throttle.
Reverting reintroduces it. It needs its constant re-tuned (`_GEMINI_RECOVER_HITS` 4 → 3), not undoing.

**R0** is already fixed by `75298ba32`. Nothing to do.

---

## 4. The pattern, stated plainly for whoever touches this next

None of R1, R2, R3 is a bad change. Two of the three are **correct in isolation and wrong only in
interaction**, and all three landed inside batches carrying substantial unrelated good.

★ Reverting is the wrong tool twice over here, and the repo already has the scar to prove it: R0 was
a *clean refactor* (`fe1eac33d`, M15) that dropped one line and made the entire throttle-resilience
layer inert in Canvas — 5,000+ seconds, 60+ calls, zero `[GeminiGate]` lines. Broad structural moves
in this area have a bad record. Prefer narrow, behaviour-asserting changes.

---

## 5. Revised top of the task list

| # | Task | Change |
|---|---|---|
| 0 | Diagnostic bundle button | unchanged (main handoff §5) |
| 1 | **R1: bypass the inner ladder for `doc_pipeline` + `_geminiProbe`** | ★ replaces "deadline-aware ladder" |
| 2 | F1 repeat-offender guard | unchanged |
| 3 | F3 retry budgets `120000 → 180000`, `90000 → 120000` | unchanged |
| 4 | R2: hoist `_outcomeNoted` to per-call, then re-measure the transient threshold | unchanged |
| 5+ | F5, F8, F4, F6, F9 | unchanged |

Everything below #1 in Addendum 1 §7 is unaffected.
