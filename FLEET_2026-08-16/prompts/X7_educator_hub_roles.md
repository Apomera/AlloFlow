You are **Lane X7** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, and the filed history of this item:
L10's Educator Hub entry in `CROSS_LANE_REQUESTS.md` and W3's re-filing in its report §2 —
this was deferred twice as "needs role threading plus a per-card product decision." Aaron has
now authorized proceeding with the recorded defaults. Lane ID **X7**. You own
`view_educator_hub_modal_source.jsx` and `view_header_source.jsx`; ANTI under lock for the
prop pass.

## Mission: role-aware Educator Hub, per the recorded analysis

Current state (verified twice): the hub opens on bare `isTeacherMode` from two header sites,
and `view_educator_hub_modal_source.jsx` receives **no role props at all**, so family mode
(which sets `isTeacherMode` true) sees all ~18 cards including school-professional surfaces.

**The defaults you implement (L10's analysis, W3's concurrence, Aaron's go-ahead):**

- Thread `isParentMode` and `isIndependentMode` into the hub (default `false`, so an older
  host behaves exactly as today — the dead-gate-whose-prop-nobody-supplies class is
  documented in this repo; pin the prop pass with a test like W3's).
- **Hide from parent/independent:** Leadership Hub (contains the Principal Evaluation portal,
  already school-role-gated one level down), Professional Development, Report Writer.
- **Keep for everyone:** the rest — Document Hub, Whiteboard, Page Designer, Lumen,
  Accessibility Lab and peers are genuinely useful to a home-schooling parent (that judgment
  is F1's spirit; see `MODE_AUDIT_2026-08-03.md`).
- **The two arguables** (Dynamic Assessment, Polls & Sign-ups): keep visible, and record in
  your report that this is the reversible default chosen; each is one entry in the card
  filter if Aaron disagrees.

Also take the two adjacent leftovers filed in the same requests:

1. `dashboard.title` reads "Teacher Grading Dashboard" to a parent (the header deliberately
   lets all modes reach it). Add `dashboard.title_parent` ("Family Dashboard" or similar,
   your judgment, listed for X3) and render it when `isParentMode`. Wording only — do not
   change which dashboard renders (W3: switching a parent to the student dashboard is an
   unverified behavior change; leave it).
2. Sweep `view_educator_hub_modal_source.jsx` for the `window.<DOMGlobal>` icon trap
   (`History`, `Image`, `Text`, ...) and apply the `icon()` helper pattern where a collision
   exists (L10/W3's C4b work; their reports name the pattern and the 23-name checklist).

## Verification

Builders + `node --check` + mirrors; a new `tests/educator_hub_role_scope.test.js` in the
`family_mode_assessment_center_scope` style: behavioral card-filter run (render or lift, not
grep-only), the host prop pass pinned, older-host default pinned, and the hidden-card list
asserted so nobody "fixes" the asymmetry back. Note honestly what is not browser-verified.

Report → `FLEET_2026-08-16/reports/X7_report.md`, leading with the card decision table.
