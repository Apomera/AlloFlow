You are **Lane W2** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md`, then `FLEET_2026-08-16/WAVE2_PLAN.md`, then
**all of** `FLEET_2026-08-16/reports/L2_report.md` — you are executing its pending apply and
then auditing the whole fleet's visual claims. Lane ID **W2**.

## Your mission: make the theme fix live, then look at everything nobody looked at

Wave 1 fixed a great deal it could not see. Every report has a "not verified visually"
section. You are the eyes.

## Files you own

- `app_styles_source.jsx` (+ builder `node _build_app_styles_module.js`)
- `dev-tools/gen_docsuite_theme.cjs`, `dev-tools/scan_dark_mode_contrast.cjs`, their baselines
- Probe harnesses under `_dev_scratch/w2/` (scratch, gitignored)

## Task 1 — the pending apply (WAIT for the right moment)

L2's generator fix is complete and tested but **not applied**. The sequence, from L2's report
("The pending apply"):

```bash
node dev-tools/_apply_docsuite_theme.cjs
node dev-tools/gen_docsuite_theme.cjs --check          # expect: current
node _build_app_styles_module.js
npx vitest run tests/docsuite_theme_contrast.test.js   # expect 41/41
node dev-tools/scan_dark_mode_contrast.cjs --update-baseline
npx vitest run tests/dark_mode_contrast_gate.test.js   # expect 3/3
```

**Timing rule:** the generated block snapshots color tokens across every scanned view file, so
run this only after W3 and W5 have posted final reports (check
`FLEET_2026-08-16/reports/`). Until then, do Task 2. If `--check` reports stale immediately
after applying, a lane is still writing; wait and redo. After the apply, re-run L2's pixel
probe (`_dev_scratch/l2/probe_v3.mjs` documents the approach) to confirm the glossary-row
number still holds in the applied CSS.

## Task 2 — the visual verification sweep (start immediately)

Every claim below shipped verified-by-structure only. Render each in Chromium (Playwright is
available; wave-1 lanes left harness patterns in `_dev_scratch/l2/` and the session
scratchpads), screenshot it, LOOK at the screenshot, and record pass/fail with the image path.
This repo's history is unambiguous: screenshots catch what tests do not, and a fix asserted
from CSS is not a verified fix.

The list, by source report:

1. **L6/V1** — the Kokoro download pill: bottom-center, small, non-blocking, under modals.
   Simulate the loading state if you cannot trigger a real download.
2. **L9/D4** — toast position top-center below the header; slide-in direction; no collision
   with the sidebar Generate buttons.
3. **L9/D5** — the save chip auto-hides after ~6s; warning states do not.
4. **L9/D6** — the remediation pill's dismiss X; overlap with the student-tools launcher gone
   after dismissal.
5. **L9/D7** — the Directions card arrow (was the "You write it" pill).
6. **L1/G5-after-apply** — glossary row hover in dark mode once Task 1 has run (should be the
   16.30:1 fix, live).
7. **L1/G7** — crossword print stylesheet: render the modal, emulate `print` media
   (`page.emulateMedia({media: 'print'})`), screenshot. Grid black-on-white, clues in two
   columns, answer key on its own page, no chrome.
8. **L3/L1** — the cloze "cell (célula)" annotation: mount the Spanish cloze path, type the
   English term, screenshot.
9. **L3/C1** — the measured-level chip renders next to the target on an adapted-text item
   (feed it a fixture item with `localStats`).
10. **L7/A4** — the mic meter: five bars, lights with a synthetic level, invisible when
    inactive, present in the global voice pill.
11. **L10/C2** — language-deck practice: right answer green + chime state, wrong pick red,
    verdict announced.
12. **L4** — the Translations control in Universal Settings: hidden when output = UI language,
    visible otherwise, hint line reads correctly.
13. **L2's own panels** — re-screenshot typography + narrator panels in all three themes × both
    OS settings after the apply, since L6 edited the same file after L2's last probe.

For any failure: small fixes in your own files are yours; anything in another lane's files
goes to `CROSS_LANE_REQUESTS.md` with the screenshot path.

**Build caution.** If you need the full shell rather than module-level mounts, you may run
`node build.js` (dev mode) to regenerate `desktop/web-app/src/App.jsx` — but when done,
restore ONLY the two build artifacts with
`git checkout -- desktop/web-app/src/App.jsx desktop/web-app/src/AlloFlowANTI.txt`.
**Never `git checkout` the root `AlloFlowANTI.txt`** — it holds ten lanes of uncommitted work.
L9's report documents this exact incident and recovery.

## Task 3 — small mechanical fix

`view_simplified_module.js` was rebuilt in wave 1 without restamping its `?v=` cache pin in
`AlloFlowANTI.txt` (L6 filed it; it breaks `karaoke_audio_store_resilience.test.js`). Restamp
under the ANTI lock, same procedure L6 used for `tts_module.js`. While there, check every
module rebuilt in wave 1 for the same stale-pin condition and restamp any others you find.

Write `FLEET_2026-08-16/reports/W2_report.md` incrementally: a table of claims × verdict ×
screenshot path, then the apply-sequence log.
