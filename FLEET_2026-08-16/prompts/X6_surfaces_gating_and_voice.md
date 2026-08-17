You are **Lane X6** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, `reports/W7_report.md` (you are
completing its recorded deferral), and L7's offer-first design in `reports/L7_report.md`.
Lane ID **X6**. You own `view_sidebar_panels_source.jsx` (lock) and `allo_commands_source.jsx`;
`AlloFlowANTI.txt` and `ui_strings.js` under lock for brief bursts.

## Task 1: the deferred teacher-surface AI gating sweep (W7's remainder)

The infrastructure exists and is tested: `resolveAiCapability()`, reactive `aiCapability`
host state, the `alloflow:ai-config-changed` event, and the doorway pattern (open AI Backend
Settings, where the Canvas card leads). What was deferred is the teacher-surface sweep:
on a keyless shell, the five sidebar `primaryAction` generate buttons (and Full Pack / Quick
Start's generate step) still render enabled and fail with error toasts on click.

Implement disable-with-doorway per Aaron's decision:

- Thread `aiTextAvailable` (+ the doorway callback) into the sidebar prop bag at the ANTI
  mount, one burst.
- One shared affordance in `view_sidebar_panels_source.jsx` — a small "Needs AI setup" notice
  component used at all five `primaryAction` sites (grep `SIDEBAR_PANEL_UI.primaryAction` for
  the current locations), buttons `disabled` when text capability is off, the notice opening
  the settings doorway. Strings through `ui_strings.js` under lock (list keys for X3).
- Extend `tests/ai_capability_gating.test.js` with one assertion per gated surface (the L4
  coverage-test shape W7's report names).
- Cover Quick Start and Full Pack's generate actions if they route through reachable seams;
  if any surface would require deep refactoring, record it as W7's report did rather than
  half-gating it.

## Task 2: voice doors for the new surfaces (from the 327-surface menu)

`node dev-tools/audit_command_coverage.cjs` maintains the uncovered-surface list its own
header calls "a menu, not a debt register." Pick from the menu deliberately: the six surfaces
that joined the baseline on 2026-08-16 (`ai_backend_guided_card_canvas`,
`brainstorm_discussion_*`, `brainstorm_jigsaw_*`, `brainstorm_mode_picker`,
`doc_builder_block_suggestions`, `header_jump_lesson_collapsed`) plus up to ~4 more
high-traffic picks you justify. For each: add palette/voice commands in
`allo_commands_source.jsx` with natural aliases, respecting L7's offer-first policy
(screen-changing = offer; W3's math-fluency commands at `:783` are the pattern, including
`CMD_GROUP` registration — the step W3 learned the hard way). Reachability-test each command
the way `tests/math_fluency_palette_reachability.test.js` does: walk the wiring, not just the
registration. Re-extract the cmd manifest (`node dev-tools/i18n/extract_cmd_keys.cjs`), and
list the new `cmd.*` keys for X3's translation pass — that keeps `check_cmd_i18n` green
rather than re-blocking the gate for everyone.

Then regenerate the voice-coverage baseline (`--write-baseline`) and update the reviewed
ceiling in `tests/voice_surface_coverage_budget.test.js` DOWNWARD to match your coverage
gains, with the list in a comment (the count went 321→327 this week; make it fall).

Report → `FLEET_2026-08-16/reports/X6_report.md`, incrementally, leading with the gated
surfaces table.
