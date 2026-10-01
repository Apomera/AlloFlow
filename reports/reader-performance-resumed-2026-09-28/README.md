# Reader text-parsing performance

The resumed investigation found repeated Markdown/HTML parsing in comparison-view labels and word counts. A current-source CPU profile spent substantial time in `DOMParser.parseFromString`. The earlier experimental candidate's broad state serialization did not address that cost.

The integrated change caches only pure plain-text results within each reader. Exact input strings identify results; resource, learner, source-text and parser changes reset the cache. It holds at most 2,048 entries and 262,144 UTF-16 units across keys and values. Inputs exceeding that budget are computed normally. Failed parsing is not cached. DOM nodes, callbacks, speech state and support-validation results are not cached. Explain-only text is prepared when Explain is active.

## Paired measurements

Microsoft Edge, synthetic local passages, 24 measured updates per variant per case, after warmup. Baseline and candidate updates alternate in ABBA/BAAB order in the same browser. Text equality and immediate cleanup are asserted. These measurements characterize this fixture and machine, not a device-independent timing guarantee.

| Case | Median update to paint, baseline → candidate | p95, baseline → candidate | Median React render, baseline → candidate |
| --- | ---: | ---: | ---: |
| Comparison, 200 supports | 32.1 → 13.6 ms | 38.0 → 18.7 ms | 29.1 → 10.7 ms |
| Bilingual comparison | 42.3 → 17.3 ms | 79.8 → 29.4 ms | 35.6 → 11.6 ms |
| Original supports / immersive control | 23.2 → 23.3 ms | 36.7 → 37.5 ms | 6.8 → 6.1 ms |

Each comparison case fell from 28,752 DOM-parser calls to zero across its 24 measured updates. A separate, earlier unpaired candidate run had highly variable timing and was not used as evidence of a speedup. Its raw results remain in the worktree.

## Validation

Seven new functional tests cover unchanged updates, in-place source and adaptation edits, learner/resource changes, parser replacement, support edits and current Explain callbacks. The initial focused run passed all 17 new/existing checks.

Five additional browser scenarios completed: 320-pixel large-text layout, 50 preview cycles, 200 unique resource/learner changes, native local audio, and reading-place scrolling. Every scenario had zero outstanding timers, animation frames, playing audio and highlight ranges immediately after unmount. These fixtures use disposable storage and synthetic speech/host callbacks except the local WAV playback.

**Final validation: 167 distinct tests passed across all 11 requested files.** The combined run hit a language-pack filesystem timeout and worker-start failures. The remaining suites passed unchanged in a single-thread rerun with a 120-second allowance; no assertions were removed or relaxed. Per-run reports and the deduplicated final result are in `integrated-tests.json`, `targeted-recheck.json`, `environment-recheck.json`, and `completion.json`.

`local-release-check.json` verifies canonical source compilation, identical root/public modules, matching loader pins in all three hosts, and stable inputs during verification. Reader module SHA-256: `86029309318d2656ddb5aeccf955da79101c901c854c5e3842e0e1a10201f3c2`.

## Scope and preservation

The reader source, its generated pair, and the canonical host's reader hash were updated locally; both host source mirrors were synchronized from the canonical host. Other shared edits were preserved. The shared reader and hosts already contained extensive uncommitted work, so this fix remains uncommitted with its narrow patch and evidence rather than bundling other owners’ work into a commit. No deployment or push was performed.

The earlier experiment's broad source/support cache, passage-observer cache, crawl memoization and duplicate-position persistence change were not imported. In particular, saved reading-place recency semantics remain unchanged. The earlier implementation and measurements remain under the existing `reader-performance` worktree; it has not been deleted or archived.

Reproduction scripts and all candidate/baseline sources are in `C:/Users/cabba/.codex/worktrees/reader-performance/UDL-Tool-Updated/reports/reader-performance-resumed-2026-09-28/` and `dev-tools/reader-performance-resumed/` in that worktree. `paired.cjs` in this report launches those fixtures and writes `paired-results.json`.

The separate authorized Claude cleanup removed 4,479 rollback files last modified on or before 2026-09-22 03:26:57 UTC: 912,226,804 bytes of files, with no failures. Newer rollback files were retained. See `../local-storage-cleanup-2026-09-28/result.json` for the receipt.
