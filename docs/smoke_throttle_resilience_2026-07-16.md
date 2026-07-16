# Throttle-resilience smoke — real Canvas rate-limits (2026-07-16)

**Why this exists:** the 07-15/07-16 pipeline wave changed how the Gemini gate behaves under a
real Canvas rate-limit, and that is the one thing no local test can produce. Everything below is
proven by behavioral goldens + the fault-injection e2e (3/3 green); this checklist verifies the
same contracts against the real service. ~20 min. Companion to
`smoke_individual_remediation_2026-07-10.md` (still THE master gate — run that first if picking one).

**What changed (one paragraph):** recovery from a throttle is now *success-gated only* — an
elapsed cooldown no longer buys back concurrency; the run stays serialized until 4 clean calls in
a row, then jumps back to its ceiling. Empty 200-bodies count as failures immediately (they ARE
the Canvas throttle signature). The opening audit paces itself proactively (concurrency 2, ~1.5s
stagger) and no longer zeroes an overlapping run's storm state. Catch-up rounds are serial and
wait for real calm instead of guessing 8 seconds. Hung OCR page-renders are cancelled, and after
2 consecutive unrenderable pages Tesseract steps aside for the rest of the doc (Vision OCR keeps
running).

**Setup:** Gemini Canvas, AFTER the next deploy + fresh ANTI re-paste. DevTools console open
(all evidence below is console lines). Any doc works, but throttle behavior only shows on heavy
docs — use a **20+ page scanned PDF** (textbook chapter scan is ideal).

---

## T1 — Heavy scanned doc, single run (the main event)

Upload the scanned PDF, let the opening audit run, then Make Accessible with auto-continue ON.

- [ ] On upload: console shows `[GeminiGate] Pacing for the opening PDF audit — concurrency ≤2`.
- [ ] During the run you see `API→ callGemini #N queued` followed later by
      `API-start callGemini #N transport start after XXXXms queued` — the queue-wait telemetry
      is new; large queued-ms during a storm is CORRECT behavior, not a hang.
- [ ] If a throttle hits: `[GeminiGate] Empty-body/timeout storm (N in a row) — throttling to 1
      concurrent`. The progress UI must keep updating (status shows the throttle message) — a
      frozen progress bar for >2 min is a bug, report it.
- [ ] Recovery: `[GeminiGate] Throttle cleared — restoring concurrency to 2` appears only after
      calls start succeeding again (NOT on a timer). If the whole run stays serialized, that is
      the intended behavior under an intermittent throttle — slow but complete.
- [ ] The run COMPLETES with the usual honesty surfaces (verdict strip, coverage panel). A
      throttled run should end degraded-honest or complete — never wedged, never a 2-hour grind
      of retries.

## T2 — Overlap: second doc while the first is busy (the bug fixed today)

Start T1's run; while calls are visibly in flight, open a SECOND PDF in another tab/panel so its
opening audit fires.

- [ ] If the gate was busy, console shows `[GeminiGate] Opening-audit breaker reset SKIPPED — N
      call(s) in flight`. (If you don't catch the timing, no line appears — fine; the point is it
      must NEVER print a storm-clear while doc A is mid-storm.)
- [ ] Both documents finish; doc A's throttle state was not reset out from under it (its console
      storm messages continue coherently, no sudden burst of parallel failures).

## T3 — Problem scan (only if you have one that used to hang)

The karaoke-era "stuck forever on one page" scans are the target.

- [ ] Per-page render failures log `[Tesseract] page N render @2x failed … retrying at a lower scale`.
- [ ] After two consecutive dead pages: `[Tesseract] two consecutive pages could not render —
      skipping Tesseract rendering for the remaining N page(s); Vision OCR remains active`.
- [ ] The run still completes and the fidelity/coverage panel discloses the affected pages.

**If anything misbehaves:** copy the console (all `[GeminiGate]`, `[Retry]`, `API-start`,
`[Tesseract]` lines) — that IS the diagnostic; timestamps matter.
