# ChatGPT handoff — the throttle field log arrived. Nine findings, and the 08-13 rollup turns out to have never run.

**Date:** 2026-08-14 · **Author:** Claude (Opus 5), analysis only · **Status:** analysis complete, **zero code changed**
**For:** ChatGPT, picking this up cold. You have no conversation context and you do not need any.

**Predecessors (read in this order):**
1. `CHATGPT_HANDOFF_2026-07-25_throttle_and_logging.md` — §1 repo orientation + safe build commands.
2. `HANDOFF_2026-08-13_gemini_throttle_telemetry.md` — §2 the two-throttles distinction, §3 what exists,
   §4 the constants, §6 the decision rule. ★ **§6 needs the correction in §3 below before you use it.**

---

## 0. What you are being handed, in five lines

Aaron ran the 8-page scanned PDF through the remediation pipeline in Gemini Canvas on 2026-08-14,
10:54 AM → 1:32 PM (2h 36m). He pasted the diagnostics log back. It was analysed line by line against
the source. **Nine findings (§4), none of them fixed.** The recommended first task is not any of the
nine: it is a diagnostic-bundle button (§5), because the instrumentation the 08-13 pass built has
never actually executed in the field (§3.1) and because the next confirming run needs a better
instrument than the one that produced this log.

**Nothing in this repo has been modified except the creation of this file.** No edits, no commits,
no builds, no pushes.

---

## 1. The one-paragraph version

The 08-13 decision rule asks "is this throttle concurrency-driven or rate-driven". The log says
**neither, mostly**. The gate spent about **5.5 minutes** of the run in deliberate cooldown and about
**51 minutes** inside `callGemini` invocations that timed out and returned nothing, a 9:1 ratio. Every
constant §4 of the 08-13 doc lists can only move the 5.5 minutes. Meanwhile **two of the three
auto-fix chunks failed deterministically, twelve times, across both passes, in windows where the
third chunk succeeded** — and each of those failures fed `_geminiNoteTransientFail` and ratcheted the
global breaker. The gate spent the afternoon backing off from a rate limit that was, at minimum, not
the whole story. Net output of 2h 36m: 3 deterministic accessibility fixes and 1 contrast fix.

---

## 2. Provenance of the log, and how far you can trust it

★ **Aaron put the machine to sleep mid-run.** He flagged it; the log confirms and bounds it.

| Evidence | Reading |
|---|---|
| 11:57:28 schedules a retry `after 2260ms`; it fires at **12:39:45** | a 2.3s `setTimeout` late by 42 minutes is a **suspend**, not Chrome's hidden-tab clamp |
| 11:30:31 → 11:57:28, no lines, `#16` under a 180s timeout | the timeout did not fire for 27 minutes |
| `#16 done (4407184ms, 2KB response)` | 73.5 min enqueue-to-settle; its winning attempt actually ran 12:39:45 → 12:40:21, about **36s** |
| `hiddenMs` 101,009 → **4,441,880** | ≈47% of the 9,345s run |

So `tuneable` would be 0 and the ⚠ banner would fire. Per §5 of the 08-13 doc the honest response is
to ask for the run again.

★ **But the run is not a write-off, and the current flag makes it look like one.** Every decision from
**11:00:41 through 11:22:52** carries `hidden=0` and `hiddenMs=5810` — 5.8 seconds across 27 minutes,
0.4%. That clean prefix already contains 1 `auth_trip` and 5 `transient_trip` events, enough to answer
§6. The first `hidden=1` decision is 11:26:18.

`tuneable` is computed once at the end over the whole run (`_pipeThrottleSummary`, ~line 6397), so one
sleep at minute 95 discards 95 clean minutes. Every event already carries its own `hidden` flag, so
the rollup can report the clean **prefix** instead of a single run-level verdict. See F8.

**The sleep did not corrupt output.** Per §2 of the 08-13 doc, `fetch` survives; only timer-derived
pacing stretches. The extraction and HTML are fine.

