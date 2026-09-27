# Assembled changed-test validation

The initial frozen assembled release ran **151 canonical Vitest suites: 3,074 passed, four failed, zero skipped/pending out of 3,078 tests**. After root repaired the four issues below, the focused recheck passed **389/389 tests across eight suites**, with no failure or skip. The original aggregate failure evidence remains intact; the complete 151-suite selection was not rerun after those repairs. Do not sum the overlapping test counts. No tests, quarantine entries, production files or Git state were edited by this validation agent.

`selection.json` and `selected-tests.txt` record the exact selection: changed/new canonical `tests/**/*.test.js` from `git diff HEAD` and `git ls-files --others --exclude-standard`, plus cited reader/draft/offline/preview/Tree Lab and six immersive dependency suites. Report/candidate copies were never selected. Existing quarantine and the custom non-Vitest `translation_pipeline.test.js` were the only allowed exclusions; no selected file matched either exclusion.

The run used installed dependencies and `--maxWorkers=1`. The 135-suite normal group used default Vitest timeout (individual suites retain their own existing timeout declarations). The 16-suite preview/Tree group used the already documented `--testTimeout=30000` convention from its integration packet. No timeout was changed in response to failure. No retry occurred during this aggregate run.

| Group | Suites | Passed | Failed | Duration |
| --- | ---: | ---: | ---: | ---: |
| Normal | 135 | 2,911 | 4 | 298.29 s |
| Existing preview/Tree 30-second convention | 16 | 163 | 0 | 28.62 s |
| Total | 151 | 3,074 | 4 | 326.91 s |

JSON/stdout are preserved in `normal.json`, `normal.stdout.log`, `preview-tree-30s.json`, and `preview-tree-30s.stdout.log`. `failure-list.json` retains every failed assertion and full stack/message. No new or updated snapshots were reported by either group.

## Input integrity

Local HEAD remained `1a5067ab673408d8bf33fc6998ab843696043859`. All **265 monitored runtime/test/config inputs retained identical hashes**, with zero drift between `inputs-before.json` and `inputs-after.json`. Root was explicitly notified that the freeze ended after the final receipt. Subsequent intentional line-ending normalization or repairs require scoped rechecks and should not rewrite this original evidence.

## All four failures

1. `tests/dissection_lab_improvements.test.js:31`, stable bridge identity: canonical `stem_lab/stem_lab_module.js` and nested desktop public mirror match hash `109c99f3...`, while flat `desktop/web-app/public/stem_lab_module.js` remains the older HEAD hash `615824e9...`. This is a real assembled mirror integration gap. The canonical stable identity code is present. Synchronize the maintained flat mirror using the current canonical source, then rerun the suite and mirror gate.

2. `tests/dissection_lab_improvements.test.js:1269`, tray/anatomy materials: the test pins an old comment and subsequently the old dark-frame CSS. The current documented visual refinement keeps edge ticks inside `if (detailedCanvasHud)` and uses a lighter frame; it does not remove that detailed-tray rendering. `reports/dissection-visual-presentation-2026-09-27/README.md` explicitly describes quieter Essentials and retained Advanced/fullscreen detail. An isolated extraction of the actual retained block, run against both source/public copies, produced zero tick strokes/labels with detailed mode off and 56 strokes plus labels 1–5 with it on. `dissection-classification.json` records this separate diagnostic, not additional aggregate test counts. Replace the obsolete comment pin with a behavior assertion for that detail gate, retain the other anatomy/material checks, and align the obsolete frame assertion with the documented visual contract. Do not restore decorative clutter merely to satisfy stale text.

3. `tests/galaxy_review_fixes.test.js:757`, canonical English catalog escaped text.
4. Same assertion, desktop public English catalog. Both catalogs contain **80 identical pre-existing overescaped values** at HEAD and in the frozen run, with zero added/removed offending key/value pairs. `catalog-escape-classification.json` records exact comparison/examples. This is exposed baseline catalog debt, not corruption introduced by new reader/Tree copy. The assertion genuinely reports rendered escape text; repair the values and mirror them rather than suppressing or quarantining the assertions.

The two failures in each file are preserved independently. No timeout or unhandled-runner failure accounts for these four assertions. Browser acceptance, deployment gates, generated app builds and served-byte verification remain separate work owned by the main integrator.

## Repair recheck

Root repaired the 80 overescaped Unicode values in both English catalogs, synchronized the flat public STEM bridge, replaced the stale Dissection comment pin with actual detailed-mode tick drawing assertions and updated its lighter-frame contract. Root also normalized selected text files according to repository attributes and refreshed the Firestore content pin. Those intentional changes happened after the original frozen run and before this separate recheck.

`repair-selection.json`, `repair-recheck.json`, `repair-recheck.stdout.log`, and `repair-receipt.json` record the recheck. Its exact eight suites were Galaxy review, Dissection improvements, Dissection workspace bands, Circuit snapshots, Firestore sync, connected-delivery offline envelopes, reader follow-up locales, and reader release verification. The run used `--maxWorkers=1 --testTimeout=30000`; Dissection retained its existing longer suite declaration.

All **389 tests passed**, zero failed or skipped. HEAD remained `1a5067ab673408d8bf33fc6998ab843696043859`; all **267 monitored inputs** remained identical during the recheck (`repair-inputs-before.json` / `repair-inputs-after.json`, zero drift). The validation freeze was explicitly released afterward so browser acceptance could begin. This resolves the original four assertions on the repaired assembled inputs without hiding or replacing their earlier failure records.
