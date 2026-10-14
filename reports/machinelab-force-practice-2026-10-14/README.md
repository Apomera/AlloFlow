# Machine Lab: force calculations and practice shortcuts

The force–speed guide now shows both directions of the calculation: force × speed gives power, and matching power ÷ speed recovers effort or load force. The inverse panels reuse the existing calculation definitions, including ramp vertical-rise guidance and the warning against applying efficiency twice.

Each panel opens its matching practice skill and moves keyboard focus to the answer. Continuing the active skill preserves its answer, hints and feedback. Choosing another skill clears only that calculation draft, with visible guidance to save it first. Task assumptions, saved practice and other work stay in place.

The larger readings, patterned input/output sections and responsive layout from commit `7e307c872` are retained. Source and desktop mirror are identical. Scope verification restricts this change to the guide and its new navigation helper; existing mathematics, grading, records, exports and other handlers remain unchanged.

All 77 selected tests passed: 27 new cases for independent arithmetic, all six machines, skill selection, draft preservation and stale-event/focus guards, plus 50 existing calculation, accessibility and translation checks.

681 native browser checks passed across nine real React/THREE mounts and all six machine routes. Both inverse skills were entered by keyboard, solved with newton answers, and saved while retaining earlier power records and unrelated work. Same-skill entry preserved checked and viewed-solution drafts exactly, including answers, hints and feedback. Nondefault two-minute tasks at 37.5% efficiency, wrong-unit rejection, invalid-input gating, and all 54 visible keyboard-focus checks passed. The run recorded 30 independent inverse-calculation inspections.

The browser agent and root independently inspected four screenshots: the full desktop guide plus the new effort panel in dark, forced-color and doubled-text 320px layouts. Both inverse panels receive native numeric, semantic and layout checks in every scenario. No clipping or visual blockers were found, and source, mirror and harness hashes remained unchanged. Native and observed wrapper exits were zero, with no failed browser runs.

The first test attempt passed 22 cases before a test-fixture error in the invalid-geometry case: the mock React commit expected a question control even when the invalid model omits it. The fixture now synchronizes selection only when that control exists. The failed receipt and original test snapshot remain in `tests/run-01`; production source and assertions were unchanged. The successful final selection is `tests/run-02`.

Run `node reports/machinelab-force-practice-2026-10-14/verify-evidence.cjs` to verify the scope, successful and retained failed test evidence, exact fixture-only repair, browser receipts, dependencies and both screenshot reviews, and regenerate `validation-summary.json`.

This is a local change. No push or deployment is included. Native browser checks use software WebGL; forced colors are emulated, and enlarged text doubles computed guide font sizes rather than browser zoom. These checks are not a screen-reader evaluation.
