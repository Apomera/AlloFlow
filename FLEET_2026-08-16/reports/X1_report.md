# X1 report — e2e pins for the week's user journeys (wave 3)

**Status: 3 spec files, 8 tests. The suite caught TWO REAL LIVE REGRESSIONS on its first run**
2026-08-17 · run inline by the coordinator.

## The catches (the reason this lane exists, proven on day one)

Both stem from ONE root cause nobody had ever read: **the STEM Lab overlay's class says
`z-[9999]` but its INLINE style is `zIndex: 10020`** (stem_lab_module.js, since 2026-07-01).

1. **The deep-link visitor banner was still invisible on the live shell.** The 08-16 fix
   (z-40 → 10000) read the class, not the computed value — 10000 < 10020, still buried. The
   spec's `elementFromPoint` hit-test failed against live; a probe confirmed the covering
   element chain. **Fixed: banner → z 10030** (above the lab, below the 10050 dialog layer),
   with the corrected z-map in the comment.
2. **The keyless visitor's doorway opened UNDERNEATH the lab.** Clicking the "AI extras: off"
   pill opened AI Backend Settings at z-300 — rendered, focusable, pointer-events intercepted
   by the overlay: to the visitor, nothing happened. **Fixed: AIBackendModal raises itself to
   10490 while `showStemLab`** (the AlloBot chat containers' existing pattern) and the ANTI
   mount passes `showStemLab`.

Both fixes are LOCAL, parse-checked, module rebuilt + mirrored, and pinned twice: unit
(`ai_capability_gating.test.js` — the z relationship asserted FROM SOURCE, reading the lab's
real inline value, so renumbering can't silently break it again) and e2e (below). Filed in
CROSS_LANE_REQUESTS as deploy-blocking for the deep-link journey.

## The specs

| Spec | Pins | Status vs live |
|---|---|---|
| `42-deep-link-visitor.spec.ts` (3 tests) | /water-cycle opens + banner VISIBLE AND HIT-TESTABLE + href /app/ + dismiss; /tree-lab resolves; unknown ?tool= → no banner | banner test **RED against live BY DESIGN until the next deploy** (it is the regression detector working); other 2 green |
| `43-keyless-ai-honesty.spec.ts` (2 tests) | keyless pill → doorway with Canvas card leading (verified via a window.open stub — the link lives in a closure, not the DOM); fake-config + `alloflow:ai-config-changed` removes the pill WITHOUT reload | doorway test red-until-deploy (same catch); the no-reload reactivity test is GREEN against live |
| `44-shell-journeys.spec.ts` (3 tests) | toast top-centre geometry + expiry into the Messages log (via the collapsed-header Expand toggle); Translations control absent for English-out → appears after adding Spanish → hint placeholders interpolated; Guided → History shows the still-running strip → "Back to my step" returns | **3/3 green twice consecutively** (runs 5 & 6, ~40s each) |

Journey 6 (language deck verdict coherence): not workable e2e without a generated glossary
fixture path; said plainly per the prompt, unit coverage stands.

## Selector lessons recorded for the next spec author

The header boots COLLAPSED since 08-16 — `hints_recall` and friends exist only after clicking
the expand toggle, whose aria-label is `"Expand"` on the deployed build and `"Expand header"`
in current source (spec accepts both). Prefer `data-help-key` hooks over strings everywhere.
