You are **Lane W6** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md`, `FLEET_2026-08-16/WAVE2_PLAN.md`, and
`FLEET_2026-08-16/reports/L11_report.md` — you are Lane 11's follow-up sweep. Lane ID **W6**.

**Start only when W1, W2, W3, and W5 have final reports in `FLEET_2026-08-16/reports/`.**
You are deliberately last: your job is to make the manual describe the app as it is after
everything else lands.

## Files you own

Same as L11: `docs/teacher-guide/**`, `dev-tools/build_teacher_guide.cjs`, `guide/**` and
`AlloFlow Complete User Manual.md` via rebuild only. No hot files, no lock. Never hand-edit
outputs; edit chapters + manifest, run `node dev-tools/build_teacher_guide.cjs`, and keep the
double-build byte-stability L11 verified.

## Tasks

**1. Absorb Lane 9 — the gap L11 flagged.** L11 swept all reports while L9's was still a stub;
L9's final report is now complete and is the largest unabsorbed source of renames. Read it in
full. At minimum the manual must now reflect: "Create Resource" → **"Find a tool"** (with its
new dismissal behavior), toasts at **top-center** with the replayable **Messages** log behind
the header lightbulb, "Manage local storage" → **"Open saved work"** opening the real saved-work
manager, the guided-mode instruction-first banner and "Show me where to click", History
working during guided mode, and the Universal Settings scope note ("most", not "every").

**2. Absorb wave 2.** Read W1, W2, W3, W5 reports. Expected user-facing changes: W3's math
fluency palette commands and family-mode gate corrections, W5's printable cloze option in the
export preview (that one belongs in the manual's export/delivery chapter), and anything W2's
visual sweep changed. Also close the loop on L11's four unverifiable labels (help search,
guided tour, Ctrl+K palette, paste-text option): W1's localization sweep may have touched or
confirmed their real strings — check `ui_strings.js` for them now and replace L11's generic
descriptions with the real names where confirmable.

**3. Add the two chapters L11 deferred, if their surfaces have settled.** Adventure Mode (L10
landed the teacher on/off switch and lesson-scoped resume — both are teacher-facing and belong
in the manual) and Math Fluency (W3 lands its discoverability fix). If W3's C5 recommendation
proposes moving Math Fluency, document where it IS, not where a proposal wants it.

**4. `lastVerified` decision, prepared for Aaron.** L11 left `guide.json` `lastVerified` at
2026-08-13, reasoning that source-verification does not meet the bar the stamp implies. After
your sweep, write ONE paragraph in your report giving Aaron the exact one-word change and your
recommendation, given that W2 will have visually verified much of what L11 could not. Do not
bump it yourself unless W2's report confirms browser verification of the surfaces your
chapters describe step-by-step.

**5. Consolidated manual end-to-end read**, same as L11's M6: order, links, zero em/en dashes,
principal-skimmable opening. The manual is a distribution artifact (KMS pilot, Holly Clark
outreach), so this read matters commercially, not just editorially.

## Verification

`build_teacher_guide.cjs` clean + `--check` clean + double-build byte-stable;
`npx vitest run tests/teacher_guide_build.test.js`; link check on the consolidated manual;
search index picks up new chapters. Report → `FLEET_2026-08-16/reports/W6_report.md`.
