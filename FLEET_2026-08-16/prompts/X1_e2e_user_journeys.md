You are **Lane X1** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md` and `WAVE3_PLAN.md` first; duplicate-lane check
applies. Lane ID **X1**. Test-only lane: you own new files under `tests/e2e/` and nothing else.

## Mission: e2e-pin the user journeys that shipped this week

This week's fleet shipped major user-facing behavior verified by unit harnesses and
screenshots but NOT by end-to-end tests. One of those gaps already bit: the deep-link visitor
banner shipped rendering *underneath* the STEM overlay, caught only by a screenshot taken for
documentation. Your suite makes that class of miss impossible to repeat silently.

Playwright is configured; `playwright.config.ts` defaults `baseURL` to the live Cloudflare
shell (read its 2026-08-16 note). Follow the naming convention of the existing numbered specs.
The live app boots slowly headless (~15-75s to deep-link apply); use generous, condition-based
waits, never bare sleeps.

## The journeys, in priority order

1. **Deep-link visitor.** Navigate to `/water-cycle` (via baseURL host). Assert: the tool
   opens (STEM header + Water Cycle content), the visitor banner "One tool from AlloFlow" is
   VISIBLE and CLICKABLE (elementFromPoint at its center returns it — this is the z-order
   regression test for tonight's z-10000 fix), its "Explore the full app" href is `/app/`, and
   the dismiss X removes it. Also assert one more slug (e.g. `/tree-lab`) resolves, and an
   unknown path shows the normal app with NO banner.
2. **Keyless AI honesty.** Fresh context (no localStorage). In the STEM header assert the
   "AI extras: off" pill is present; click it; assert AI Backend Settings opens with the
   Canvas card first ("Use AlloFlow inside Gemini Canvas") and its link on `share.gemini.google`.
   Then simulate a configured backend (seed `alloflow_ai_config` with a fake gemini key,
   dispatch `alloflow:ai-config-changed`) and assert the pill disappears without reload.
3. **Guided Mode → History.** Enter guided mode, click History; assert History content
   renders (the click is not swallowed) and the "Guided Mode is still running" strip with its
   back button appears; the back button returns to Create.
4. **Toasts and the Messages log.** Trigger a toast (any cheap action that fires one, or call
   the exposed addToast if a window bridge exists — prefer real UI). Assert top-center
   position (its box's centerX ≈ viewport centerX, top below the header), and that the header
   lightbulb's Messages list contains the toast text after it expires.
5. **Translations control visibility.** In Universal Settings assert the Translations control
   is absent with English output, appears after selecting a non-English output language, and
   its hint text contains no literal `{output}`/`{target}` placeholders.
6. **Language deck verdict coherence.** Harder to reach e2e (needs a generated glossary); if
   a fixture path exists (Load Project with a canned project file from `examples/` or
   `Lesson JSONs/`), drive practice mode and assert a correct pick renders the green verdict
   and headline together. If no fixture path is workable, say so plainly and pin what you can.

## Rules of evidence

- Each spec asserts USER-VISIBLE outcomes (visibility, hit-testing, text), not internal state.
- Flaky-proofing: every wait is for a condition; every spec passes 2 consecutive runs before
  you call it done; note single-run timings in the report.
- If a journey FAILS against the live deploy, that is a real regression report, not a test
  bug — verify against the deployed hash, document precisely, and file it in
  `CROSS_LANE_REQUESTS.md` rather than weakening the assertion.

Report → `FLEET_2026-08-16/reports/X1_report.md`, incrementally: spec list, what each pins,
runtimes, and anything real the suite caught while being written.
