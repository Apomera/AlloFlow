You are **Lane 2** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L2**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: kill the dark-mode contrast bug class, not just its instances

Aaron found several places where dark mode leaves text unreadable. His words: most of the UI
is fine, but some elements do not adhere to dark mode, so white text lands on a background
that stayed white. He named the typography settings panel and the narrator voice dropdown, and
said "a lot of those dropdown menus seem to be impacted, although some are fine."

That last sentence is the whole assignment. Fixing two panels is worth little; finding the
rule that separates the broken ones from the fine ones is worth a great deal. **Your primary
deliverable is a scanner and a gate, with the named panels fixed as proof it works.**

## Files you own

- `app_styles_source.jsx` (builder: `node _build_app_styles_module.js`)
- `view_misc_panels_source.jsx` (builder: `node _build_view_misc_panels_module.js`)
- A new scanner you will write, `dev-tools/scan_dark_mode_contrast.cjs`
- Any test file you add for the gate

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`,
`view_sidebar_panels_source.jsx` (Lanes 4 and 9 also need that last one, so hold it briefly).

You do **not** own `games_source.jsx` — Lane 1 has the glossary and crossword dark-mode
fixes. File anything you find there into `CROSS_LANE_REQUESTS.md` for L1.

## Scope

**D1 — Typography settings panel invisible in dark mode.** Aaron: "if I click on the
typography settings in dark mode, you can't see any of the text, probably because the text is
white and the background is still white because it just doesn't adhere to dark mode." Find it,
confirm the mechanism, fix it.

**D2 — Narrator voice dropdown, and dropdowns generally.** Same failure. Native `<select>`
and custom listbox popovers are the usual suspects: a portal-rendered menu escapes the themed
ancestor, or a hardcoded `background: white` sits under a themed text color. Note that this
codebase has a documented failure mode where hardcoded dark plus a theme variable renders
invisible in *light* mode too, so check both directions rather than only fixing dark.

**D3 — Find the bug class.** Build `dev-tools/scan_dark_mode_contrast.cjs`. Design it around
what actually causes these bugs, which from prior incidents in this repo means at least:

- A literal color (`#fff`, `white`, `rgb(255,255,255)`, `#000`) on the same element or rule as
  a theme variable, in either direction. This is the specific pattern that produced both this
  bug and the KitchenLab light-mode invisibility.
- A background set without a paired foreground, or a foreground without a paired background,
  where the missing half is inherited across a theme boundary.
- Portaled or `position: fixed` surfaces that render outside the element carrying the theme
  attribute or class.
- Anything defining a color *only* inside a dark-mode media query or `[data-theme]` block,
  with no base definition to fall back to.

Baseline the existing violations so the scanner is adoptable rather than a wall of noise, fix
the ones that matter, and wire it into a test so it cannot regress. Check how the other
`dev-tools/scan_*.cjs` scanners in this repo are structured and follow that pattern; several
are already wired into vitest, and there is a known problem in this codebase with gates that
exist but have no runner. **Wire yours to a runner.** Confirm it actually executes.

Aaron also flagged, in Lane 1's territory, that a glossary row turns white on hover in dark
mode. That is your scanner's canonical test case even though Lane 1 makes the fix: a hover
rule written for the light theme with a hardcoded light background. Make sure your scanner
catches hover, focus, and active states, not just base rules.

## Method notes

- Match the contrast **ratio** across themes rather than mirroring luminance deltas. A fix
  that looks balanced by eye often is not.
- Probe real pixels. Do not trust a thumbnail, and do not claim a visual fix you have not
  rendered and looked at. Playwright is available (`npx playwright test`), and the repo has
  existing visual harnesses you can borrow from.
- Static scanning has limits: it cannot see a color computed at runtime or injected by a
  third-party control. Say plainly in your report what the scanner cannot see.
- A clean scan on a stubbed or no-op surface is a false pass. This repo has been bitten by
  exactly that. Guard the premise: if zero findings equals success, prove the scanner can
  detect a violation you deliberately introduce.

## Notes

- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Write `FLEET_2026-08-16/reports/L2_report.md` as you go, per RULES section 6. Include the
  full list of violations found, including ones you chose not to fix and why.
