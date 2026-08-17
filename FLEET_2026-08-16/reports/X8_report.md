# X8 report — test debt with attribution (wave 3)

**Status: ledger produced; named items fixed; quarantine 14 → 12; remainder sized honestly.**
2026-08-17 · run inline by the coordinator.

## The full-suite ledger (first complete honest number)

`npx vitest run --maxWorkers=1`, NODE_OPTIONS 6144, 79 minutes:

> **2,491 test files: 171 red / 2,320 green · 28,358 tests: 385 failed / 27,968 passed / 5 skipped · 67 snapshot failures · 1 forks-pool timeout (assess_draft_numeric — infra, not assertion)**

The folklore number was "~98 red files" (2026-07-27). The truth is 171 — the debt GREW while
everyone quoted the old number. Log: `C:\tmp\x8_full_suite_20260817.log`; full red-file list:
`C:\tmp\x8_failfiles_all.txt`. Caveat recorded up front: wave-3 source edits overlapped this
run, so every red I acted on was re-verified in isolation first — three of the 171 were
about to be blamed on tonight and were actually wave-2 drift (below).

## Classification (by file count, honest granularity)

| Class | ~Files | Evidence / disposition |
|---|---|---|
| Drifted substring pins | ~60+ | The dominant class, as predicted. 6 repaired tonight (below); each repair re-anchored to CURRENT intent, verified against source first, never deleted. |
| Test-prep pack content pins | ~25 (`*_pack`, `eppp_*` waves, `*_5xxx`) | Pins over evolving authored content; plt_k6 went 1→5 failures since July. Content-owner passes needed, not mechanical re-anchors. |
| STEM render goldens | 6 files / 60+ digests | Digest drift from a week of STEM visual work. NEVER blanket-update (house rule): each digest needs a screenshot look first. Biggest single chunk of remaining debt. |
| Heavy-timeout | doc_pipeline_build_parity + likely peers | 5s default vs 28s real work; one fixed, pattern documented for the rest. |
| Flake-under-load | 3 (the FLAKY quarantine block) | Reasons verified still accurate. |
| Infra | 1 | forks-pool worker timeout on assess_draft_numeric. |

## Repairs landed (each verified green after fix)

1. `allo_commands_plan.test.js` — pinned `'✓ On this device'`; wave 2 extracted it to
   `t('storage.model_on_device')`. Re-anchored to the t() form (drift SINCE 08-16, would have
   been misattributed to tonight without the isolation re-run).
2. `class_mailbox.test.js` — same class: `share_collect.type_rating` extraction.
3. `educator_hub_modal_runtime_a11y.test.js` — literal card-count 17 vs 18 shipped; now
   DERIVES the count from the source's `data-hub-id` occurrences (pattern fix: behavior-anchored,
   cannot drift again), with the role-scope contract explicitly delegated to X7's suite.
4. `view_header_reflow_a11y.test.js` — 3 stale anchors (`justify-end` added, `sm:ml-auto`
   added, `self-end`→`justify-end`); behavior verified still shipping before each re-anchor. 6/6.
5. `header_nav_i18n.test.js` — the filed item: **17** `header.voice_*` keys called but never
   registered. The source is right (they should exist) → registered all 17 in ui_strings under
   lock, mirrored. **Listed for X3's next pass** (they render English in packs until translated). 11/11.
6. `doc_pipeline_build_parity.test.js` — the filed missing-timeout item; 120s explicit. Green in 15s.

## Quarantine triage (14 → 12)

- **Released** (passed twice consecutively in isolation, per the rule):
  `app_shell_runtime_a11y`, `chatgpt_phase2_reliability`. `check:quarantine` clean.
- **Kept, reason lines tightened to current truth**: `deep_dive_batch3_fixes` (1, deterministic,
  needs mechanism read), `individual_remediation_polish` (2, was 4), `plt_k6_5622_pack`
  (**5, was 1 — grew**; content moved under it).
- **Kept as-is**: the 4 stem-golden files (digest class above), 3 FLAKY entries (reasons verified),
  and the **2 owner-tagged entries untouched** (`nuclearlab_axe_a11y`, `mcp_batch_audit_e2e`) per the prompt.

## Remaining debt, sized honestly

165 red files after tonight. The two highest-leverage next bites: (1) a STEM-golden digest
session with screenshots (60+ digests, one sitting), (2) a test-prep content-owner pass over
the ~25 pack files. The long tail is mostly the same drifted-pin class — each is a 10-minute
fix with the verify-against-source discipline, but there are ~100 of them; a dedicated lane
with the educator_hub-style derive-don't-pin conversions where a file is touched anyway.