★ **You do not have the raw log in the repo.** Aaron has it. Ask him to paste it into
`field_logs/2026-08-14_canvas_scanned_8pg.log` before you start, or work from the excerpts quoted in
§4 — each finding quotes the lines it rests on, which is enough to verify the reasoning. The copy he
sent was itself truncated at ~50,000 characters, so the tail after 1:32 PM (`[Auto-fix] P…`) is
unknown to everyone.

---

## 3. Corrections to the 08-13 handoff

### 3.1 ★★★ The rollup has never run. Not once, in the field.

`_pipeThrottleSummary` has **exactly one call site**: `doc_pipeline_source.jsx:6141`, inside
`_getPipelineStats()`.

```js
// doc_pipeline_source.jsx:6138-6142
var _getPipelineStats = function() {
  try { if (_throttleTrace.length) _pipeThrottleSummary(null); } catch (_) {}
  return { ... };
```

`_getPipelineStats()` fires at the end-of-run / failure snapshot. Aaron's run was **still grinding**
when he copied the log at 1:32 PM. Therefore `ThrottleSummary`, `tripsAtInFlightAvg`,
`cooldownMsTotal`, `cooldownLengthsUsed`, `hiddenPctOfRun`, `tuneable` and the ⚠ hidden-tab banner
**were all absent from the artifact**. Every number in this document was reconstructed by hand from
the raw `ThrottleData` lines.

Consequences you must carry forward:

- §6 of the 08-13 handoff instructs the reader to interpret the rollup. For any run that is
  cancelled, still running, or copied mid-flight, **the rollup does not exist**. That is the normal
  case for a throttled run, because a throttled run is exactly the one a teacher gives up on.
- The rollup code has never been exercised against real data. Treat it as unproven. It may have its
  own bugs that only a real invocation surfaces.
- This is the strongest single argument for §5's bundle button: "force the rollup and hand it to me
  **now**, mid-run" is most of the value.

### 3.2 ★★ The panel copies the lossy buffer

There are two sinks and they are not equivalent.

