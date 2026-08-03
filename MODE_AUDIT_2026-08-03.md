# Mode Audit: Parent / Independent / Student vs Teacher

**Date:** 2026-08-03
**Scope:** the four roles selectable in `RoleSelectionModal` (`ui_modals_module.js:1275`) and
what each actually gates across `AlloFlowANTI.txt` and `view_header_source.jsx`.
**Method:** every `isParentMode` (26), `isIndependentMode` (37) and `isStudentLinkMode` (6)
reference was enumerated and read; header gating audited separately; every mode-specific i18n
key resolved against `ui_strings.js`. Line refs are to the state of this commit.

## How the modes actually work

`executeRoleSelect` (`AlloFlowANTI.txt:15621`) sets the flags:

| Role | isTeacherMode | Extra flags | Extras |
|---|---|---|---|
| Teacher | **true** | — | — |
| Parent | **true** | isParentMode | 4 tools pre-expanded, adventure story mode ON, streaks OFF |
| Independent | **true** | isIndependentMode | student-entry hidden |
| Student | false | isStudentLinkMode | StudentEntryModal (name, then load/fresh) |

The structural fact that drives most findings: **parent and independent are teacher mode plus
a flag.** Every one of the ~255 `isTeacherMode` gates shows its surface in parent and
independent mode unless a second check excludes it. Independent mode got those exclusions in
six places. Parent mode got **zero**.

## What is healthy (verified, no action)

- All 21 mode-specific i18n keys resolve (`glossary.word_helper`, `lesson_plan.family_guide`,
  `alignment.skill_check`, mode toasts, etc.). No missing-key rendering.
- All four role cards are wired; the teacher password gate consistently covers
  teacher/parent/independent when `_cfg_validation_key` is set (`ui_modals_module.js:1285`).
- Independent-mode asymmetries that were done *right*: rubric generation becomes a
  first-person Self-Assessment Checklist (`AlloFlowANTI.txt:39174-39201`); flashcards default
  to quiz mode (`:37658`); TeacherHistoryTab is excluded (`:42978`); header hides role-toggle,
  class bridge, live-session start, and QTI/IMS exports.
- Parent mode has a genuinely distinct AlloBot chat persona ("Family Tutor", plain-English IEP
  explanations, `:35208`) and is excluded from streaks (`:14060`).
- The Ctrl/Cmd-K command palette computes the correct four-way audience
  (`commandAudience`, `:35481-35483`).

## Findings

### F1 — Parent mode leaks the entire professional teacher surface (high)

`view_header_source.jsx` contains 22 `isTeacherMode` gates, 6 `isIndependentMode`
exclusions, and **0 `isParentMode` references**. Since parents run with
`isTeacherMode: true`, a parent sees, live:

| Surface | Where | Independent excluded? |
|---|---|---|
| Educator Tools button — BehaviorLens, Report Writer, Symbol Studio | header `:826` | shown (behind pw gate) |
| **Start Class Session** | header `:872` | **hidden** |
| Send-to-class bridge | header `:857` | **hidden** |
| QTI / IMS LMS exports | header `:1189,1198` | **hidden** |
| Class Analytics panel | host `:46704` | shown |
| TeacherHistoryTab incl. roster groups | host `:42978` | **hidden** |
| Roster target-group selector on Full Pack | host `:42907` | shown |
| Live Session Center dock (if a session starts) | host `:45106` | n/a |

"Parent Mode Enabled: Simplified for Home Use" (the toast) is currently true only of the
create-sidebar labels and presets. A parent one click from "Start Class Session" and LMS QTI
export is not a simplified home surface. Where the teacher password gate is configured, the
Educator Tools are at least locked — but the session/bridge/roster surfaces are not behind it.

**Fix shape:** parent exclusions ⊇ independent exclusions. Add `!isParentMode` to the same six
header sites plus `:42978`/`:42907`/`:46704`. Judgment call for Aaron: whether parents keep
Class Analytics (arguably useful for a home-schooling parent) and Educator Tools behind the
gate, or lose both.

### F2 — The chat guide talks to independent learners as if they were teachers (medium)

`AlloFlowANTI.txt:35210`: `systemPrompt = isParentMode ? parentSystemPrompt :
teacherSystemPrompt`. There is no independent branch and no `independentSystemPrompt`
anywhere (0 grep hits). An independent learner gets its own welcome message
(`chat_guide.independent_welcome`, `:24297`) — and then a UDL-specialist coach that asks
*"What is the specific barrier your students are facing?"*.

**Fix shape:** add an `independentSystemPrompt` (study-coach voice: metacognition, self-testing,
plan-monitor-reflect) and make the branch three-way. The four-way `commandAudience` at
`:35481` is the existing pattern to mirror. The Phase 1 probing-question examples at
`:35222-35223` need the same third branch.

### F3 — Parent tool visibility is expansion, not visibility (medium)

`executeRoleSelect('parent')` pre-expands 4 tools (`:15635`) but the create sidebar still
*renders all ~20 teacher tools* — expansion state is not visibility. Combined with F1, parent
mode today is: relabeled Glossary/Simplified/Scaffolds/Alignment/Lesson-Plan, a different chat
persona, adventure default, no streaks — and everything else identical to teacher mode.

**Fix shape (decision needed):** either a curated parent tool list (hide DBQ, lesson-plan
internals, etc.) or explicitly bless "parents get everything, relabeled" and fix only F1's
professional/class surfaces. The second is defensible for home-schooling families; the first
matches the "Simplified for Home Use" promise.

### F4 — Role is not part of saved state (low, decision)

`hasSelectedRole` and the mode flags are session state; Canvas workspace snapshots do not
record the mode they were authored in (verified: no mode flag in
`buildCanvasWorkspaceSnapshot` / `restoreCanvasWorkspaceSnapshot`). With recovery-first
ordering, a parent who restores yesterday's workspace then picks "Teacher" on the role screen
gets the teacher UI over a parent-authored workspace. Probably fine — roles are lenses, not
data — but worth an explicit decision, e.g. stamping `authoredRole` into snapshots and
pre-highlighting that card on the role screen.

### F5 — `isStudentLinkMode` is nearly inert (info)

Six references total: audience string, recovery-skip, header pass-through. The real student
experience is carried by `!isTeacherMode` + `activeSessionCode` + the link-entry paths
(`:20315,31230,33195,33272,33324,33640` all set it). No bug found; noting that the flag's
name promises more than it does, and any future "student mode" work should key off the same
signals the link paths use, not this flag.

## Recommended order

1. **F1** header + host parent exclusions — small diff, closes the real exposure.
2. **F2** independent system prompt — one prompt + a three-way branch.
3. **F3** decision, then either curated list or explicit blessing (docs + toast copy).
4. **F4/F5** decisions only, no code until wanted.
