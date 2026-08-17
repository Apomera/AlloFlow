# Wave 3 — Hardening and reach

**Planned:** 2026-08-16 late · **Base:** waves 1-2 + finishers deployed at `@8fc440020`
**Theme:** the product is shipped and distributed; wave 3 makes the new surface durable
(e2e coverage of the journeys that matter), extends its reach (localization of what wave 1
built), and pays down the deferrals both prior waves recorded.

**RULES.md still governs everything**: lock protocol, no commits/deploys by lanes,
duplicate-lane startup check (a lane finding an existing `reports/X<N>_report.md` it did not
write must STOP), incremental reports, honest verification. Machine note: the guide/e2e
suites are heap-hungry under load — `NODE_OPTIONS=--max-old-space-size=6144` and
`--maxWorkers=1` are the house pattern now, and a "Worker exited unexpectedly" with zero
assertion failures is an OOM, not flake.

## Lanes

| Lane | Mission |
|---|---|
| X1 | E2E: the user journeys that shipped this week (deep links, keyless AI, guided/History, toasts, translations control, language deck) |
| X2 | E2E: documents and exports (crossword print, cloze worksheet, handout reader tools) |
| X3 | Localization: hand-translate the wave-1 UI namespaces into the packs (guided, tool_finder, hints, and friends) |
| X4 | i18n infrastructure: staleness gating by namespace, and the value-staleness check for cmd strings |
| X5 | Extraction: the ANTI long tail, led by the Class Mailbox / FERPA cluster |
| X6 | Surfaces: the deferred teacher-side AI gating sweep + top voice-command doors from the 327-surface menu |
| X7 | Roles: Educator Hub threading with L10's recorded defaults; family-mode polish leftovers |
| X8 | Test debt: quarantine triage, substring-pin repairs, the known slow-test fixes |

## Sequencing

- All start immediately except the ordering notes inside X3 (sweeps X5's new keys late) and
  X8 (leaves the two owner-tagged quarantine entries alone — their sessions fix those).
- Contention is low by design: X3 owns `lang/**`; X5 is the primary ANTI/ui_strings writer;
  X6 takes `view_sidebar_panels` and brief ANTI bursts; X1/X2/X8 are test-only.

## What this wave deliberately does not do

- No smoke tests of Aaron's manual list — that list needs human ears/eyes and stays his.
- No Educator evaluation chapter (waits for a real district setup) and no Page Designer work.
- No new features. Wave 3 exists to make what shipped stay true.

## Status — 2026-08-17, ~03:20 (run INLINE by the coordinator at Aaron's direction; no subagents)

| Lane | Status |
|---|---|
| X1 | DONE — 3 specs / 8 tests; CAUGHT TWO LIVE REGRESSIONS (banner + AI doorway both under the STEM overlay's inline z 10020); both fixed locally + double-pinned; 2 e2e tests stay red vs live until the next deploy BY DESIGN |
| X2 | Journeys 1-2 pinned (print-stays-light class rule; cloze worksheet rendered-level), 2× green; 3-4 recorded remainder (need an export fixture generator) |
| X3 | 1,827 hand-translated values landed (18 cmd keys + 11 ui keys × 63 packs); check_cmd_i18n green again; guided.* deferred with sizing (~21k values) |
| X4 | DONE — guarded staleness list +guided +hints (pinned); NEW cmd value-staleness checker + 13,066-value worklist; planted-defect tests 5/5 |
| X5 | FERPA cluster 121→0, encryption cluster 76→0 (190 keys, FERPA subset tagged reviewed-translation-only); ANTI ratchet 621→473 |
| X6 | DONE — 17 generate surfaces gated (not W7's five), Quick Start deferral pinned; 6 voice doors chain-verified; coverage ceiling 327→326 |
| X7 | DONE — role-scoped Educator Hub per recorded defaults; real-React mount test 8/8; dashboard wording + icon-trap sweep (clean) |
| X8 | Honest ledger: 2,491 files / 171 red (not the folklore 98); 6 red files repaired incl. all 3 filed known items; quarantine 14→12 |

Gates at HEAD: build_smoke ✓, source_pair_drift ✓, cmd_i18n ✓, lang_json ✓, gate-guarded ✓,
cmd-value-staleness ✓. Known reds owned by OTHER sessions (filed in CROSS_LANE_REQUESTS):
scan_shell_i18n --gate (educator_evaluation +10), staleness --ratchet (help_mode/stem English
moved, +124). NOTHING COMMITTED — Aaron batches; concurrent sessions have in-flight work
interleaved in the same tree.