| Sink | Written by | Shape | Capped |
|---|---|---|---|
| `window._alloflowPipelineWarnings` | `_pipeLog` directly, `doc_pipeline_source.jsx:6083-6093` | **structured**: `{ts, elapsed, tag, msg, data, runId, documentEpoch}` | 500 |
| `window.__alloDiagLog` | `warnLog`, called from `_pipeLog:6080` | flat strings | (warnLog's own ring) |

`PdfDiagnosticsLog` — the panel with the 🔧 Log button and the 📋 Copy affordance, at
`view_pdf_audit_source.jsx:3123` — reads and copies **`__alloDiagLog`**, the flat one
(`:3139`, `:3150`). So every structured `data` payload, including the full `ThrottleData` record
objects, is flattened into text that then has to be re-parsed by eye.

The L2 comment already in the source at `doc_pipeline_source.jsx:6065-6072` caught this exact class of
loss once before (runId and documentEpoch computed but not travelling). Same shape, still present for
`data`.

### 3.3 The auth/transient trip ratio in §6 is an artifact, not a signal

§6 says "if one breaker never fires, its trip threshold is either wrong or its manifestation has
changed." The log shows 2 `auth_trip` against 14 `transient_trip` while being wall-to-wall with
`[GeminiAPI] transient auth failure`. It is neither of §6's options: the auth breaker is being
**starved** by the outer timeout killing the auth ladder mid-climb. See F2. ★ Do not re-tune
`_GEMINI_STORM_TRIP` off this ratio.

---

## 4. The nine findings

Ordered by how much of the run each cost. `:NNNN` line numbers are `doc_pipeline_source.jsx` unless
stated.

### F1 ★★★ Two of three fix chunks fail deterministically; the gate calls it a rate limit

| chunk | prompt | attempts (`callGemini #`) | successes |
|---|---|---|---|
| 1 | 18KB | `#7`, `#10`, `#12`, `#17`, `#20`, `#23` | **0 / 6** |
| 2 | 17–18KB | `#8`, `#18`, `#21` | 2 / 3 |
| 3 | **4KB** | `#9`, `#11`, `#13`, `#19`, `#22`, `#24` | **0 / 6** |

Chunk 2 succeeded at 11:09:31 (169,333ms) and again at 1:03:20 (144,505ms), both times bracketed by
chunk 1 and chunk 3 failures minutes away at the same `cap=1`. The tightest window:

```
1:00:55  chunk 1 (#20, 18KB)  FAILED   Timeout after 180s
1:03:20  chunk 2 (#21, 18KB)  done     144505ms, 17KB response
1:08:22  chunk 3 (#22,  4KB)  FAILED   Timeout after 120s (retry 1)
```

Same gate state, same minute, opposite outcomes. And **chunk 3 carries the smallest prompt in the
set** — under a volume throttle it should be the *most* likely to get through, and it went 0-for-6
across two and a half hours and both passes.

That is content-shaped failure, not rate-shaped. All twelve failures fed `_geminiNoteTransientFail`
(`:6615`) and ratcheted the breaker, which then slowed the one chunk that would have succeeded.

⚠ **How the chunk↔call mapping was derived, since you should sanity-check it:** the log does not
label calls with their chunk. It was inferred from the ordering of the `aiFixChunked … chunk N failed`
lines that follow each `API✗`, plus prompt sizes (chunk 3 is the only 4KB prompt). Making this
explicit is §5's highest-value logging change, precisely because this inference is load-bearing.

**Fix:** a repeat-offender guard. Track consecutive failures per call signature; once a signature has
failed N times (suggest 2) with no intervening success, stop feeding the **shared** breaker from it
and let the caller's existing catch-up/deferral path own it. `_noteGeminiOutcome` already excuses
`RECITATION` from the breaker on exactly this reasoning (`:7235`) — extend that idea. Constraints:
per-signature, any success clears it, and it must not be able to mask a genuine storm.

★ **Open, and the fix does not answer it: *why* do chunks 1 and 3 hang?** A 4KB prompt timing out at
180s six times is not a size problem. Candidates: an empty body on a connection the proxy never
closes; a generation loop; a content filter that stalls rather than refusing. Needs one instrumented
run with response-byte and finish-reason capture (see §5).

### F2 ★★★ The Canvas auth ladder cannot fit inside the timeout, so 401s are recorded as timeouts

`callGemini` is wired at `:7395` as `initialMs: 180000, retryMs: 120000`. The Canvas 401 ladder is
3 attempts at `[1200, 3000]ms` backoff (`gemini_api_module.js:723-726`). In this log **each attempt
takes about 60 seconds to come back 401**.

```
#28  transport start   1:25:38
     auth failure      1:26:36   (+58s)
     auth failure      1:27:36   (+118s)
     FAILED            1:28:38   Timeout after 180s
```

The third rung would land at ~180-185s. The outer timeout kills it first. `#20` and `#27` are
identical in shape.

1. ★ **`3/3` never appears once in 2h 36m of logging.** The third rung can never report. It is
   effectively dead code under Canvas.
2. ★ The call is then classified as a **timeout**, so `_noteGeminiOutcome` routes it to
   `_geminiNoteTransientFail` instead of `_geminiNoteAuthFail`. That is the whole of §3.3.

★ **Trap for the next reader:** `transient auth failure N/3` is the **banner debounce** counter
(`_AUTH_BANNER_THRESHOLD = 3`, `gemini_api_module.js:187`), *not* a retry counter, and
`gemini_api_module.js:753` rolls it back on each internal rung. **Two consecutive `1/3` lines 60s
apart are one call climbing its ladder, not two calls.** Getting this wrong inverts the whole reading.

**Fix:** make the ladder deadline-aware inside `gemini_api_module.js`. Before each retry, if elapsed
plus the last rung's observed duration would exceed a budget sitting under the outer timeout, throw
the real auth error instead of climbing into a kill. The call then fails ~60s sooner **with its
classification intact**, so `authStreak` climbs and the auth breaker (trip 2) does its job. Keep the
backoff array injectable — `tests/canvas_transient_auth_retry.test.js` depends on
`deps.canvasAuthBackoffMs`.

### F3 ★★ The retry timeout is below the observed success latency

`retryMs` is 120,000 where `initialMs` is 180,000. The two large fix chunks that *did* succeed took
**169,333ms** (`#8`) and **144,505ms** (`#21`). Both exceed the retry budget.

A retry of a large chunk is therefore arithmetically unable to succeed, and it fits only two rungs of
the F2 ladder instead of three. `callGeminiVision` has the same inversion at `:7503` (120000 / 90000).

**Fix:** `retryMs >= initialMs`. A retry exists because the first attempt ran out of time; giving it
less time is backwards.

### F4 ★★ The recovery probe passes on a dimension that is not the failing one

**Probes went 9 for 9**, each answering in about 7 seconds. Every "resuming cautiously" was followed
within one attempt by another 180s timeout.

`_geminiProbePrompt` (`:6854`) carries 24KB of filler but asks for **one word, `OK`**, under a 30s cap
(`:6871`). The 2026-07-24 fix made the probe representative of **input volume**. What fails here is
**generation length**: the successful large calls needed 144-169s to emit 17-18KB. The probe never
exercises that, so probe success is not evidence a fix call can complete. Each false all-clear costs
3+ minutes to re-learn, and 9 probes × 24KB is 216KB of prompt spent learning nothing.

**Fix:** size the probe's *requested output* to the failed route's expected response and raise its
timeout to match. Keep the filler content-free (FERPA) and keep the probe breaker-neutral — that
neutrality is the entire 2026-07-24 fix and `tests/gemini_probe_representative_recovery.test.js`
guards it. ★ That test previously broke by pinning a literal source signature string; do not
reintroduce that pattern.

### F5 ★★ The gate is a one-way ratchet once it trips

- `_GEMINI_RECOVER_HITS = 4` (`:6264`). There is exactly **one** `recovered` event in the whole run,
  at 11:05:03. The best streak afterwards was **three** consecutive successes (`#14`, `#15`, `#16`,
  11:27 → 12:40). One short. The cap sat at 1 for the final 2h 20m.
- The cooldown at `:6620` is `min(25000, 12000 * (streak - 3 + 1))`: 12s, 24s, 25s, 25s, 25s, then
  nothing. By trip 5 both levers are spent — cap already at the floor of 1, cooldown pinned at the
  ceiling. **Trips 5 through 8 were identical no-ops** costing only wall clock.

At the run's measured `callGemini` success rate of 41% (12 of 29), four-in-a-row is a ~3% event;
three-in-a-row is ~7%, and the run actually hit it.

**Fix:** `_GEMINI_RECOVER_HITS` 4 → 3. ★ Leave the cooldown ceiling alone: per §1 it is not where the
time goes, and the 25s cap was a deliberate 2026-07 decision with its rationale in the comment.

### F6 ★★ The fix loop acted on two score comparisons that were not valid

**Pass 1.** At 11:26:18 the catch-up shipped **2 of 3 chunks as original**. Only chunk 2 was actually
rewritten. The re-audit scored the whole document 11, and the loop concluded
`Pass 1 REGRESSED (22→11) — REVERTED`, discarding the one chunk that had succeeded. A pass where two
thirds of the edits never applied is **incomplete**, not regressed, and its delta is not a quality
signal.

**Pass 2.** The final re-audit reports
`2/3 sections returned (1 FAILED — score covers audited sections only) … score 73`. That 73 omits an
entire section's deductions and is not comparable to the 22 (4/4 sections) or the 11 (3/3). ★ A
partial audit scores **higher** almost by construction, so the loop can "improve" by auditing less.
The log truncates at `[Auto-fix] P` so the verdict is unknown; the guard is needed either way.

**Fix:** gate the accept/revert comparison on coverage. If the fix pass shipped any chunk as original,
or if either audit returned fewer sections than requested, mark the pass **incomplete** and do not
compute a regression verdict from the delta.

### F7 ★ The regression guard's axe clause is structurally true on a scanned source

Input is scanned (`0 chars / 8 pages`); baseline reads `axe 100 (0 violations), EqualAccess 98 (0
fails)`. Both engines run on HTML; on a scanned source there is nothing to fail. So the guard's
`without fixing any axe violation; axe: 0→0` clause is always true here, and the whole accept/revert
verdict rests on a rubric whose raw deductions swung **77.85 / 89 / 27** across three audits of the
same document.

Standing rule this violates: guard the premise when 0 = pass. If the deterministic engines had no
surface to evaluate, say so rather than scoring 100.

### F8 ★ Telemetry defects that will mislead the next reader

The instrumentation is the product, so these matter more than usual.

- ★★ **`okStreak` is structurally always 0.** Zeroed at `:6585` and `:6617` before the trip events
  emit; zeroed at `:6697` before `recovered` emits; and `_pipeThrottleScoreProbe` runs at the *top* of
  the note handlers, so `post_cooldown_ok` snapshots it pre-increment. All 32 `ThrottleData` lines in
  this log read `okStreak=0` and always will. §6's "recovery-per-cooldown" read is unavailable.
- ★★ **`cap` at a trip is the post-trip value.** `:6592` sets `_geminiCap = 1` before `:6599` emits.
  Every trip records `cap=1` regardless of the ceiling in force when the failures accumulated. §6's
  primary question is "in-flight at each trip vs the cap in force"; this field cannot answer it.
  Emit `capBefore` alongside.
- ★ **Streaks on `post_cooldown_*` are pre-update snapshots too.** The 11:27:31 line reads
  `transientStreak=7` on a **success**, which looks like a reset bug. It is not. It cost a source dive
  to rule out and the next reader will pay the same toll. Emit post-update values, or name the fields
  `…Before`.
- ★ **`tuneable` is run-level and binary.** See §2. Report the clean prefix instead.
- ★ **Response sizes floor to `0KB`.** `#2` logs `done (155927ms, 0KB response)` yet reported "fixed
  2/10 issues", and `:7258` treats a genuinely empty body as a **failure** — so these were short, not
  empty. The log cannot distinguish an empty body (the exact throttle signature this instrumentation
  exists to find) from a small one. Log exact bytes.

### F9 ★ The pacing message overstates itself

`[GeminiGate] Pacing … staggering actual call starts ~1500ms apart` printed at 10:55:09; `#3` then
started after **35,361ms**, because it waited for a slot, not for a stagger. Same at 10:56:19 with
`~700ms`, `#4` at 19,223ms, `#5` at 32,199ms. The stagger is a *floor* on the gap between starts, not
the gap. Anyone tuning `_geminiStaggerMs` from this line tunes the wrong number.

---

## 5. ★ Task 1: the diagnostic bundle button (do this first)

Aaron asked for "a button at the bottom of the remediation log that saves everything you'd want for
improving the pipeline, as a findable set of files." It should be built **before** F1-F9, because the
next Canvas run is what confirms or kills F1, and the instrument should be in the tab before that run
happens. §3.1 is the second reason: the rollup has never executed and needs a forcing function.

### Where

`PdfDiagnosticsLog`, `view_pdf_audit_source.jsx:3123`. Add a control beside the existing
`_copy` (`:3149`) and `_clear` (`:3162`) buttons. Suggested label `🧪 Diagnostic bundle`.

### What it emits

One zip named `alloflow-diag-<digest8>-<YYYYMMDD-HHMM>.zip` containing:

| File | Contents |
|---|---|
| `bundle.json` | machine-readable, see below |
| `log.txt` | the flat log exactly as `_copy` produces today, so nothing is lost |
| `README.md` | human summary: what the run was, the rollup in prose, a "start here" pointer |

`bundle.json` fields:

1. **The forced rollup.** Call the throttle summary *on demand* rather than waiting for end-of-run.
   ⚠ Verify whether `_getPipelineStats` is reachable from the view layer; a grep suggested it may not
   be. If not, add a narrow entry point on the pipeline object (e.g. `getDiagnosticSnapshot()`) rather
   than reaching into internals from the view.
2. **Full `_throttleTrace`** (capped 400, `:6294`) as structured records, not flattened strings.
3. **Structured `window._alloflowPipelineWarnings`** (capped 500) with `data` payloads intact — this
   is the buffer §3.2 shows the current copy path throws away.
4. **Per-call ledger**: for every `callGemini`/`callGeminiVision` — call number, op label, **chunk id
   and pass number** (F1: this is the highest-value single addition), queued ms, transport ms, exact
   response **bytes** (F8), outcome, error classification, and how many auth rungs it climbed (F2).
5. **Environment**: Canvas vs desktop vs localhost, the `?v=` CDN pin (visible in stack traces, e.g.
   `?v=4697943eb`), model ids, page count, base64KB, `documentDigest`, source kind.
6. **Heartbeat gaps**: a 1s interval recording `Date.now()`. A gap ≫ 1s separates **machine suspended**
   (no ticks at all) from **tab hidden** (ticks clamped to ~1/min). §2 of the 08-13 doc says nothing
   currently distinguishes these, and `hiddenMs` conflates them. This is cheap and it is what turned a
   two-hour ambiguity into a one-line fact in this analysis.
7. **Constants in force** at bundle time.

### Non-negotiable constraints

- ★★ **No prompt, response, or document text. Ever.** FERPA, and
  `tests/pipeline_throttle_telemetry.test.js` asserts no `prompt`/`text`/`content`/`response`/`body`
  field can appear. **Extend that test to cover the bundle**, do not route around it. Hashes, char
  counts, tag counts, enums and numbers only.
- The teacher-facing panel keeps its current behaviour and its "decisions, not per-call rows"
  discipline (08-13 §3). The bundle is a **second, developer-facing** affordance. Once it exists the
  500-cap tension disappears: the panel stays decision-level, the bundle carries the full trace.

### Mechanics that are already proven in this file

- `URL.createObjectURL` + `a.download` works in Canvas; there are ~12 existing sites in
  `view_pdf_audit_source.jsx` (e.g. `:11373`, `:13830`, `:14204`).
- A zip is already built for the DAISY export at `:4962`, so a zip helper exists to reuse.
- ⚠ Chrome strips path separators from the `download` attribute, so a real subfolder is impossible
  from the browser. The zip *is* the "findable set"; do not try to write a directory.
- ★ Also push `bundle.json` to the clipboard in the same click. Canvas iframe downloads are
  occasionally blocked, and `_copy` at `:3156-3159` already has the working `execCommand` fallback
  pattern to copy (note it falls back on **rejection**, not just absence — keep that).

---

## 6. Task 2: the fixes, in order

Nothing below has been started.

| # | Change | Site | From → To |
|---|---|---|---|
| 1 | F3 retry budget | `:7395` | `120000` → `180000` |
| 2 | F3 vision retry budget | `:7503` | `90000` → `120000` |
| 3 | F5 recovery hits | `:6264` | `4` → `3` |
| 4 | F8 telemetry fields | `:6333`, `:6592`, `:6622`, `:6697` | add `capBefore`, emit post-update streaks, exact bytes, prefix-based `tuneable` |
| 5 | F2 deadline-aware auth ladder | `gemini_api_module.js:729-763` | new budget check before each rung |
| 6 | F1 repeat-offender guard | `:7228-7264` | per-signature suppression |
| 7 | F4 probe generation length | `:6854`, `:6871` | size requested output; raise timeout |
| 8 | F6 coverage guard on accept/revert | auto-fix loop | mark incomplete passes |
| 9 | F9 pacing message wording | `:6760` | say "minimum gap", not "apart" |

**Leave unchanged:** `_GEMINI_COOLDOWN_MS`, `_GEMINI_STORM_MIN`, `_geminiStaggerMs` (§1: together
under 10% of lost time); `_GEMINI_STORM_TRIP` (F2: starved, not mis-thresholded — fix the starvation
then re-measure); `_GEMINI_TRANSIENT_TRIP` (its streak is inflated by F1's deterministic failures —
re-measure after #6 lands).

---

## 7. Working in this repo — hazards that will cost you a day each

- ★★ **`doc_pipeline_source.jsx` is canonical.** `doc_pipeline_module.js` and
  `desktop/web-app/public/doc_pipeline_module.js` are **generated**. Never hand-edit them.
  Build with **`node build.js --compile`** — a bare `node build.js` triggers a dev rewrite.
  Then `node check-pipeline-integrity.js` and `node dev-tools/check_free_vars.cjs`.
  ⚠ `check_free_vars.cjs` only inspects files explicitly handed to it.
- ★★ **The working tree is shared with other concurrent sessions.** At the time of writing there is
  unrelated drift in `view_launch_pad_*`, `view_misc_modals_*`, `voice_module.js`,
  `view_project_settings_source.jsx`, plus many untracked `_bl_*.cjs` scratch files. **Commit with an
  explicit pathspec.** Never `git add -A`, never amend, reset, or stash. Never leave new files staged.
- ★★ **The pre-commit hook validates the WHOLE tree, not your diff.** Another session's drift can
  block your commit. Never `--no-verify`. Poll until it exits 0.
- ★★ **`@babel/core` is an undeclared peer dep that vanishes on npm operations.** If a build fails on
  it: `npm i @babel/core@7.29.7 --no-save`. **Never `npm ci`.**
- ★ `node --check` after every edit. It is blind inside template literals, so it will not catch
  breakage in worker source embedded as a template string.
- ★ Test suite has ~98 pre-existing failures unrelated to this work. **Never blanket `-u`.** For
  vitest, the path argument comes **first**, before flags.
- ★ Known red and *not* yours: `tests/throttle_resilience.test.js`, 2 failures ("threads the immutable
  signal…", "captures explicit signals at the gate…"), long-standing App.jsx-vs-ANTI drift, documented
  in 08-13 §7.
- ★ Green as of 08-13 and worth keeping green: `pipeline_throttle_telemetry`,
  `gemini_probe_representative_recovery` (9), `canvas_transient_auth_retry` (5),
  `gemini_breaker_feeds_on_canvas_throttle`.
- ★ `var X = function(){}` does **not** match an `X\(` count assertion, so a guard script asserting
  N+1 aborts before writing. It fails safe, but the error message is misleading.
- ★★ **Do not push or deploy unless Aaron explicitly asks.** He batches deploys himself.

---

## 8. Still open after all of the above

- **F1's root cause.** Why chunks 1 and 3 hang is unknown. The guard stops them poisoning the breaker;
  it does not make them succeed. Needs the §5 bundle plus one instrumented run.
- **A clean confirming run.** Same scanned document, in Canvas, tab visible, machine awake, with the
  bundle button in place. Then re-measure the transient streak with F1's deterministic failures
  excluded, and finally answer the concurrency-vs-rate question with a rollup that actually exists.
- **A global deadline.** "wait-not-stop, nothing is skipped" has no run-level ceiling. This run spent
  2h 36m to deliver 3 deterministic fixes and 1 contrast fix. At some point the honest move is to ship
  the deterministic result and tell the teacher the AI passes are unavailable right now. **Product
  decision, not a bug fix — ask Aaron, do not decide it in code.**

---

## 9. Files

| Path | Role |
|---|---|
| `doc_pipeline_source.jsx` | canonical — gate, breakers, probes, telemetry, fix loop |
| `gemini_api_module.js` | canonical — Canvas auth ladder, error classifier, banner debounce |
| `view_pdf_audit_source.jsx` | canonical — `PdfDiagnosticsLog` panel (`:3123`), the bundle button's home |
| `doc_pipeline_module.js`, `desktop/web-app/public/doc_pipeline_module.js` | generated, do not hand-edit |
| `tests/pipeline_throttle_telemetry.test.js` | field shape + the no-content privacy assertion |
| `tests/gemini_probe_representative_recovery.test.js` | probe is representative + breaker-neutral |
| `tests/canvas_transient_auth_retry.test.js` | the Canvas-auth retry and its three no-retry cases |
| `HANDOFF_2026-08-13_gemini_throttle_telemetry.md` | predecessor — read §2, §3, §5 |
| `CHATGPT_HANDOFF_2026-07-25_throttle_and_logging.md` | earlier predecessor — read §1 for orientation |
