# Completed-agent merge audit

Audit started at local HEAD `1a5067ab673408d8bf33fc6998ab843696043859`. Git inspection used `--no-optional-locks`; no Git writes, builds, tests, servers or application state changes were performed by this audit. Later preparation wrote only candidate patches, manifests, browser tools and documentation beneath this release report. Applicable ancestor/repository AGENTS.md inspection found no additional nonempty instructions. `AGENT_HANDOFF.md` supplied current ownership/history.

## Current worktree disposition

| Worktree / retained branch | Evidence and disposition |
| --- | --- |
| Main, `main` | Current shared work contains many finished uncommitted source/test/tool/report families. Main integrator owns their review, staging, regeneration and release. Local HEAD is not deployed-byte evidence. |
| `offline-media-recovery-sparse`, `codex/offline-media-recovery` at `8bc25aebf` | Clean. Five non-ancestor commits, but the first three through `8b26a875a` were already source-integrated in the historical pass-two receipt. Only requested TTS identity/provenance (`e47c7335d`) and resilient Storybook picture recovery (`8bc25aebf`) were missing. Prepared narrow source/test/tool patch in `offline-media-integration/`; no whole branch merge or old generated output import. |
| `prepared-word-help-sparse`, `codex/prepared-help-context` at `b0dced1a5` | Clean. Ten non-ancestor commits already source-integrated, including short-viewport height and fresh-card activation. `reports/prepared-help-deep-2026-09-27/completion.json` records current reader source `c9625901...`, module `8f2dd725...`, released ownership and implementation checkpoint `d6d055b0c`. Retained `codex/prepared-word-help` commits are earlier integrated increments. |
| `preserved-vocabulary-sparse`, detached `fd4044c86` | Dirty isolated snapshot is not a merge target. Current canonical generation/pipeline helper sources exactly match this worktree (`ae818e2e...` and `6fbc0701...`); shared `c4c8d6f8b`/`d0334c99d` integration and handoff cover latest changes. Preserve snapshot/evidence; do not import its older reader/hosts. |
| `reader-performance`, detached `fd4044c86` | Earlier preference-write/lifecycle changes were source-integrated in pass two. A newer `reports/reader-performance-current` candidate remains missing and strictly applies in memory, but its owner explicitly leaves latency acceptance open. See below; exclude from an automatic finished-work merge. |
| `reader-preview-isolation`, detached `fd4044c86` | Earlier preview snapshot/refresh work was integrated in pass two. Three later completed increments were missing at this audit: focus narration isolation, one-line preview scroll containment, and Tree Lab field-guide redesign. All source/test patches strictly apply in memory with zero fuzz. Exact paths below. |
| `alloflow-bilingual-revisions-fd4044c8`, detached `fd4044c86` | Initial transaction implementation is already source-integrated: all 228 substantive added test lines and all but one superseded engine spread line are present; current engine retains pane/range/transaction guards. Do not import old engine/module. |
| `alloflow-reader-drafts-04`, detached `fd4044c86` | Earlier partial-save work was integrated, but final current-support/Save-Pin-Remove confirmation/owner-return increment was missing. Three source/test hunks strictly applied in memory. Prepared `draft-mutation-integration/source-tests.patch` and current-source disposable browser tools; exclude isolated generated modules and old pins. |

## Missing completed increments and integration order

1. Reading-envelope autosave serializer patch from `reports/connected-delivery-track13/hydration-host-integration.patch`, coordinated by main integrator. Preserve latest Firestore/LiveAac retry/image/source-pair work and derive affected pins from combined outputs.
2. Offline artifact request identity and Storybook recovery from `offline-media-integration/source-test-tool.patch`. Preserve newer Track02 service inspection/profile behavior and shared exporter localization. Report-only packaging correction is documented in its README; production test correction belongs to the main integrator.
3. `C:/Users/cabba/.codex/worktrees/reader-preview-isolation/UDL-Tool-Updated/reports/reader-preview-focus/host-focus.patch` plus `validation-focus.patch`: host focus narration request lifecycle. Depends on current preview events and request-scoped Kokoro AbortSignal support; no new translation keys.
4. Same worktree, `reports/reader-preview-scroll/reader-scroll.patch`: `overscrollBehavior: 'contain'` on student preview modal. Independent of draft editor changes.
5. `draft-mutation-integration/source-tests.patch`: source/test-only final Track04 changes. Preserve current helper/compiler contracts and rebuild reader once after other reader integrations.
6. Same preview worktree, `reports/tree-lab-experience/tree-lab-experience.patch` plus `validation.patch`: canonical Tree Lab and six-case regression suite. Synchronize public mirror, integrate 16 English entries from `new-translation-keys.json`, and check packaging/host fullscreen/scroll. Older camera/anatomy browser selectors must first open the new disclosure.
7. Regenerate combined affected outputs and refresh exact content pins; commit reviewed source/test/tool/assets/reports, then run normal deployment gates and actual-byte verification. Never infer deployment identity from local HEAD.

These classifications are based on source presence/applicability and owner evidence. This audit did not reproduce owner runtime results. Source/test tools and exact preimages are linked in each integration README.

## Performance candidate remains a review item

Path: `C:/Users/cabba/.codex/worktrees/reader-performance/UDL-Tool-Updated/reports/reader-performance-current/`.

`reader-performance.patch` changes `view_simplified_source.jsx`, `immersive_reader_source.jsx`, and `reader_place_store.js`: three-slot support/source caches, mutation-observed passage revision, crawl memoization, timeout/session cleanup, and duplicate position suppression after durable reconciliation. `focused-tests.patch` changes/adds five suites: `reader_render_cost`, `reader_word_help_lifecycle`, `adapted_word_help_ui`, `immersive_reader_review_runtime`, and `reader_place_write_cost`. Fixture changes must preserve newer shared retention probes.

Owner evidence reports 166 passing focused tests and reduced repeated validation/selection/passage reads. However comparison p95 increased from 40.1 to 43.2 ms and repeated comparison from 79.7 to 197.8 ms; render totals also rose. Baseline varied substantially. The owner explicitly states that latency acceptance remains open and makes no general speedup claim. Identical-position saves also stop refreshing durable recency, a behavior requiring persistence-owner review. Do not silently promote this to a completed release improvement. It requires integrated correctness checks and stabilized comparative profiling before acceptance; historical snapshots and measurements remain preserved.

## Older branch refs

Read-only ancestry inspection found several older isolated-index branches whose commits are not ancestors even though their source was integrated in collective releases. The roster, inbox autosave, gradebook display cache, seating derivation, UI-cache and recovery-fingerprint changes are present in current source/tools. The lesson-plan follow-up/refinement/spoken-script branches are likewise represented and subsequently refined; current functions/catalog additions are retained, with newer plan-input comparison/field editing behavior replacing old lines. The August promo branch's audit tool and behaviors are present; dated counts and old startup line were superseded by later site changes. Do not merge these historical refs over current files merely to make ancestry look merged.

Other listed refs already have no commits outside main. `pr3-head` is a retained July PR ref with historical desktop/remediation changes and no new completed-agent handoff in this release; it is not a current integration branch. Branch topology alone does not establish a missing implementation. No branches/worktrees were deleted, moved or archived.
