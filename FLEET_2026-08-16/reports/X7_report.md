# X7 report — role-aware Educator Hub (wave 3)

**Status: COMPLETE** · 2026-08-17 · run inline by the coordinator (Aaron: "tackle wave 3 yourself")

## The card decision table

| Card (data-hub-id) | Parent / Independent | Why |
|---|---|---|
| leadership-hub | **HIDDEN** | Contains the Principal Evaluation portal (school-role-gated one level down); walkthroughs/dispro are school-leader instruments |
| professional-development | **HIDDEN** | District PD modules + completion records; no home meaning |
| report-writer | **HIDDEN** | Clinical report drafting |
| dynamic-assessment | kept (arguable) | **Reversible default, recorded per prompt** — a home-schooling parent can run test-teach-retest probes; one line in the filter if Aaron disagrees |
| polls-signups | kept (arguable) | Same — family sign-ups/polls are a real home use; one line to flip |
| lesson, lumen, document, whiteboard, throughline, page-designer, video-studio, symbol-studio, allosheet, behavior-lens, pdf-accessibility, accessibility-lab, community-catalog | kept | F1's spirit (MODE_AUDIT_2026-08-03.md): genuinely useful at home |

Note: behavior-lens stays visible on the same F1 reasoning (ABC observation is a
real family-mode activity and ~half the tool is human/school ABA), but it was not
named in the recorded defaults either way — flag if you want it in the hidden set.

## What changed

- `view_educator_hub_modal_source.jsx`: accepts `isParentMode = false, isIndependentMode = false`
  (older hosts unchanged — the dead-gate class is documented at the destructure);
  `hideSchoolProfessional` wraps exactly the three cards. Module rebuilt + mirrored.
- `AlloFlowANTI.txt` (under lock, one burst): the `<EducatorHubModal>` mount now passes both flags.
- **Leftover 1 (dashboard wording):** `view_header_source.jsx` computes `dashboardNavLabel`
  (`dashboard.title_parent` → "Family Dashboard" when `isParentMode`) and all 6 header sites
  use it. Wording only — `handleSetActiveViewToDashboard` untouched (W3: switching a parent to
  the student dashboard is an unverified behavior change). `dashboard.title_parent` added to
  `ui_strings.js` (under lock, JSON-validated, mirrored) — **listed for X3**.
- **Leftover 2 (icon trap):** swept `view_educator_hub_modal_source.jsx` for the
  `window.<DOMGlobal>` icon class (History/Image/Text/...): **zero hits** — the hub renders
  emoji, not lucide globals. No change needed; recorded so nobody re-sweeps.

## Verification

- `tests/educator_hub_role_scope.test.js` — **8/8 green.** Behavioral: REAL React-18 mount of
  the BUILT module (admin_suite_mount_smoke pattern), asserting (a) no-props renders every
  card exactly as before, (b) parent mode removes ONLY the recorded three (set-difference
  asserted, so nobody can quietly widen or narrow it), (c) independent mode matches. Grep
  pins: source defaults, ANTI prop pass, mirror byte-equality, dashboard wording + key.
- Builders ran clean; `node --check` on both modules; ANTI `@babel/parser` full-file parse OK.
- **Not browser-verified:** the visual hub in a live family-mode session (needs the next
  deploy; the mount test renders the real built module, which is the strongest pre-deploy
  evidence this repo has).

## For X3

- `dashboard.title_parent` = "Family Dashboard" (new key, needs 63-pack translation).
