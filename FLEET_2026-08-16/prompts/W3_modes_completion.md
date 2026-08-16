You are **Lane W3** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md`, `FLEET_2026-08-16/WAVE2_PLAN.md`, and
`FLEET_2026-08-16/reports/L10_report.md` — you complete Lane 10's pending items plus two
cross-lane requests that landed in territory now free. Lane ID **W3**.

## Files you own

- `view_header_source.jsx` (builder `node _build_view_header_module.js`) — L2/L6 are done with it
- `allo_commands_source.jsx` (builder `node _build_allo_commands_module.js`) — L7 is done with it;
  note `dev-tools/check_cmd_i18n.cjs` requires re-extracting `cmd_keys_en.json` after any command
  change, and W1 owns the translations, so list any new `cmd.*` keys in your report for W1
- `adventure_handlers_source.jsx` (builder `node _build_adventure_handlers_module.js`)
- Family mode surfaces (locate; `AlloFlowANTI.txt` gates are under lock)
- `math_fluency_module.js` — plain JS, no source pair, edit directly

Under lock: `AlloFlowANTI.txt`, `ui_strings.js` (W1 is primary owner — hold briefly).

## Tasks

**1. The family-mode gate leak (do first; it is a real access bug).** L10 filed: the
Assessment Center button in `view_header_source.jsx` (~1385) sits inside a bare
`{isTeacherMode && (` gate, and family mode sets `isTeacherMode` true alongside `isParentMode`
(`AlloFlowANTI.txt:15828`) — so a **parent gets a header button into class-level RTI tiers,
roster import, and intervention summaries**. Fix per the sibling gates at 1360/1363/1372
(`!isIndependentMode && !isParentMode`). Then, because this repo's mode-audit history says
`isTeacherMode &&` leaks recur: sweep **all** bare `isTeacherMode &&` gates in files you own
plus (read-only) the other view sources, verify each against what family mode should see, fix
yours, file the rest. This is L10's N8 finding generalized — treat the sweep as the core of N8.

**2. N8 — family mode audit (L10's pending item).** Beyond the gate sweep: walk family mode
against recent features (translations control, Lesson Images rename, adventure switch, toast
log) and check what a parent sees is coherent and correctly scoped. Fix what is clearly wrong
in your files; report the rest.

**3. C5 — STEM Lab / math fluency (L10's pending item). Analysis plus the one safe fix.**
Deliver the analysis L10's prompt specified: current coupling between STEM Lab and the math
tool, what a separation would cost, and a recommendation — **no restructuring, no stem_lab/
edits** (check `git status --short -- stem_lab/` before even reading there; other sessions
work in it). The one concrete fix, per L10's own finding: **Math Fluency has zero command
palette entries** — its only door is a `<select>` inside a collapsed accordion. Add
`open_math_fluency` / `open_fluency_maze` commands with aliases ("fluency probe", "timed
math", "math minute", "CBM probe") in `allo_commands_source.jsx`. Respect L7's new
offer-first policy: these are `open_*` commands, so they will offer before acting — that is
correct, leave it. Verify reachability: the command must actually open the math tool in
fluency mode, not just exist in the registry (grep the registration AND trace the handler).

**4. Adventure translation contract (L4's handoff).** L4's resolver
(`resolveTranslationPolicy`) and `translationMode` are already in the deps object
`adventure_handlers_source.jsx` receives — the plumbing is done. Replace the five hardcoded
"English" gloss strings (L4's report, inventory row 23, lists lines 155-160, 648-653,
1048-1053, 1418-1423, 1592) with the resolved target. Design note from L4: Adventure's own
tri-state language mode has a "multilingual mix" no other surface has, so keep that control
authoritative where they conflict — the universal setting supplies the *gloss target*, not the
mode. Say in your report exactly how you reconciled the two.

**5. C4b follow-through (small).** L10 found the `window.History` icon trap (a DOM built-in
clobbered by the host) and fixed one file. Sweep the other extracted `view_*_source.jsx`
modules you own for `window.<IconName>` resolutions of names that collide with DOM globals
(`History`, `Image`, `Text`, `Range`, `Option`, `Audio`, `Event`, `Node`); apply L10's
`icon(name)` helper pattern where found. Latent, not live, but cheap while you are here.

## Verification

- Builders + `node --check` on everything touched; source-pair drift check if applicable.
- `npx vitest run` targeted suites; new tests for the gate fix (a family-mode render must NOT
  contain the Assessment Center button) and the palette commands.
- `npm run verify:gate` — W1 is unblocking `check_cmd_i18n` early in the wave; if your command
  additions re-stale the manifest, run `node dev-tools/i18n/extract_cmd_keys.cjs` yourself and
  tell W1 which keys need translation.

Write `FLEET_2026-08-16/reports/W3_report.md` incrementally. Lead with the gate leak, since it
is the one users can be harmed by today.
