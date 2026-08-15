# ADDENDUM 3 — there are FOUR nested retry layers, and none of their budgets nest. Probable root cause of F1.

**Date:** 2026-08-14 · **Author:** Claude (Opus 5), analysis only · **Status:** still **zero code changed**
**Reads after:** main handoff → Addendum 1 → Addendum 2.

★ **Read §4 first if you are mid-way through building the diagnostic bundle** — this changes what the
bundle must capture, and it is cheaper to add now than to retrofit.

R1 was described as "two retry layers whose budgets don't nest". That was incomplete. There are
**four**, and the innermost one is the worst offender.

---

## 1. The full stack for one logical `callGemini` from `doc_pipeline`

| # | Layer | File | Multiplier | Per-attempt timeout |
|---|---|---|---|---|
| 1 | `_geminiCall` initial + retry | `doc_pipeline_source.jsx:7200` | ×2 | 180s / **120s** |
| 2 | Canvas auth ladder (R1) | `gemini_api_module.js:729` | ×3 | none of its own |
| 3 | primary → fallback **model** | `gemini_api_module.js:549,566` | ×2 | none of its own |
| 4 | `fetchWithExponentialBackoff` | `utils_pure_source.jsx:371` | **×5** | **120s each** |

```
2 × 3 × 2 × 5  =  up to 60 HTTP requests for ONE logical callGemini
```

Layer 4 is invoked as `fetchWithExponentialBackoff(_buildUrl(...), _fetchOpts)` — **two arguments**,
so `maxRetries = 5` and `perRequestTimeoutMs = 120000` are both defaults.

★★★ **Layer 4 alone can consume 5 × 120s = 600s of request time plus ~31s of backoff sleeps** (the
schedule is 1+2+4+8+16s, per the file's own comment), **inside `_geminiCall`'s 180s outer budget.** It
is mathematically incapable of completing. On the outer *retry* the budget is 120s, which is
**exactly one** inner per-request timeout, so the inner layer cannot finish even its first attempt.

---

## 2. ★★★ This is the probable root cause of F1

The main handoff left this open: *why do fix chunks 1 and 3 fail 0-for-6 while chunk 2 succeeds
between them, when chunk 3 carries the smallest prompt in the set?* I attributed it to
"content-shaped failure" and flagged the mechanism as unknown. **This is a better explanation and it
requires no content hypothesis.**

Layer 4 retries on **429 and 503 only** — `utils_pure_source.jsx:400,417`. (401 is `isFatal` and
throws immediately, `:404-415`, so R1's analysis is unaffected: Canvas 401s still fail fast at this
layer and the ~60s-per-rung figure is not this code.)

So the mechanism is:

> A call whose **first HTTP request draws a 429** enters a 5 × 120s retry ladder that cannot finish
> inside the 180s outer timeout. It is killed by the outer timeout every single time, and
> `doc_pipeline` records `Timeout after 180s` with **no indication a 429 ladder was ever running.**

That is binary and repeatable, which is exactly the observed signature. Chunk 2's first request got
through; chunks 1 and 3's did not, and from that moment they were doomed regardless of their content.
It also explains why the log's throttle looks like an "empty-body/timeout storm" — from
`doc_pipeline`'s vantage point a 429 storm and a hang are indistinguishable, because layer 4 never
reports upward.

⚠ **Confidence: high on the mechanism, not yet proven on this run.** No 429 is visible in the field
log because nothing logs one. §4 is how you confirm it.

---

## 3. This makes F3 sharper than stated

The main handoff framed F3 as "the retry budget is below the observed 144-169s success latency". True,
but the harder fact is the **inversion against layer 4**: the outer retry budget (120s) equals one
inner per-request timeout (120s). Any inner retry at all guarantees the outer retry fails. F3's fix
(`120000 → 180000`) is still correct but is not sufficient on its own.

---

## 4. ★ What this means for the diagnostic bundle you are building NOW

The per-call ledger in §5 of the main handoff must additionally capture, per logical call:

- **HTTP status of every inner attempt** (429 / 503 / 401 / 5xx), not just the final error string.
- **Inner retry count** — how many times layer 4 looped.
- **Which model served it** (`_modelUsed`, `gemini_api_module.js:547,568`) so layer-3 fallbacks are visible.
- **Ladder rung count** for layer 2.

Without these the bundle will faithfully record `Timeout after 180s` for a call that actually made
ten HTTP requests and got ten 429s, and the next reader will repeat my mistake of reasoning about
prompt content. Layer 4 already has the information at `utils_pure_source.jsx:418`
(`⚠️ Transient API error ${response.status}, retrying (${i+1}/${maxRetries})`) — it just goes to
`warnLog`, unattributed to any call.

★ Cheapest possible version: thread a correlation id (the `callGemini #N` the pipeline already
assigns) down to layer 4 so its existing warn line can be joined to a call. That alone would have
answered F1.

---

## 5. Fix direction — deliberately not prescriptive yet

Do **not** just lower `maxRetries`. Layer 4 is shared by every `fetch` in the app, and 429/503 backoff
is correct behaviour for most callers. The same reasoning as Addendum 2: this is a **scoping**
problem, not a wrong-value problem.

The principled fix is a **single deadline threaded through all four layers** rather than four
independent budgets: the caller sets one wall-clock deadline, and every layer checks it before
starting another attempt. That is a larger change than anything else in this backlog and should be
designed, not patched.

Interim, and consistent with Addendum 2's bypass: have `doc_pipeline`'s calls pass explicit
`maxRetries` / `perRequestTimeoutMs` arguments sized to fit inside `_geminiCall`'s budget, leaving
every other caller on the defaults. Both parameters already exist in the signature — nothing new is
required.

⚠ Sequence this **after** the bundle lands and one clean run confirms §2. If 429s are not what is
happening, the interim fix is still safe but the priority changes.

---

## 6. Revised understanding of the whole investigation

Three findings now share one root class: **independently-chosen timeouts and retry counts at four
layers that were each reasonable alone and were never checked against each other.**

| | Layer pair | Symptom |
|---|---|---|
| R1 | 2 inside 1 | Canvas 401s misfiled as timeouts |
| F3 | 4 inside 1 (retry) | outer retry budget = one inner request timeout |
| F1 | 4 inside 1 (initial) | a single 429 dooms the call, invisibly |

None of these is a bad line of code. Every one is a composition failure. That is the thing to fix,
and it is why "which commit should we revert" (Addendum 2) had no useful answer.
