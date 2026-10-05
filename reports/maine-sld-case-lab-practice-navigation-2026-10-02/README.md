# Maine SLD Case Lab — case navigation refinement

Participants can now see a neutral summary of their recorded work for each of the five cases and move directly to that case's form reasoning or response review. The collapsed case library appears just below the Case record and Debrief headings, where participants can choose or revisit a case before reading the longer sections.

## Result

- Each case card counts selected findings, practice choices, form notes, reflection entries and process-check answers. Notes and reflections count only nonblank text; process-check choice index zero counts correctly. Singular and plural labels follow the count.
- Empty cases show “No participant entries recorded yet.” Revealing the reviewed guide changes a separate visibility line and does not create participant entries. Counts describe recorded entries; they do not rate correctness, eligibility, completion or readiness.
- “Open form reasoning” and “Review your responses” work for every case, including the current case. Accessible names include the case title. “Open case” still opens its case record and is disabled for the current case.
- Navigation closes the library, moves to the destination heading and clears earlier comparison/evidence return context. Returning to the current Debrief also restores its heading focus and scroll position. Each case retains its own responses and guide visibility.
- The library remains collapsed by default. Cards and actions wrap on narrow screens, and spacing separates the earlier library from the following content.

## Preservation

The five case records, 52 Alex assessment results, multilingual considerations, MUSER/IDEA guidance, practice questions, reviewed guides and core worksheet logic are preserved. The case data, core and module builder are byte-identical to the accepted comparison-pass baseline. Export/session version 1 and compatibility behavior are unchanged; library disclosure state is transient.

The print function and print CSS are byte-identical to the prior accepted version. This pass retains the existing nine-page participant PDF and its accepted visual QA rather than repeating an unrelated print run. No legal claims or assessment scores were added in this UI pass.

## Validation

**Five targeted Chromium scenarios passed** with one worker, zero automatic retries and the unchanged 120-second limit. Two new scenarios cover neutral live work summaries, whitespace and answer-only entries, index-zero process choices, guide-only and empty cases, per-case isolation, reset/reload/restore, direct destinations from both library placements, current-case controls, case-specific accessible names, heading focus and cleared return context. Three regressions cover comparison editing/return, selected-evidence exact return, and the actual source-app deep entry/access/Leadership Hub route.

**Four scoped axe scans found zero violations:** two expanded-library views at 320px dark and 1366px light, plus the retained comparison/evidence views. Screenshots and independent layout review are retained in [browser validation](browser-validation/README.md). The root also reviewed representative final phone and desktop captures. The original 25 browser scenarios remain preserved; this pass runs five of the 27 available scenarios.

The previous nine-page participant PDF retains its exact accepted bytes and all-page visual QA. The print function and print CSS are unchanged, so no print rerun was performed in this pass. Historical full-suite, core and legal-review evidence remains in the earlier reports.

Final source/module hashes, all four module copies, three host sources and exact preview snapshot match after the run. Focused syntax and whitespace checks passed. Exact commands, raw results, baseline/tested specs and retained print references are documented with the browser evidence.

The initial five-scenario invocation passed the four module scenarios and completed all functional host assertions, then timed out in `Page.close`; context teardown also timed out. Its raw result, trace, screenshots and diagnosis are retained. Read-only console comparison found the same inherited localization warnings as the earlier baseline, with no new activity or React render-loop errors. A separate host-only attempt then failed at its first navigation because the owned local preview process had ended; no functional assertions ran in that attempt. The preview was restored in pure serve mode from the same verified files, with no rebuild or source change. The unchanged host scenario subsequently passed in a fresh isolated run, including cleanup, with the same assertions, 120-second limit and zero automatic retries. Both failure archives are retained. The four already passed module scenarios were not repeated. The five successful results therefore span three invocations; the raw initial4/1, unavailable0/1 and final1/0 statistics remain explicit in [final verification](final-verification.json) and the browser report.

## Local preview and evidence

[Open the activity](http://127.0.0.1:65063/app/?tool=maine-sld-practice). The Leadership Hub route and direct tool URL use the same activity module.

Module SHA256: `189081606d02a6b7178c5c8046fdd5cefd62b98b9d5768fc6ea89f7b08b85f25` (172,509 bytes); loader pin `18908160`. All four copies match. Exact current host/source snapshot SHA256: `5aca767b8f1e6466afaf2a4ed366b06d465f6ee90cc76600c4017d3bbe8466ef`.

- [Frozen activity and preservation checks](frozen-activity.json)
- [Focused browser validation](browser-validation/README.md)
- [Independent source and layout review](source-and-layout-review.md)
- [Exact source-app integration](integration/README.md)
- [Final verification](final-verification.json)
- [Prior comparison and print evidence](../maine-sld-case-lab-comparison-2026-10-02/README.md)

The source and tests remain uncommitted as requested. No staging, commit, push, deployment or full application/installer build was performed. Earlier reports, helpers, previews and unrelated shared work were preserved. The held initial candidate and subsequent spacing/grammar adjustment are archived separately from the tested final candidate.
