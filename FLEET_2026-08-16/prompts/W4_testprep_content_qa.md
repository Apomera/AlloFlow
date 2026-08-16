You are **Lane W4** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md`, `FLEET_2026-08-16/WAVE2_PLAN.md`, and section
8 of `FLEET_2026-08-16/reports/L7_report.md` (the blocker you exist to clear). Lane ID **W4**.

## Your mission: clear the test-prep content QA debt and land the stranded hands-free fix

Wave 1's Lane 7 fixed a real defect in Test Prep Hub hands-free mode (the microphone stayed
permanently closed after any command that acted without speaking) — but the fix is stranded in
`test_prep_hub_source.jsx` because the builder,
`node dev-tools/build_test_prep_hub_release.cjs`, aborts on
`dev-tools/review_non_eppp_against_eppp.cjs`: **67 pre-existing content QA hard findings**,
unrelated to any source change. `--skip-pack-rebuild` does not help (the pack registration
digest check fails against the checked-in packs).

## Files you own

- `test_prep/**` and its `desktop/web-app/public/` mirror
- `test_prep_hub_module.js` (via the builder only)
- Read-only: `dev-tools/review_non_eppp_against_eppp.cjs`, `test_prep_hub_source.jsx` (L7's
  fix is in it — do not edit; your job is to let the build pick it up)

## Tasks

**1. Understand the reviewer before touching content.** Read
`review_non_eppp_against_eppp.cjs` end to end: what standard is it applying, what makes a
finding "hard", and is the reviewer itself correct? This repo has had gates that assert the
bug (a test once pinned wrong statutory hours as correct, and a χ² checker once called a fair
d20 biased). If some of the 67 findings are the reviewer being wrong, the fix is the reviewer,
argued in your report — not 67 content edits to satisfy a bad check.

**2. Triage the 67 findings.** Classify: (a) genuine content defects — wrong answers,
miskeyed options, factual errors; (b) style/format violations the reviewer enforces; (c)
reviewer false positives. For (a), fix with subject-matter care — these are assessment items
students practice on, so a wrong answer key does real harm; check each flagged item's answer
against the stem yourself rather than trusting either the item or the reviewer. Run the three
answer-position-bias tells on any bank you touch (`grep "answer: [0-9]" | uniq -c` style
distribution check — this repo has a documented answers-at-B epidemic). For (b), conform. For
(c), document and, if the fix is clearly safe, correct the reviewer.

**3. Content rules that bind you.** Test-prep banks are append-only where IDs are concerned
(never renumber existing ids). If any finding involves copyrighted source material, flag it
rather than paraphrasing it in. No contested science stated as fact.

**4. Rebuild.** Once the reviewer exits 0: `node dev-tools/build_test_prep_hub_release.cjs`.
Expect it to rewrite many files under `test_prep/` — that is its job, this time on purpose.
Verify: builder exits clean, `node --check test_prep_hub_module.js`, L7's
`tests/test_prep_hands_free_mic_recovery.test.js` still passes (7 tests), plus the five
existing test-prep hands-free suites, plus `npx vitest run` over the test_prep test files.
Confirm L7's markers (`ensureHandsFreeListening`) are present in the rebuilt module.

**5. Beware the concurrent diff.** L7 observed another session dirtying `test_prep/` mid-run
(a `"version": "0.7.0"` shape). Check `git status -- test_prep/` FIRST and record what is
already dirty before your build, so your report can honestly separate your changes from theirs.
If another session's uncommitted work is sitting there, coordinate through
`CROSS_LANE_REQUESTS.md` rather than clobbering it.

## Verification

Report the 67 findings' triage table in full (id → class → action). Builder + module checks
as above. `npm run verify:gate` status at end.

Write `FLEET_2026-08-16/reports/W4_report.md` incrementally.
